from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.base import Base


class Reading(Base):
    __tablename__ = "readings"
    
    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer, ForeignKey("sensors.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)
    location = Column(String(100), nullable=False, index=True)
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    confidence = Column(Float, nullable=False)
    calibration_json = Column(JSON, nullable=True)
    extras_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationship to sensor
    sensor = relationship("Sensor", back_populates="readings")
    
    def __repr__(self):
        return f"<Reading(id={self.id}, sensor_id={self.sensor_id}, type='{self.type}', value={self.value})>"
