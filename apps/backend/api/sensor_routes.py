from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database.connection import get_db
from services.sensor_service import SensorService
from services.readings_service import ReadingsService
from schemas.sensor import SensorData, SensorOut
from schemas.reading import ReadingData, ReadingOut, ReadingFilter, SensorDataBatch

router = APIRouter(prefix="/sensor", tags=["sensor"])


@router.post("/data", response_model=dict, status_code=status.HTTP_201_CREATED)
async def post_sensor_data(
    data: SensorDataBatch,
    db: Session = Depends(get_db)
):
    """
    Receive single or multiple sensor data entries.
    First upserts sensors, then writes readings.
    """
    try:
        # Initialize services
        sensor_service = SensorService(db)
        readings_service = ReadingsService(db)
        
        # Upsert sensors first
        sensors = sensor_service.upsert_sensors(data.sensors)
        
        # Add readings
        readings = readings_service.append_many(data.readings)
        
        return {
            "message": "Sensor data processed successfully",
            "sensors_processed": len(sensors),
            "readings_processed": len(readings),
            "sensor_ids": [s.sensor_id for s in sensors],
            "reading_ids": [r.id for r in readings]
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/latest", response_model=List[ReadingOut])
async def get_sensor_latest(
    type: Optional[str] = None,
    location: Optional[str] = None,
    since: Optional[datetime] = None,
    limit: Optional[int] = 100,
    db: Session = Depends(get_db)
):
    """
    Get latest sensor readings with optional filtering.
    Supports query by type, location, since timestamp, and limit.
    """
    try:
        # Create filter object
        filter_params = ReadingFilter(
            type=type,
            location=location,
            since=since,
            limit=limit
        )
        
        # Get readings
        readings_service = ReadingsService(db)
        readings = readings_service.get_latest(filter_params)
        
        return readings
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving readings: {str(e)}"
        )


@router.get("/sensors", response_model=List[SensorOut])
async def get_all_sensors(db: Session = Depends(get_db)):
    """
    Get all registered sensors
    """
    try:
        sensor_service = SensorService(db)
        sensors = sensor_service.get_all_sensors()
        return sensors
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving sensors: {str(e)}"
        )


@router.get("/sensors/{sensor_id}/readings", response_model=List[ReadingOut])
async def get_sensor_readings(
    sensor_id: str,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get readings for a specific sensor
    """
    try:
        readings_service = ReadingsService(db)
        readings = readings_service.get_readings_by_sensor(sensor_id, limit)
        return readings
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving sensor readings: {str(e)}"
        )


@router.get("/stats")
async def get_sensor_stats(
    sensor_id: Optional[str] = None,
    type: Optional[str] = None,
    location: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get sensor reading statistics
    """
    try:
        readings_service = ReadingsService(db)
        stats = readings_service.get_reading_stats(sensor_id, type, location)
        return stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving statistics: {str(e)}"
        )
