"""
ModelVersion model for managing model versions and their performance metrics
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Boolean
from sqlalchemy.sql import func
from database.base import Base


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    model_type = Column(String(50), nullable=False, index=True)  # "detection", "severity", "recommendation"
    version = Column(String(20), nullable=False, index=True)  # "v1.0", "v1.1"
    training_data_range = Column(JSON, nullable=True)  # Training data range (dates, counts)
    performance_metrics = Column(JSON, nullable=False)  # Performance metrics
    model_file_path = Column(String(255), nullable=True)  # Model file path (for local models)
    prompt_template = Column(Text, nullable=True)  # Prompt template (for API models)
    deployed = Column(Boolean, default=False, nullable=False, index=True)
    deployed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    notes = Column(Text, nullable=True)  # Additional notes about this version
    
    def __repr__(self):
        return f"<ModelVersion(id={self.id}, type='{self.model_type}', version='{self.version}', deployed={self.deployed})>"



