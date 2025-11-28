"""
Issue model for storing detected problems during inspections
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.base import Base


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    issue_type = Column(String(100), nullable=False, index=True)
    severity = Column(String(10), nullable=False, default="medium", index=True)  # "low", "medium", "high"
    description = Column(Text, nullable=False)
    recommendation = Column(Text, nullable=True)
    location = Column(String(100), nullable=True, index=True)
    component = Column(String(100), nullable=True, index=True)
    image_data = Column(Text, nullable=True)  # Base64 encoded image
    metadata_json = Column(JSON, nullable=True)  # Additional metadata
    detected_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    resolved = Column(String(10), default="false", nullable=False)  # "true" or "false"
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Self-learning system fields
    user_validated = Column(Boolean, default=False, nullable=False, index=True)
    user_validation_result = Column(String(20), nullable=True)  # "correct", "incorrect", "partial"
    expert_reviewed = Column(Boolean, default=False, nullable=False, index=True)
    expert_feedback = Column(JSON, nullable=True)  # Expert feedback (corrected issue_type, severity, recommendation)
    actual_severity = Column(String(10), nullable=True, index=True)  # Actual severity (for comparison with prediction)
    resolution_status = Column(String(20), nullable=True, index=True)  # "resolved", "partially_resolved", "not_resolved", "false_positive"
    resolution_notes = Column(Text, nullable=True)  # Resolution process notes
    learning_score = Column(Float, nullable=True, index=True)  # Learning value score (for training priority)
    
    # Relationships
    feedbacks = relationship("Feedback", back_populates="issue", cascade="all, delete-orphan")
    training_data = relationship("TrainingData", back_populates="issue", cascade="all, delete-orphan")

