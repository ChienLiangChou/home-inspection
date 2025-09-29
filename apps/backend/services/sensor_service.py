from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from models.sensor import Sensor
from schemas.sensor import SensorData
from typing import List, Optional


class SensorService:
    """Service for managing sensor operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def upsert_sensor(self, sensor_data: SensorData) -> Sensor:
        """
        Upsert a sensor (insert or update if exists)
        """
        # Try to find existing sensor
        sensor = self.db.query(Sensor).filter(Sensor.sensor_id == sensor_data.sensor_id).first()
        
        if sensor:
            # Update existing sensor
            sensor.vendor = sensor_data.vendor
            sensor.model = sensor_data.model
            sensor.type = sensor_data.type
        else:
            # Create new sensor
            sensor = Sensor(
                sensor_id=sensor_data.sensor_id,
                vendor=sensor_data.vendor,
                model=sensor_data.model,
                type=sensor_data.type
            )
            self.db.add(sensor)
        
        try:
            self.db.commit()
            self.db.refresh(sensor)
            return sensor
        except IntegrityError:
            self.db.rollback()
            raise ValueError(f"Sensor with ID {sensor_data.sensor_id} already exists")
    
    def upsert_sensors(self, sensors_data: List[SensorData]) -> List[Sensor]:
        """
        Upsert multiple sensors
        """
        sensors = []
        for sensor_data in sensors_data:
            sensor = self.upsert_sensor(sensor_data)
            sensors.append(sensor)
        return sensors
    
    def get_sensor_by_id(self, sensor_id: str) -> Optional[Sensor]:
        """
        Get sensor by sensor_id
        """
        return self.db.query(Sensor).filter(Sensor.sensor_id == sensor_id).first()
    
    def get_sensor_by_db_id(self, id: int) -> Optional[Sensor]:
        """
        Get sensor by database ID
        """
        return self.db.query(Sensor).filter(Sensor.id == id).first()
    
    def get_all_sensors(self) -> List[Sensor]:
        """
        Get all sensors
        """
        return self.db.query(Sensor).all()
    
    def delete_sensor(self, sensor_id: str) -> bool:
        """
        Delete a sensor and all its readings
        """
        sensor = self.get_sensor_by_id(sensor_id)
        if not sensor:
            return False
        
        self.db.delete(sensor)
        self.db.commit()
        return True
