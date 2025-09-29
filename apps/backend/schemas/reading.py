from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime


class ReadingData(BaseModel):
    """Schema for incoming reading data"""
    sensor_id: str = Field(..., min_length=1, max_length=100, description="Sensor identifier")
    type: str = Field(..., min_length=1, max_length=50, description="Reading type")
    location: str = Field(..., min_length=1, max_length=100, description="Reading location")
    value: float = Field(..., description="Reading value")
    unit: str = Field(..., min_length=1, max_length=20, description="Measurement unit")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence level (0.0-1.0)")
    calibration_json: Optional[Dict[str, Any]] = Field(None, description="Calibration data")
    extras_json: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    timestamp: datetime = Field(..., description="Reading timestamp")
    
    @validator('value')
    def validate_value(cls, v):
        if not isinstance(v, (int, float)):
            raise ValueError('value must be a number')
        return float(v)
    
    @validator('confidence')
    def validate_confidence(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError('confidence must be between 0.0 and 1.0')
        return v


class ReadingOut(BaseModel):
    """Schema for outgoing reading data"""
    id: int
    sensor_id: int
    type: str
    location: str
    value: float
    unit: str
    confidence: float
    calibration_json: Optional[Dict[str, Any]]
    extras_json: Optional[Dict[str, Any]]
    timestamp: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class ReadingFilter(BaseModel):
    """Schema for filtering readings"""
    type: Optional[str] = Field(None, description="Filter by reading type")
    location: Optional[str] = Field(None, description="Filter by location")
    since: Optional[datetime] = Field(None, description="Filter readings since this time")
    limit: Optional[int] = Field(100, ge=1, le=1000, description="Maximum number of readings to return")


class SensorDataBatch(BaseModel):
    """Schema for batch sensor data submission"""
    sensors: List[SensorData] = Field(..., min_items=1, description="List of sensor data")
    readings: List[ReadingData] = Field(..., min_items=1, description="List of reading data")
