"""
Data Cleaning Service for Self-Learning System
Handles deduplication, validation, outlier detection, standardization, and quality scoring
"""
import base64
import hashlib
import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import numpy as np
from PIL import Image
import io

from models.issue import Issue
from models.training_data import TrainingData
from models.feedback import Feedback


class DataCleaningService:
    def __init__(self, db: Session):
        self.db = db
        self.issue_type_mapping = self._load_issue_type_mapping()
        self.severity_mapping = self._load_severity_mapping()
    
    def _load_issue_type_mapping(self) -> Dict[str, str]:
        """Load issue type standardization mapping"""
        return {
            # English to Chinese
            "crack": "結構裂縫",
            "cracks": "結構裂縫",
            "leak": "漏水",
            "leaks": "漏水",
            "mold": "黴菌",
            "mould": "黴菌",
            "moisture": "濕度問題",
            "water_damage": "水損",
            "electrical": "電氣問題",
            "plumbing": "管道問題",
            "roof": "屋頂問題",
            "structural": "結構問題",
            # Variations
            "結構問題": "結構問題",
            "結構裂縫": "結構裂縫",
            "漏水問題": "漏水",
            "濕度異常": "濕度問題",
        }
    
    def _load_severity_mapping(self) -> Dict[str, str]:
        """Load severity standardization mapping"""
        return {
            "1": "low",
            "2": "medium",
            "3": "high",
            "輕微": "low",
            "中等": "medium",
            "嚴重": "high",
            "輕": "low",
            "中": "medium",
            "重": "high",
            "minor": "low",
            "major": "high",
        }
    
    def clean_issues(
        self,
        issue_ids: Optional[List[int]] = None,
        batch_size: int = 100,
        force_reclean: bool = False
    ) -> Dict[str, Any]:
        """
        Main cleaning function - processes issues through all cleaning steps
        """
        try:
            # Get issues to clean
            if issue_ids:
                issues = self.db.query(Issue).filter(Issue.id.in_(issue_ids)).all()
            else:
                # Get issues that haven't been cleaned or need re-cleaning
                query = self.db.query(Issue)
                if not force_reclean:
                    # Exclude already cleaned issues
                    cleaned_issue_ids = self.db.query(TrainingData.issue_id).filter(
                        TrainingData.cleaned_status == "cleaned"
                    ).subquery()
                    query = query.filter(~Issue.id.in_(cleaned_issue_ids))
                
                issues = query.limit(batch_size).all()
            
            if not issues:
                return {
                    "status": "completed",
                    "message": "No issues to clean",
                    "processed": 0,
                    "cleaned": 0,
                    "failed": 0
                }
            
            results = {
                "status": "processing",
                "processed": 0,
                "cleaned": 0,
                "failed": 0,
                "duplicates_found": 0,
                "outliers_found": 0,
                "errors": []
            }
            
            for issue in issues:
                try:
                    # Step 1: Deduplication check
                    is_duplicate = self._check_duplicate(issue)
                    if is_duplicate:
                        results["duplicates_found"] += 1
                        # Mark as duplicate but still process
                    
                    # Step 2: Data validation
                    validation_result = self._validate_issue(issue)
                    if not validation_result["valid"]:
                        self._create_training_data(issue, "failed", 0.0, {}, {}, validation_result["errors"])
                        results["failed"] += 1
                        results["errors"].append({
                            "issue_id": issue.id,
                            "error": "Validation failed",
                            "details": validation_result["errors"]
                        })
                        continue
                    
                    # Step 3: Outlier detection
                    is_outlier = self._detect_outliers(issue)
                    if is_outlier:
                        results["outliers_found"] += 1
                    
                    # Step 4: Standardization
                    standardized_data = self._standardize_issue(issue)
                    
                    # Step 5: Quality scoring
                    quality_score = self._calculate_quality_score(issue, standardized_data)
                    
                    # Step 6: Generate labels
                    labels = self._generate_labels(issue)
                    
                    # Create training data record
                    self._create_training_data(
                        issue,
                        "cleaned",
                        quality_score,
                        standardized_data,
                        labels,
                        None
                    )
                    
                    results["cleaned"] += 1
                    results["processed"] += 1
                    
                except Exception as e:
                    results["failed"] += 1
                    results["errors"].append({
                        "issue_id": issue.id,
                        "error": str(e)
                    })
                    continue
            
            results["status"] = "completed"
            return results
            
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e),
                "processed": 0,
                "cleaned": 0,
                "failed": 0
            }
    
    def _check_duplicate(self, issue: Issue) -> bool:
        """
        Check if issue is a duplicate based on:
        - Image hash (if available)
        - Issue type + location + time window (within 1 hour)
        """
        # Check by image hash
        if issue.image_data:
            try:
                image_hash = self._calculate_image_hash(issue.image_data)
                # Check for similar images (same hash)
                similar_issues = self.db.query(Issue).filter(
                    and_(
                        Issue.id != issue.id,
                        Issue.image_data.isnot(None)
                    )
                ).all()
                
                for similar_issue in similar_issues:
                    if similar_issue.image_data:
                        similar_hash = self._calculate_image_hash(similar_issue.image_data)
                        if image_hash == similar_hash:
                            return True
            except Exception:
                pass  # If image processing fails, continue with other checks
        
        # Check by type + location + time window
        if issue.issue_type and issue.location:
            time_window_start = issue.detected_at - timedelta(hours=1)
            time_window_end = issue.detected_at + timedelta(hours=1)
            
            duplicate = self.db.query(Issue).filter(
                and_(
                    Issue.id != issue.id,
                    Issue.issue_type == issue.issue_type,
                    Issue.location == issue.location,
                    Issue.detected_at >= time_window_start,
                    Issue.detected_at <= time_window_end
                )
            ).first()
            
            if duplicate:
                return True
        
        return False
    
    def _calculate_image_hash(self, image_data: str) -> Optional[str]:
        """Calculate perceptual hash of image"""
        try:
            # Remove data URL prefix if present
            if image_data.startswith("data:image"):
                image_data = image_data.split(",")[1]
            
            # Decode base64
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
            # Resize to 8x8 for hash calculation
            image = image.resize((8, 8), Image.Resampling.LANCZOS)
            image = image.convert("L")  # Convert to grayscale
            
            # Calculate average
            pixels = list(image.getdata())
            avg = sum(pixels) / len(pixels)
            
            # Generate hash
            hash_bits = "".join("1" if pixel > avg else "0" for pixel in pixels)
            return hash_bits
            
        except Exception:
            return None
    
    def _validate_issue(self, issue: Issue) -> Dict[str, Any]:
        """Validate issue data"""
        errors = []
        
        # Check required fields
        if not issue.issue_type:
            errors.append("Missing issue_type")
        if not issue.severity:
            errors.append("Missing severity")
        if not issue.description:
            errors.append("Missing description")
        
        # Validate severity format
        if issue.severity and issue.severity not in ["low", "medium", "high"]:
            # Try to map it
            mapped = self.severity_mapping.get(issue.severity.lower())
            if not mapped:
                errors.append(f"Invalid severity: {issue.severity}")
        
        # Validate image data if present
        if issue.image_data:
            try:
                if issue.image_data.startswith("data:image"):
                    image_data = issue.image_data.split(",")[1]
                else:
                    image_data = issue.image_data
                
                # Try to decode
                base64.b64decode(image_data)
                
                # Check size (max 10MB)
                if len(image_data) > 10 * 1024 * 1024:
                    errors.append("Image too large (>10MB)")
            except Exception as e:
                errors.append(f"Invalid image data: {str(e)}")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    def _detect_outliers(self, issue: Issue) -> bool:
        """Detect outliers using statistical methods"""
        # For now, use simple heuristics
        # In future, can use Z-score or IQR methods
        
        # Check if severity is inconsistent with description
        severity_keywords = {
            "high": ["嚴重", "緊急", "立即", "urgent", "critical", "dangerous"],
            "medium": ["中等", "注意", "moderate", "attention"],
            "low": ["輕微", "minor", "small", "輕"]
        }
        
        description_lower = issue.description.lower() if issue.description else ""
        severity_keywords_for_level = severity_keywords.get(issue.severity, [])
        
        # If description doesn't match severity keywords, might be outlier
        if severity_keywords_for_level:
            if not any(keyword in description_lower for keyword in severity_keywords_for_level):
                # Not necessarily an outlier, but flag for review
                pass
        
        # Check learning score outliers
        if issue.learning_score is not None:
            # Get all learning scores
            all_scores = [
                float(score[0]) for score in self.db.query(Issue.learning_score).filter(
                    Issue.learning_score.isnot(None)
                ).all() if score[0] is not None
            ]
            
            if len(all_scores) > 10:
                mean_score = np.mean(all_scores)
                std_score = np.std(all_scores)
                
                if std_score > 0:
                    z_score = abs((issue.learning_score - mean_score) / std_score)
                    if z_score > 3:  # More than 3 standard deviations
                        return True
        
        return False
    
    def _standardize_issue(self, issue: Issue) -> Dict[str, Any]:
        """Standardize issue data"""
        standardized = {
            "issue_type": self._standardize_issue_type(issue.issue_type),
            "severity": self._standardize_severity(issue.severity),
            "description": self._standardize_text(issue.description),
            "recommendation": self._standardize_text(issue.recommendation) if issue.recommendation else None,
            "location": self._standardize_location(issue.location) if issue.location else None,
            "component": self._standardize_text(issue.component) if issue.component else None,
        }
        
        return standardized
    
    def _standardize_issue_type(self, issue_type: str) -> str:
        """Standardize issue type"""
        if not issue_type:
            return "未知問題"
        
        # Check mapping
        mapped = self.issue_type_mapping.get(issue_type.lower())
        if mapped:
            return mapped
        
        # Return original if no mapping found
        return issue_type
    
    def _standardize_severity(self, severity: str) -> str:
        """Standardize severity"""
        if not severity:
            return "medium"
        
        # Check mapping
        mapped = self.severity_mapping.get(severity.lower())
        if mapped:
            return mapped
        
        # If already in correct format
        if severity.lower() in ["low", "medium", "high"]:
            return severity.lower()
        
        return "medium"  # Default
    
    def _standardize_text(self, text: str) -> str:
        """Standardize text (remove extra spaces, normalize)"""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        return text
    
    def _standardize_location(self, location: str) -> str:
        """Standardize location name"""
        if not location:
            return ""
        
        # Remove extra spaces
        location = re.sub(r'\s+', ' ', location.strip())
        # Capitalize first letter of each word (optional)
        return location
    
    def _calculate_quality_score(self, issue: Issue, standardized_data: Dict[str, Any]) -> float:
        """
        Calculate quality score (0-1)
        quality_score = completeness * 0.3 + consistency * 0.3 + feedback_quality * 0.3 + recency * 0.1
        """
        # Completeness score (30%)
        completeness = 0.0
        if issue.issue_type:
            completeness += 0.15
        if issue.description:
            completeness += 0.1
        if issue.recommendation:
            completeness += 0.05
        
        # Consistency score (30%)
        consistency = 0.0
        if issue.severity in ["low", "medium", "high"]:
            consistency += 0.1
        if issue.location and issue.component:
            consistency += 0.1
        if issue.image_data:
            consistency += 0.1
        
        # Feedback quality (30%)
        feedback_quality = 0.0
        if issue.user_validated:
            feedback_quality += 0.15
        if issue.expert_reviewed:
            feedback_quality += 0.15
        
        # Recency score (10%)
        recency = 0.0
        if issue.detected_at:
            days_old = (datetime.utcnow() - issue.detected_at).days
            if days_old < 7:
                recency = 0.1
            elif days_old < 30:
                recency = 0.05
            elif days_old < 90:
                recency = 0.02
        
        quality_score = (
            completeness * 0.3 +
            consistency * 0.3 +
            feedback_quality * 0.3 +
            recency * 0.1
        )
        
        return min(quality_score, 1.0)
    
    def _generate_labels(self, issue: Issue) -> Dict[str, Any]:
        """Generate labels for training"""
        labels = {
            "issue_type": issue.issue_type or "未知問題",
            "severity": issue.actual_severity or issue.severity or "medium",
            "recommendation_category": self._categorize_recommendation(issue.recommendation)
        }
        
        return labels
    
    def _categorize_recommendation(self, recommendation: Optional[str]) -> str:
        """Categorize recommendation"""
        if not recommendation:
            return "general"
        
        rec_lower = recommendation.lower()
        
        if any(word in rec_lower for word in ["立即", "緊急", "urgent", "immediate"]):
            return "urgent"
        elif any(word in rec_lower for word in ["建議", "建議", "recommend", "suggest"]):
            return "recommended"
        elif any(word in rec_lower for word in ["檢查", "檢查", "inspect", "check"]):
            return "inspection"
        else:
            return "general"
    
    def _create_training_data(
        self,
        issue: Issue,
        status: str,
        quality_score: float,
        standardized_data: Dict[str, Any],
        labels: Dict[str, Any],
        errors: Optional[List[str]]
    ):
        """Create or update training data record"""
        # Check if training data already exists
        existing = self.db.query(TrainingData).filter(
            TrainingData.issue_id == issue.id
        ).first()
        
        if existing:
            # Update existing
            existing.cleaned_status = status
            existing.quality_score = quality_score
            existing.standardized_data = standardized_data
            existing.labels = labels
            existing.cleaned_at = datetime.utcnow()
        else:
            # Create new
            training_data = TrainingData(
                issue_id=issue.id,
                cleaned_status=status,
                quality_score=quality_score,
                standardized_data=standardized_data,
                labels=labels,
                cleaned_at=datetime.utcnow()
            )
            self.db.add(training_data)
        
        self.db.commit()

