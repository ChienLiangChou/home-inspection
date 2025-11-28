"""
Pydantic schemas for Issue model
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from typing import Literal

IssueSeverity = Literal["low", "medium", "high"]


class IssueCreate(BaseModel):
    issue_type: str = Field(..., min_length=1, max_length=100, description="Type of issue")
    severity: IssueSeverity = Field(..., description="Issue severity level")
    description: str = Field(..., min_length=1, description="Detailed description")
    recommendation: Optional[str] = Field(None, description="Recommended solution")
    location: Optional[str] = Field(None, max_length=100, description="Location where issue was detected")
    component: Optional[str] = Field(None, max_length=100, description="Component/system affected")
    image_data: Optional[str] = Field(None, description="Base64 encoded image snapshot")
    metadata_json: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class IssueOut(BaseModel):
    id: int
    issue_type: str
    severity: IssueSeverity
    description: str
    recommendation: Optional[str]
    location: Optional[str]
    component: Optional[str]
    detected_at: datetime
    created_at: datetime
    resolved: str
    resolved_at: Optional[datetime]
    metadata_json: Optional[Dict[str, Any]]
    # Self-learning fields
    user_validated: bool
    user_validation_result: Optional[str]
    expert_reviewed: bool
    expert_feedback: Optional[Dict[str, Any]]
    actual_severity: Optional[str]
    resolution_status: Optional[str]
    resolution_notes: Optional[str]
    learning_score: Optional[float]

    class Config:
        from_attributes = True


class IssueUpdate(BaseModel):
    resolved: Optional[str] = Field(None, description="Set to 'true' to mark as resolved")
    recommendation: Optional[str] = Field(None, description="Update recommendation")
    # Self-learning fields
    user_validation_result: Optional[str] = Field(None, description="User validation: 'correct', 'incorrect', 'partial'")
    expert_feedback: Optional[Dict[str, Any]] = Field(None, description="Expert feedback with corrections")
    actual_severity: Optional[str] = Field(None, description="Actual severity level")
    resolution_status: Optional[str] = Field(None, description="Resolution status")
    resolution_notes: Optional[str] = Field(None, description="Resolution process notes")

