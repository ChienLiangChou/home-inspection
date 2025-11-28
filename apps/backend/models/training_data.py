"""
TrainingData model for storing cleaned and standardized training data
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.base import Base


class TrainingData(Base):
    __tablename__ = "training_data"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False, index=True)
    cleaned_status = Column(String(20), nullable=False, default="pending", index=True)  # "pending", "cleaned", "failed"
    quality_score = Column(Float, nullable=True, index=True)  # Quality score (0-1)
    standardized_data = Column(JSON, nullable=False)  # Standardized data
    labels = Column(JSON, nullable=False)  # Labels (issue_type, severity, recommendation_category)
    used_for_training = Column(Boolean, default=False, nullable=False, index=True)
    training_version = Column(String(20), nullable=True, index=True)  # Which model version used this data
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    cleaned_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationship
    issue = relationship("Issue", back_populates="training_data")
    
    def __repr__(self):
        return f"<TrainingData(id={self.id}, issue_id={self.issue_id}, status='{self.cleaned_status}', score={self.quality_score})>"



