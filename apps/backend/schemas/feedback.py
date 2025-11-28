"""
Pydantic schemas for Feedback model
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from typing import Literal

FeedbackType = Literal["user_validation", "expert_review", "resolution_tracking"]


class FeedbackCreate(BaseModel):
    issue_id: int = Field(..., description="Issue ID this feedback is for")
    feedback_type: FeedbackType = Field(..., description="Type of feedback")
    original_result: Dict[str, Any] = Field(..., description="Original detection result")
    actual_result: Optional[Dict[str, Any]] = Field(None, description="Actual result from feedback")
    differences: Optional[Dict[str, Any]] = Field(None, description="Difference analysis")
    feedback_data: Optional[Dict[str, Any]] = Field(None, description="Detailed feedback data")
    source: Optional[str] = Field(None, description="Feedback source (user_id, expert_id, etc.)")


class FeedbackOut(BaseModel):
    id: int
    issue_id: int
    feedback_type: str
    original_result: Dict[str, Any]
    actual_result: Optional[Dict[str, Any]]
    differences: Optional[Dict[str, Any]]
    feedback_data: Optional[Dict[str, Any]]
    source: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class UserValidationRequest(BaseModel):
    issue_id: int = Field(..., description="Issue ID to validate")
    validation_result: Literal["correct", "incorrect", "partial"] = Field(..., description="Validation result")
    corrections: Optional[Dict[str, Any]] = Field(None, description="Corrections if incorrect or partial")
    notes: Optional[str] = Field(None, description="Additional notes")


class ExpertReviewRequest(BaseModel):
    issue_id: int = Field(..., description="Issue ID to review")
    corrected_issue_type: Optional[str] = Field(None, description="Corrected issue type")
    corrected_severity: Optional[str] = Field(None, description="Corrected severity")
    corrected_recommendation: Optional[str] = Field(None, description="Corrected recommendation")
    expert_notes: Optional[str] = Field(None, description="Expert notes")
    expert_id: Optional[str] = Field(None, description="Expert identifier")


class ResolutionTrackingRequest(BaseModel):
    issue_id: int = Field(..., description="Issue ID to track")
    resolution_status: Literal["resolved", "partially_resolved", "not_resolved", "false_positive"] = Field(
        ..., description="Resolution status"
    )
    resolution_notes: Optional[str] = Field(None, description="Resolution process notes")
    actual_severity: Optional[str] = Field(None, description="Actual severity if different from prediction")



