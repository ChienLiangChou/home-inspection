"""
Feedback model for storing user validation, expert review, and resolution tracking
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.base import Base


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False, index=True)
    feedback_type = Column(String(50), nullable=False, index=True)  # "user_validation", "expert_review", "resolution_tracking"
    original_result = Column(JSON, nullable=False)  # Original detection result
    actual_result = Column(JSON, nullable=True)  # Actual result (from feedback)
    differences = Column(JSON, nullable=True)  # Difference analysis
    feedback_data = Column(JSON, nullable=True)  # Detailed feedback data
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    source = Column(String(50), nullable=True)  # Feedback source (user_id, expert_id, etc.)
    
    # Relationship
    issue = relationship("Issue", back_populates="feedbacks")
    
    def __repr__(self):
        return f"<Feedback(id={self.id}, issue_id={self.issue_id}, type='{self.feedback_type}')>"



