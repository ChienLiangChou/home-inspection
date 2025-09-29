from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from models.reading import Reading
from models.sensor import Sensor
from schemas.reading import ReadingData, ReadingFilter
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta


class ReadingsService:
    """Service for managing reading operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def append_many(self, readings_data: List[ReadingData]) -> List[Reading]:
        """
        Append multiple readings to the database
        """
        readings = []
        for reading_data in readings_data:
            # Get sensor by sensor_id
            sensor = self.db.query(Sensor).filter(Sensor.sensor_id == reading_data.sensor_id).first()
            if not sensor:
                raise ValueError(f"Sensor with ID {reading_data.sensor_id} not found")
            
            # Create reading
            reading = Reading(
                sensor_id=sensor.id,
                type=reading_data.type,
                location=reading_data.location,
                value=reading_data.value,
                unit=reading_data.unit,
                confidence=reading_data.confidence,
                calibration_json=reading_data.calibration_json,
                extras_json=reading_data.extras_json,
                timestamp=reading_data.timestamp
            )
            self.db.add(reading)
            readings.append(reading)
        
        self.db.commit()
        for reading in readings:
            self.db.refresh(reading)
        
        return readings
    
    def get_latest(self, filter_params: ReadingFilter) -> List[Reading]:
        """
        Get latest readings based on filter parameters
        """
        query = self.db.query(Reading)
        
        # Apply filters
        if filter_params.type:
            query = query.filter(Reading.type == filter_params.type)
        
        if filter_params.location:
            query = query.filter(Reading.location == filter_params.location)
        
        if filter_params.since:
            query = query.filter(Reading.timestamp >= filter_params.since)
        
        # Order by timestamp descending and apply limit
        query = query.order_by(desc(Reading.timestamp))
        
        if filter_params.limit:
            query = query.limit(filter_params.limit)
        
        return query.all()
    
    def get_readings_by_sensor(self, sensor_id: str, limit: int = 100) -> List[Reading]:
        """
        Get readings for a specific sensor
        """
        sensor = self.db.query(Sensor).filter(Sensor.sensor_id == sensor_id).first()
        if not sensor:
            return []
        
        return (
            self.db.query(Reading)
            .filter(Reading.sensor_id == sensor.id)
            .order_by(desc(Reading.timestamp))
            .limit(limit)
            .all()
        )
    
    def get_readings_by_type(self, reading_type: str, limit: int = 100) -> List[Reading]:
        """
        Get readings by type
        """
        return (
            self.db.query(Reading)
            .filter(Reading.type == reading_type)
            .order_by(desc(Reading.timestamp))
            .limit(limit)
            .all()
        )
    
    def get_readings_by_location(self, location: str, limit: int = 100) -> List[Reading]:
        """
        Get readings by location
        """
        return (
            self.db.query(Reading)
            .filter(Reading.location == location)
            .order_by(desc(Reading.timestamp))
            .limit(limit)
            .all()
        )
    
    def get_recent_readings(self, window_seconds: int = 60, limit: int = 100) -> List[Reading]:
        """
        Get readings from the last N seconds
        """
        since = datetime.utcnow() - timedelta(seconds=window_seconds)
        return (
            self.db.query(Reading)
            .filter(Reading.timestamp >= since)
            .order_by(desc(Reading.timestamp))
            .limit(limit)
            .all()
        )
    
    def get_reading_stats(self, sensor_id: Optional[str] = None, 
                         reading_type: Optional[str] = None,
                         location: Optional[str] = None) -> Dict[str, Any]:
        """
        Get reading statistics
        """
        query = self.db.query(Reading)
        
        if sensor_id:
            sensor = self.db.query(Sensor).filter(Sensor.sensor_id == sensor_id).first()
            if sensor:
                query = query.filter(Reading.sensor_id == sensor.id)
        
        if reading_type:
            query = query.filter(Reading.type == reading_type)
        
        if location:
            query = query.filter(Reading.location == location)
        
        readings = query.all()
        
        if not readings:
            return {
                "count": 0,
                "avg_value": 0,
                "min_value": 0,
                "max_value": 0,
                "avg_confidence": 0
            }
        
        values = [r.value for r in readings]
        confidences = [r.confidence for r in readings]
        
        return {
            "count": len(readings),
            "avg_value": sum(values) / len(values),
            "min_value": min(values),
            "max_value": max(values),
            "avg_confidence": sum(confidences) / len(confidences)
        }
