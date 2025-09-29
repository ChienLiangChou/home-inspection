from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


class SensorData(BaseModel):
    """Schema for incoming sensor data"""
    sensor_id: str = Field(..., min_length=1, max_length=100, description="Unique sensor identifier")
    vendor: str = Field(..., min_length=1, max_length=100, description="Sensor vendor")
    model: str = Field(..., min_length=1, max_length=100, description="Sensor model")
    type: str = Field(..., min_length=1, max_length=50, description="Sensor type")
    
    @validator('sensor_id')
    def validate_sensor_id(cls, v):
        if not v or not v.strip():
            raise ValueError('sensor_id cannot be empty')
        return v.strip()
    
    @validator('type')
    def validate_type(cls, v):
        allowed_types = [
            'moisture_meter', 'co2', 'thermal_spot', 'temperature', 
            'humidity', 'pressure', 'air_quality', 'motion', 'light'
        ]
        if v not in allowed_types:
            raise ValueError(f'type must be one of: {", ".join(allowed_types)}')
        return v


class SensorOut(BaseModel):
    """Schema for outgoing sensor data"""
    id: int
    sensor_id: str
    vendor: str
    model: str
    type: str
    created_at: datetime
    
    class Config:
        from_attributes = True
