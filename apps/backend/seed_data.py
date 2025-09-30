#!/usr/bin/env python3
"""
Seed data script for Home Inspection System
Creates three sensor devices and sample readings
"""

import os
import sys
from datetime import datetime, timedelta
from typing import List
import random

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import SessionLocal, engine
from database.base import Base
from models.sensor import Sensor
from models.reading import Reading
from schemas.sensor import SensorData
from schemas.reading import ReadingData
from services.sensor_service import SensorService
from services.readings_service import ReadingsService


def create_sensors() -> List[Sensor]:
    """Create the three required sensor devices"""
    db = SessionLocal()
    try:
        sensor_service = SensorService(db)
        
        # Define the three sensors as specified
        sensors_data = [
            SensorData(
                sensor_id="ble_moist_001",
                vendor="BlueTech",
                model="MoisturePro-X1",
                type="moisture_meter"
            ),
            SensorData(
                sensor_id="ble_co2_003", 
                vendor="AirSense",
                model="CO2Monitor-Pro",
                type="co2"
            ),
            SensorData(
                sensor_id="ble_ir_002",
                vendor="ThermoTech",
                model="ThermalSpot-2000",
                type="thermal_spot"
            )
        ]
        
        # Upsert sensors
        sensors = sensor_service.upsert_sensors(sensors_data)
        print(f"✅ Created {len(sensors)} sensors")
        
        for sensor in sensors:
            print(f"  - {sensor.sensor_id} ({sensor.type}) - {sensor.vendor} {sensor.model}")
        
        return sensors
        
    finally:
        db.close()


def generate_realistic_readings(sensor_id: str, sensor_type: str, count: int = 20) -> List[ReadingData]:
    """Generate realistic test readings for different sensor types"""
    readings = []
    base_time = datetime.utcnow() - timedelta(hours=2)
    
    if sensor_type == "moisture_meter":
        # Moisture readings: 0-100% with realistic patterns
        for i in range(count):
            # Simulate moisture levels that might be found in different areas
            if i < 5:
                # High moisture (problem areas)
                value = random.uniform(75, 95)
                location = "basement_wall"
                confidence = random.uniform(0.7, 0.9)
            elif i < 10:
                # Medium moisture (normal areas)
                value = random.uniform(30, 60)
                location = "living_room_wall"
                confidence = random.uniform(0.8, 0.95)
            else:
                # Low moisture (dry areas)
                value = random.uniform(5, 25)
                location = "attic_ceiling"
                confidence = random.uniform(0.85, 0.98)
            
            readings.append(ReadingData(
                sensor_id=sensor_id,
                type="moisture_level",
                location=location,
                value=round(value, 1),
                unit="%",
                confidence=round(confidence, 2),
                calibration_json={"calibrated_at": "2024-01-15T10:00:00Z", "offset": 0.0},
                extras_json={"battery_level": random.uniform(85, 100), "signal_strength": random.uniform(80, 100)},
                timestamp=base_time + timedelta(minutes=i*6)
            ))
    
    elif sensor_type == "co2":
        # CO2 readings: 400-2000 ppm with realistic patterns
        for i in range(count):
            # Simulate CO2 levels in different scenarios
            if i < 5:
                # High CO2 (poor ventilation)
                value = random.uniform(1200, 1800)
                location = "basement_utility_room"
                confidence = random.uniform(0.8, 0.95)
            elif i < 10:
                # Medium CO2 (normal indoor)
                value = random.uniform(600, 1000)
                location = "living_room"
                confidence = random.uniform(0.85, 0.98)
            else:
                # Low CO2 (well ventilated)
                value = random.uniform(400, 600)
                location = "attic_ventilation"
                confidence = random.uniform(0.9, 0.99)
            
            readings.append(ReadingData(
                sensor_id=sensor_id,
                type="co2_concentration",
                location=location,
                value=round(value, 0),
                unit="ppm",
                confidence=round(confidence, 2),
                calibration_json={"calibrated_at": "2024-01-15T10:00:00Z", "baseline": 400},
                extras_json={"temperature": random.uniform(18, 25), "humidity": random.uniform(30, 70)},
                timestamp=base_time + timedelta(minutes=i*6)
            ))
    
    elif sensor_type == "thermal_spot":
        # Thermal readings: -20 to 60°C with realistic patterns
        for i in range(count):
            # Simulate thermal readings for different areas
            if i < 5:
                # Hot spots (potential issues)
                value = random.uniform(45, 60)
                location = "electrical_panel"
                confidence = random.uniform(0.8, 0.95)
            elif i < 10:
                # Normal temperatures
                value = random.uniform(18, 25)
                location = "living_room_wall"
                confidence = random.uniform(0.85, 0.98)
            else:
                # Cold spots (potential insulation issues)
                value = random.uniform(5, 15)
                location = "exterior_wall"
                confidence = random.uniform(0.8, 0.95)
            
            readings.append(ReadingData(
                sensor_id=sensor_id,
                type="temperature",
                location=location,
                value=round(value, 1),
                unit="°C",
                confidence=round(confidence, 2),
                calibration_json={"calibrated_at": "2024-01-15T10:00:00Z", "emissivity": 0.95},
                extras_json={"ambient_temp": random.uniform(18, 25), "distance": random.uniform(0.5, 2.0)},
                timestamp=base_time + timedelta(minutes=i*6)
            ))
    
    return readings


def create_sample_readings() -> List[Reading]:
    """Create sample readings for all sensors"""
    db = SessionLocal()
    try:
        readings_service = ReadingsService(db)
        
        # Get all sensors
        sensors = db.query(Sensor).all()
        all_readings = []
        
        for sensor in sensors:
            print(f"📊 Generating readings for {sensor.sensor_id} ({sensor.type})...")
            
            # Generate realistic readings
            readings_data = generate_realistic_readings(sensor.sensor_id, sensor.type, 20)
            
            # Add readings to database
            readings = readings_service.append_many(readings_data)
            all_readings.extend(readings)
            
            print(f"  ✅ Added {len(readings)} readings")
        
        print(f"✅ Total readings created: {len(all_readings)}")
        return all_readings
        
    finally:
        db.close()


def main():
    """Main seed data function"""
    print("🌱 Starting Home Inspection System seed data...")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified")
    
    # Create sensors
    print("\n📡 Creating sensors...")
    sensors = create_sensors()
    
    # Create sample readings
    print("\n📊 Creating sample readings...")
    readings = create_sample_readings()
    
    print(f"\n🎉 Seed data completed successfully!")
    print(f"   - {len(sensors)} sensors created")
    print(f"   - {len(readings)} readings created")
    print(f"   - Database ready for testing")


if __name__ == "__main__":
    main()
