"""
Service for managing detected issues
"""
import base64
import os
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime

from models.issue import Issue
from typing import Literal

IssueSeverity = Literal["low", "medium", "high"]
from schemas.issue import IssueCreate, IssueUpdate

# Create images directory for storing photos
IMAGES_DIR = Path("data/images")
IMAGES_DIR.mkdir(parents=True, exist_ok=True)


class IssueService:
    def __init__(self, db: Session):
        self.db = db

    def create_issue(self, issue_data: IssueCreate) -> Issue:
        """Create a new issue record and save image to filesystem"""
        image_path = None
        
        # Save image to filesystem if provided
        if issue_data.image_data:
            try:
                # Generate unique filename
                timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                issue_type_safe = "".join(c for c in issue_data.issue_type if c.isalnum() or c in (' ', '-', '_')).strip()[:50]
                filename = f"issue_{timestamp}_{issue_type_safe.replace(' ', '_')}.jpg"
                image_path = IMAGES_DIR / filename
                
                # Decode base64 and save to file
                image_bytes = base64.b64decode(issue_data.image_data)
                with open(image_path, 'wb') as f:
                    f.write(image_bytes)
                
                # Store relative path in metadata instead of full base64
                if issue_data.metadata_json is None:
                    issue_data.metadata_json = {}
                issue_data.metadata_json['image_path'] = str(image_path)
                issue_data.metadata_json['image_saved'] = True
                
                print(f"✅ Image saved to: {image_path}")
            except Exception as e:
                print(f"⚠️ Failed to save image to filesystem: {e}")
                # Continue with base64 storage as fallback
        
        issue = Issue(
            issue_type=issue_data.issue_type,
            severity=issue_data.severity,
            description=issue_data.description,
            recommendation=issue_data.recommendation,
            location=issue_data.location,
            component=issue_data.component,
            image_data=issue_data.image_data,  # Keep base64 for backward compatibility
            metadata_json=issue_data.metadata_json,
            detected_at=datetime.utcnow()
        )
        self.db.add(issue)
        self.db.commit()
        self.db.refresh(issue)
        
        # Calculate learning score for this issue
        issue.learning_score = self._calculate_learning_score(issue)
        self.db.commit()
        self.db.refresh(issue)
        
        # Auto-trigger learning data collection (create training data record)
        # This will be cleaned and processed later by cleaning service
        try:
            from models.training_data import TrainingData
            
            # Check if training data already exists
            existing = self.db.query(TrainingData).filter(
                TrainingData.issue_id == issue.id
            ).first()
            
            if not existing:
                # Create pending training data record
                training_data = TrainingData(
                    issue_id=issue.id,
                    cleaned_status="pending",
                    quality_score=None,
                    standardized_data={},  # Will be filled by cleaning service
                    labels={},  # Will be filled by cleaning service
                    used_for_training=False
                )
                self.db.add(training_data)
                self.db.commit()
        except Exception as e:
            print(f"⚠️  Could not create training data record: {e}")
            # Don't fail issue creation if training data creation fails
        
        return issue

    def get_issue(self, issue_id: int) -> Optional[Issue]:
        """Get issue by ID"""
        return self.db.query(Issue).filter(Issue.id == issue_id).first()

    def get_all_issues(
        self,
        limit: int = 100,
        resolved: Optional[str] = None,
        severity: Optional[IssueSeverity] = None,
        location: Optional[str] = None
    ) -> List[Issue]:
        """Get all issues with optional filters"""
        query = self.db.query(Issue)

        if resolved is not None:
            query = query.filter(Issue.resolved == resolved)

        if severity is not None:
            query = query.filter(Issue.severity == severity)

        if location is not None:
            query = query.filter(Issue.location == location)

        return query.order_by(desc(Issue.detected_at)).limit(limit).all()

    def update_issue(self, issue_id: int, update_data: IssueUpdate) -> Optional[Issue]:
        """Update an issue"""
        issue = self.get_issue(issue_id)
        if not issue:
            return None

        if update_data.resolved is not None:
            issue.resolved = update_data.resolved
            if update_data.resolved == "true":
                issue.resolved_at = datetime.utcnow()
            else:
                issue.resolved_at = None

        if update_data.recommendation is not None:
            issue.recommendation = update_data.recommendation

        # Update learning-related fields
        if update_data.user_validation_result is not None:
            issue.user_validated = True
            issue.user_validation_result = update_data.user_validation_result
        
        if update_data.expert_feedback is not None:
            issue.expert_reviewed = True
            issue.expert_feedback = update_data.expert_feedback
        
        if update_data.actual_severity is not None:
            issue.actual_severity = update_data.actual_severity
        
        if update_data.resolution_status is not None:
            issue.resolution_status = update_data.resolution_status
        
        if update_data.resolution_notes is not None:
            issue.resolution_notes = update_data.resolution_notes

        # Recalculate learning score after updates
        issue.learning_score = self._calculate_learning_score(issue)

        self.db.commit()
        self.db.refresh(issue)
        return issue

    def delete_issue(self, issue_id: int) -> bool:
        """Delete an issue"""
        issue = self.get_issue(issue_id)
        if not issue:
            return False

        self.db.delete(issue)
        self.db.commit()
        return True

    def get_issues_by_component(self, component: str, limit: int = 50) -> List[Issue]:
        """Get issues for a specific component"""
        return (
            self.db.query(Issue)
            .filter(Issue.component == component)
            .order_by(desc(Issue.detected_at))
            .limit(limit)
            .all()
        )

    def _calculate_learning_score(self, issue: Issue) -> float:
        """
        Calculate learning value score for an issue (0-1)
        Higher score = more valuable for training
        """
        score = 0.0
        
        # Base score: has image (0.2)
        if issue.image_data:
            score += 0.2
        
        # Base score: has location and component (0.1)
        if issue.location and issue.component:
            score += 0.1
        
        # Base score: has recommendation (0.1)
        if issue.recommendation:
            score += 0.1
        
        # High severity issues are more valuable (0.2)
        if issue.severity == "high":
            score += 0.2
        elif issue.severity == "medium":
            score += 0.1
        
        # Has metadata (0.1)
        if issue.metadata_json:
            score += 0.1
        
        # Recent issues are more valuable (0.1)
        days_old = (datetime.utcnow() - issue.detected_at).days
        if days_old < 7:
            score += 0.1
        elif days_old < 30:
            score += 0.05
        
        # Cap at 1.0
        return min(score, 1.0)

    def update_learning_score(self, issue_id: int) -> Optional[Issue]:
        """Recalculate and update learning score for an issue"""
        issue = self.get_issue(issue_id)
        if not issue:
            return None
        
        issue.learning_score = self._calculate_learning_score(issue)
        self.db.commit()
        self.db.refresh(issue)
        return issue

