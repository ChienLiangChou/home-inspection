#!/usr/bin/env python3
"""
Test data generator for Home Inspection System
Generates realistic test data for manual testing and demonstrations
"""

import os
import sys
import json
import random
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


class TestDataGenerator:
    """Generate realistic test data for the Home Inspection System"""
    
    def __init__(self):
        self.sensor_configs = {
            "ble_moist_001": {
                "vendor": "BlueTech",
                "model": "MoisturePro-X1", 
                "type": "moisture_meter",
                "locations": ["attic_ceiling", "basement_wall", "living_room_wall", "bathroom_ceiling"],
                "normal_range": (20, 60),
                "problem_range": (75, 95),
                "unit": "%"
            },
            "ble_co2_003": {
                "vendor": "AirSense",
                "model": "CO2Monitor-Pro",
                "type": "co2", 
                "locations": ["basement_utility", "living_room", "attic_ventilation", "kitchen"],
                "normal_range": (400, 800),
                "problem_range": (1200, 1800),
                "unit": "ppm"
            },
            "ble_ir_002": {
                "vendor": "ThermoTech",
                "model": "ThermalSpot-2000",
                "type": "thermal_spot",
                "locations": ["electrical_panel", "basement_pipe", "attic_ceiling", "exterior_wall"],
                "normal_range": (18, 25),
                "problem_range": (45, 60),
                "unit": "°C"
            }
        }
    
    def generate_sensor_data(self, sensor_id: str, count: int = 10) -> Dict[str, Any]:
        """Generate sensor data for a specific sensor"""
        if sensor_id not in self.sensor_configs:
            raise ValueError(f"Unknown sensor ID: {sensor_id}")
        
        config = self.sensor_configs[sensor_id]
        
        # Generate sensor info
        sensor_data = {
            "sensor_id": sensor_id,
            "vendor": config["vendor"],
            "model": config["model"],
            "type": config["type"]
        }
        
        # Generate readings
        readings = []
        base_time = datetime.utcnow() - timedelta(hours=1)
        
        for i in range(count):
            # Determine if this reading should be a problem reading
            is_problem = random.random() < 0.3  # 30% chance of problem reading
            
            if is_problem:
                value = random.uniform(*config["problem_range"])
                confidence = random.uniform(0.7, 0.9)  # Lower confidence for problems
            else:
                value = random.uniform(*config["normal_range"])
                confidence = random.uniform(0.85, 0.98)  # Higher confidence for normal
            
            # Select location
            location = random.choice(config["locations"])
            
            # Generate reading
            reading = {
                "sensor_id": sensor_id,
                "type": f"{config['type']}_reading",
                "location": location,
                "value": round(value, 1),
                "unit": config["unit"],
                "confidence": round(confidence, 2),
                "calibration_json": {
                    "calibrated_at": "2024-01-15T10:00:00Z",
                    "offset": random.uniform(-0.5, 0.5)
                },
                "extras_json": {
                    "battery_level": random.uniform(80, 100),
                    "signal_strength": random.uniform(75, 100),
                    "temperature": random.uniform(18, 25) if config["type"] != "thermal_spot" else None
                },
                "timestamp": (base_time + timedelta(minutes=i*5)).isoformat()
            }
            
            readings.append(reading)
        
        return {
            "sensors": [sensor_data],
            "readings": readings
        }
    
    def generate_roofing_scenario(self) -> Dict[str, Any]:
        """Generate data for roofing inspection scenario"""
        print("🏠 Generating roofing inspection scenario...")
        
        # High moisture in attic (problem)
        attic_moisture = {
            "sensors": [{
                "sensor_id": "roof_moisture_001",
                "vendor": "RoofTech",
                "model": "MoisturePro-Roof",
                "type": "moisture_meter"
            }],
            "readings": [
                {
                    "sensor_id": "roof_moisture_001",
                    "type": "moisture_level",
                    "location": "attic_ceiling_north",
                    "value": 87.5,
                    "unit": "%",
                    "confidence": 0.92,
                    "calibration_json": {"calibrated_at": "2024-01-15T10:00:00Z"},
                    "extras_json": {"battery": 95, "signal": 88},
                    "timestamp": datetime.utcnow().isoformat()
                },
                {
                    "sensor_id": "roof_moisture_001", 
                    "type": "moisture_level",
                    "location": "attic_ceiling_south",
                    "value": 35.2,
                    "unit": "%",
                    "confidence": 0.94,
                    "calibration_json": {"calibrated_at": "2024-01-15T10:00:00Z"},
                    "extras_json": {"battery": 95, "signal": 92},
                    "timestamp": (datetime.utcnow() - timedelta(minutes=30)).isoformat()
                }
            ]
        }
        
        return attic_moisture
    
    def generate_plumbing_scenario(self) -> Dict[str, Any]:
        """Generate data for plumbing inspection scenario"""
        print("🚰 Generating plumbing inspection scenario...")
        
        # High moisture near pipes (leak detection)
        plumbing_moisture = {
            "sensors": [{
                "sensor_id": "plumb_moisture_001",
                "vendor": "PlumbTech", 
                "model": "MoisturePro-Plumb",
                "type": "moisture_meter"
            }],
            "readings": [
                {
                    "sensor_id": "plumb_moisture_001",
                    "type": "moisture_level",
                    "location": "basement_pipe_joint",
                    "value": 92.8,
                    "unit": "%",
                    "confidence": 0.91,
                    "calibration_json": {"calibrated_at": "2024-01-15T10:00:00Z"},
                    "extras_json": {"battery": 88, "signal": 85},
                    "timestamp": datetime.utcnow().isoformat()
                },
                {
                    "sensor_id": "plumb_moisture_001",
                    "type": "moisture_level", 
                    "location": "basement_dry_wall",
                    "value": 28.4,
                    "unit": "%",
                    "confidence": 0.96,
                    "calibration_json": {"calibrated_at": "2024-01-15T10:00:00Z"},
                    "extras_json": {"battery": 88, "signal": 90},
                    "timestamp": (datetime.utcnow() - timedelta(minutes=45)).isoformat()
                }
            ]
        }
        
        return plumbing_moisture
    
    def generate_continuous_data(self, duration_minutes: int = 60) -> List[Dict[str, Any]]:
        """Generate continuous data stream for testing"""
        print(f"📊 Generating {duration_minutes} minutes of continuous data...")
        
        all_data = []
        start_time = datetime.utcnow() - timedelta(minutes=duration_minutes)
        
        for sensor_id in self.sensor_configs.keys():
            config = self.sensor_configs[sensor_id]
            
            # Generate data every 5 minutes
            for i in range(0, duration_minutes, 5):
                timestamp = start_time + timedelta(minutes=i)
                
                # Determine if this should be a problem reading
                is_problem = random.random() < 0.2  # 20% chance of problem
                
                if is_problem:
                    value = random.uniform(*config["problem_range"])
                    confidence = random.uniform(0.7, 0.9)
                else:
                    value = random.uniform(*config["normal_range"])
                    confidence = random.uniform(0.85, 0.98)
                
                reading = {
                    "sensor_id": sensor_id,
                    "type": f"{config['type']}_reading",
                    "location": random.choice(config["locations"]),
                    "value": round(value, 1),
                    "unit": config["unit"],
                    "confidence": round(confidence, 2),
                    "calibration_json": {"calibrated_at": "2024-01-15T10:00:00Z"},
                    "extras_json": {
                        "battery_level": random.uniform(80, 100),
                        "signal_strength": random.uniform(75, 100)
                    },
                    "timestamp": timestamp.isoformat()
                }
                
                all_data.append({
                    "sensors": [{
                        "sensor_id": sensor_id,
                        "vendor": config["vendor"],
                        "model": config["model"],
                        "type": config["type"]
                    }],
                    "readings": [reading]
                })
        
        return all_data
    
    def save_to_file(self, data: Any, filename: str):
        """Save data to JSON file"""
        with open(filename, "w") as f:
            json.dump(data, f, indent=2)
        print(f"💾 Data saved to: {filename}")


def main():
    """Main function to generate test data"""
    generator = TestDataGenerator()
    
    print("🧪 Home Inspection System - Test Data Generator")
    print("=" * 50)
    
    # Generate individual sensor data
    print("\n📡 Generating individual sensor data...")
    for sensor_id in generator.sensor_configs.keys():
        data = generator.generate_sensor_data(sensor_id, 15)
        filename = f"test_data_{sensor_id}.json"
        generator.save_to_file(data, filename)
    
    # Generate scenario data
    print("\n🏠 Generating scenario data...")
    roofing_data = generator.generate_roofing_scenario()
    generator.save_to_file(roofing_data, "test_data_roofing_scenario.json")
    
    plumbing_data = generator.generate_plumbing_scenario()
    generator.save_to_file(plumbing_data, "test_data_plumbing_scenario.json")
    
    # Generate continuous data
    print("\n📊 Generating continuous data...")
    continuous_data = generator.generate_continuous_data(120)  # 2 hours of data
    generator.save_to_file(continuous_data, "test_data_continuous.json")
    
    print("\n🎉 Test data generation completed!")
    print("\nGenerated files:")
    print("  - test_data_ble_moist_001.json (moisture sensor)")
    print("  - test_data_ble_co2_003.json (CO2 sensor)")
    print("  - test_data_ble_ir_002.json (thermal sensor)")
    print("  - test_data_roofing_scenario.json (roofing inspection)")
    print("  - test_data_plumbing_scenario.json (plumbing inspection)")
    print("  - test_data_continuous.json (continuous data stream)")
    
    print("\n💡 Usage:")
    print("  - Use individual sensor files for API testing")
    print("  - Use scenario files for RAG integration testing")
    print("  - Use continuous data for WebSocket testing")


if __name__ == "__main__":
    main()
