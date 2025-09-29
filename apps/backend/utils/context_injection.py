from sqlalchemy.orm import Session
from services.readings_service import ReadingsService
from schemas.reading import ReadingOut
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta


def build_sensor_context(
    component: str,
    location_prefix: str,
    window_sec: int = 60,
    db: Session = None
) -> List[Dict[str, Any]]:
    """
    Build sensor context for Realtime integration.
    Returns recent sensor readings as context for AI models.
    
    Args:
        component: The component/system being analyzed (e.g., "roofing", "plumbing")
        location_prefix: Location prefix to filter readings (e.g., "roof", "basement")
        window_sec: Time window in seconds to look back for readings
        db: Database session
    
    Returns:
        List of recent sensor readings formatted for AI context
    """
    if not db:
        return []
    
    try:
        # Calculate time window
        since = datetime.utcnow() - timedelta(seconds=window_sec)
        
        # Initialize readings service
        readings_service = ReadingsService(db)
        
        # Get recent readings
        readings = readings_service.get_recent_readings(window_sec, limit=50)
        
        # Filter readings by location prefix if specified
        if location_prefix:
            readings = [
                r for r in readings 
                if location_prefix.lower() in r.location.lower()
            ]
        
        # Format readings for AI context
        context_readings = []
        for reading in readings:
            context_reading = {
                "sensor_id": reading.sensor_id,
                "type": reading.type,
                "location": reading.location,
                "value": reading.value,
                "unit": reading.unit,
                "confidence": reading.confidence,
                "timestamp": reading.timestamp.isoformat(),
                "age_seconds": (datetime.utcnow() - reading.timestamp).total_seconds()
            }
            
            # Add calibration data if available
            if reading.calibration_json:
                context_reading["calibration"] = reading.calibration_json
            
            # Add extras data if available
            if reading.extras_json:
                context_reading["extras"] = reading.extras_json
            
            context_readings.append(context_reading)
        
        # Sort by timestamp (most recent first)
        context_readings.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return context_readings
        
    except Exception as e:
        # Return empty context on error to avoid breaking the AI flow
        print(f"Error building sensor context: {e}")
        return []


def get_sensor_summary(
    component: str,
    location_prefix: str,
    window_sec: int = 60,
    db: Session = None
) -> Dict[str, Any]:
    """
    Get a summary of sensor data for a specific component and location.
    Useful for providing high-level context to AI models.
    
    Args:
        component: The component/system being analyzed
        location_prefix: Location prefix to filter readings
        window_sec: Time window in seconds
        db: Database session
    
    Returns:
        Dictionary with sensor data summary
    """
    if not db:
        return {"error": "No database connection"}
    
    try:
        readings_service = ReadingsService(db)
        
        # Get statistics
        stats = readings_service.get_reading_stats()
        
        # Get recent readings for context
        recent_readings = build_sensor_context(component, location_prefix, window_sec, db)
        
        # Group readings by type
        readings_by_type = {}
        for reading in recent_readings:
            reading_type = reading["type"]
            if reading_type not in readings_by_type:
                readings_by_type[reading_type] = []
            readings_by_type[reading_type].append(reading)
        
        # Calculate summary statistics by type
        type_summaries = {}
        for reading_type, readings in readings_by_type.items():
            if readings:
                values = [r["value"] for r in readings]
                confidences = [r["confidence"] for r in readings]
                
                type_summaries[reading_type] = {
                    "count": len(readings),
                    "avg_value": sum(values) / len(values),
                    "min_value": min(values),
                    "max_value": max(values),
                    "avg_confidence": sum(confidences) / len(confidences),
                    "latest_reading": readings[0] if readings else None
                }
        
        return {
            "component": component,
            "location_prefix": location_prefix,
            "window_seconds": window_sec,
            "total_readings": len(recent_readings),
            "readings_by_type": type_summaries,
            "overall_stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "error": f"Error generating sensor summary: {str(e)}",
            "component": component,
            "location_prefix": location_prefix
        }
