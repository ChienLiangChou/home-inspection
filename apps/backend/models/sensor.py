from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.base import Base


class Sensor(Base):
    __tablename__ = "sensors"
    
    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(String(100), unique=True, index=True, nullable=False)
    vendor = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationship to readings
    readings = relationship("Reading", back_populates="sensor", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint('sensor_id', name='uq_sensor_id'),
    )
    
    def __repr__(self):
        return f"<Sensor(id={self.id}, sensor_id='{self.sensor_id}', type='{self.type}')>"
