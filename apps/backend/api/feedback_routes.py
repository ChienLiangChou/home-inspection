"""
API routes for managing feedback (user validation, expert review, resolution tracking)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime

from database.connection import get_db
from models.issue import Issue
from models.feedback import Feedback
from schemas.feedback import (
    FeedbackCreate,
    FeedbackOut,
    UserValidationRequest,
    ExpertReviewRequest,
    ResolutionTrackingRequest
)

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.post("/validate", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
async def validate_issue(
    request: UserValidationRequest,
    db: Session = Depends(get_db)
):
    """
    User validation of detected issue
    """
    try:
        # Get the issue
        issue = db.query(Issue).filter(Issue.id == request.issue_id).first()
        if not issue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Issue {request.issue_id} not found"
            )

        # Prepare original result
        original_result = {
            "issue_type": issue.issue_type,
            "severity": issue.severity,
            "description": issue.description,
            "recommendation": issue.recommendation
        }

        # Calculate differences if corrections provided
        differences = None
        actual_result = None
        if request.corrections:
            actual_result = {
                "issue_type": request.corrections.get("issue_type", issue.issue_type),
                "severity": request.corrections.get("severity", issue.severity),
                "description": request.corrections.get("description", issue.description),
                "recommendation": request.corrections.get("recommendation", issue.recommendation)
            }
            differences = {
                "issue_type_changed": actual_result["issue_type"] != original_result["issue_type"],
                "severity_changed": actual_result["severity"] != original_result["severity"],
                "description_changed": actual_result["description"] != original_result["description"],
                "recommendation_changed": actual_result["recommendation"] != original_result["recommendation"]
            }

        # Create feedback record
        feedback = Feedback(
            issue_id=request.issue_id,
            feedback_type="user_validation",
            original_result=original_result,
            actual_result=actual_result,
            differences=differences,
            feedback_data={
                "validation_result": request.validation_result,
                "notes": request.notes
            },
            source="user"
        )
        db.add(feedback)

        # Update issue
        issue.user_validated = True
        issue.user_validation_result = request.validation_result
        if actual_result and "severity" in actual_result:
            issue.actual_severity = actual_result["severity"]

        db.commit()
        db.refresh(feedback)

        return feedback

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating validation feedback: {str(e)}"
        )


@router.post("/expert-review", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
async def expert_review(
    request: ExpertReviewRequest,
    db: Session = Depends(get_db)
):
    """
    Expert review of detected issue
    """
    try:
        # Get the issue
        issue = db.query(Issue).filter(Issue.id == request.issue_id).first()
        if not issue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Issue {request.issue_id} not found"
            )

        # Prepare original and actual results
        original_result = {
            "issue_type": issue.issue_type,
            "severity": issue.severity,
            "description": issue.description,
            "recommendation": issue.recommendation
        }

        actual_result = {
            "issue_type": request.corrected_issue_type or issue.issue_type,
            "severity": request.corrected_severity or issue.severity,
            "description": issue.description,  # Usually not changed by expert
            "recommendation": request.corrected_recommendation or issue.recommendation
        }

        differences = {
            "issue_type_changed": actual_result["issue_type"] != original_result["issue_type"],
            "severity_changed": actual_result["severity"] != original_result["severity"],
            "recommendation_changed": actual_result["recommendation"] != original_result["recommendation"]
        }

        # Create feedback record
        feedback = Feedback(
            issue_id=request.issue_id,
            feedback_type="expert_review",
            original_result=original_result,
            actual_result=actual_result,
            differences=differences,
            feedback_data={
                "expert_id": request.expert_id,
                "expert_notes": request.expert_notes
            },
            source=request.expert_id or "expert"
        )
        db.add(feedback)

        # Update issue
        issue.expert_reviewed = True
        issue.expert_feedback = {
            "corrected_issue_type": request.corrected_issue_type,
            "corrected_severity": request.corrected_severity,
            "corrected_recommendation": request.corrected_recommendation,
            "expert_notes": request.expert_notes
        }
        if request.corrected_severity:
            issue.actual_severity = request.corrected_severity

        db.commit()
        db.refresh(feedback)

        return feedback

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating expert review: {str(e)}"
        )


@router.post("/resolution", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
async def track_resolution(
    request: ResolutionTrackingRequest,
    db: Session = Depends(get_db)
):
    """
    Track issue resolution status
    """
    try:
        # Get the issue
        issue = db.query(Issue).filter(Issue.id == request.issue_id).first()
        if not issue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Issue {request.issue_id} not found"
            )

        # Prepare original result
        original_result = {
            "issue_type": issue.issue_type,
            "severity": issue.severity,
            "description": issue.description,
            "recommendation": issue.recommendation,
            "resolved": issue.resolved
        }

        actual_result = {
            "resolution_status": request.resolution_status,
            "actual_severity": request.actual_severity or issue.severity,
            "resolved": request.resolution_status in ["resolved", "partially_resolved"]
        }

        # Create feedback record
        feedback = Feedback(
            issue_id=request.issue_id,
            feedback_type="resolution_tracking",
            original_result=original_result,
            actual_result=actual_result,
            differences={
                "resolution_status": request.resolution_status,
                "severity_verified": request.actual_severity is not None
            },
            feedback_data={
                "resolution_notes": request.resolution_notes
            },
            source="system"
        )
        db.add(feedback)

        # Update issue
        issue.resolution_status = request.resolution_status
        issue.resolution_notes = request.resolution_notes
        if request.actual_severity:
            issue.actual_severity = request.actual_severity
        if request.resolution_status == "resolved":
            issue.resolved = "true"
            issue.resolved_at = datetime.utcnow()
        elif request.resolution_status == "false_positive":
            # Mark as resolved but note it was false positive
            issue.resolved = "true"
            issue.resolved_at = datetime.utcnow()

        db.commit()
        db.refresh(feedback)

        return feedback

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error tracking resolution: {str(e)}"
        )


@router.get("", response_model=List[FeedbackOut])
async def get_feedbacks(
    issue_id: Optional[int] = None,
    feedback_type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get feedbacks with optional filters
    """
    try:
        query = db.query(Feedback)

        if issue_id:
            query = query.filter(Feedback.issue_id == issue_id)

        if feedback_type:
            query = query.filter(Feedback.feedback_type == feedback_type)

        feedbacks = query.order_by(desc(Feedback.created_at)).limit(limit).all()
        return feedbacks

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving feedbacks: {str(e)}"
        )


@router.get("/stats", response_model=dict)
async def get_feedback_stats(
    db: Session = Depends(get_db)
):
    """
    Get feedback statistics
    """
    try:
        total_feedbacks = db.query(Feedback).count()
        user_validations = db.query(Feedback).filter(Feedback.feedback_type == "user_validation").count()
        expert_reviews = db.query(Feedback).filter(Feedback.feedback_type == "expert_review").count()
        resolution_trackings = db.query(Feedback).filter(Feedback.feedback_type == "resolution_tracking").count()

        # Count validation results
        correct_count = db.query(Issue).filter(Issue.user_validation_result == "correct").count()
        incorrect_count = db.query(Issue).filter(Issue.user_validation_result == "incorrect").count()
        partial_count = db.query(Issue).filter(Issue.user_validation_result == "partial").count()

        return {
            "total_feedbacks": total_feedbacks,
            "by_type": {
                "user_validation": user_validations,
                "expert_review": expert_reviews,
                "resolution_tracking": resolution_trackings
            },
            "validation_results": {
                "correct": correct_count,
                "incorrect": incorrect_count,
                "partial": partial_count
            },
            "expert_reviewed_count": db.query(Issue).filter(Issue.expert_reviewed == True).count(),
            "resolved_count": db.query(Issue).filter(Issue.resolution_status.isnot(None)).count()
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving feedback stats: {str(e)}"
        )


@router.get("/{issue_id}", response_model=List[FeedbackOut])
async def get_issue_feedbacks(
    issue_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all feedbacks for a specific issue
    """
    try:
        issue = db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Issue {issue_id} not found"
            )

        feedbacks = db.query(Feedback).filter(Feedback.issue_id == issue_id).order_by(desc(Feedback.created_at)).all()
        return feedbacks

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving issue feedbacks: {str(e)}"
        )



