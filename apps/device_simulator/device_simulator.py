#!/usr/bin/env python3
"""
Home Inspection Device Simulator

This script simulates a home inspection device that sends sensor readings
to the FastAPI backend. It can run continuously or send a single batch.

Usage:
    # Send one batch of readings
    python device_simulator.py

    # Run continuously (sends readings every 5 seconds)
    python device_simulator.py --continuous

    # Custom interval (e.g., every 10 seconds)
    python device_simulator.py --continuous --interval 10

    # Custom backend URL
    python device_simulator.py --backend http://localhost:8000
"""

import os
import sys
import time
import random
import argparse
import requests
from datetime import datetime
from typing import List, Dict, Any

# Default configuration
DEFAULT_BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
DEFAULT_INTERVAL = 5  # seconds


class DeviceSimulator:
    """Simulates a home inspection device with multiple sensors"""

    def __init__(self, backend_url: str = DEFAULT_BACKEND_URL):
        self.backend_url = backend_url.rstrip('/')
        self.api_url = f"{self.backend_url}/api/sensor/data"

        # Define the three sensors as per project requirements
        self.sensors = [
            {
                "sensor_id": "ble_moist_001",
                "vendor": "BlueTech",
                "model": "MoisturePro-X1",
                "type": "moisture_meter"
            },
            {
                "sensor_id": "ble_co2_003",
                "vendor": "AirSense",
                "model": "CO2Monitor-Pro",
                "type": "co2"
            },
            {
                "sensor_id": "ble_ir_002",
                "vendor": "ThermoTech",
                "model": "ThermalSpot-2000",
                "type": "thermal_spot"
            }
        ]

        # Realistic value ranges for each sensor type
        self.value_ranges = {
            "moisture_meter": {
                "value_range": (30.0, 90.0),
                "unit": "%",
                "locations": ["basement_wall", "attic_ceiling", "bathroom_wall", "kitchen_sink"],
                "extras": lambda: {
                    "humidity": round(random.uniform(40, 80), 1),
                    "temperature": round(random.uniform(18, 25), 1),
                    "surface_type": random.choice(["drywall", "concrete", "wood"])
                }
            },
            "co2": {
                "value_range": (400, 1200),
                "unit": "ppm",
                "locations": ["living_room", "bedroom", "kitchen", "basement"],
                "extras": lambda: {
                    "air_quality": random.choice(["good", "moderate", "poor"]),
                    "ventilation_rate": round(random.uniform(0.5, 3.0), 2),
                    "temperature": round(random.uniform(18, 24), 1)
                }
            },
            "thermal_spot": {
                "value_range": (15.0, 35.0),
                "unit": "°C",
                "locations": ["roof", "attic", "exterior_wall", "window"],
                "extras": lambda: {
                    "ambient_temp": round(random.uniform(18, 22), 1),
                    "surface_type": random.choice(["shingle", "metal", "concrete", "brick"]),
                    "solar_radiation": round(random.uniform(0, 800), 0)
                }
            }
        }

    def generate_reading(self, sensor: Dict[str, str]) -> Dict[str, Any]:
        """Generate a realistic reading for a sensor"""
        sensor_type = sensor["type"]
        config = self.value_ranges[sensor_type]

        value = round(random.uniform(*config["value_range"]), 2)
        location = random.choice(config["locations"])
        confidence = round(random.uniform(0.85, 0.98), 2)

        reading = {
            "sensor_id": sensor["sensor_id"],
            "type": sensor_type,
            "location": location,
            "value": value,
            "unit": config["unit"],
            "confidence": confidence,
            "calibration_json": {
                "calibrated_at": datetime.utcnow().isoformat() + "Z",
                "calibration_method": "factory"
            },
            "extras_json": config["extras"](),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

        return reading

    def generate_batch(self) -> Dict[str, Any]:
        """Generate a batch of sensor data with all sensors"""
        readings = [self.generate_reading(sensor) for sensor in self.sensors]

        return {
            "sensors": self.sensors,
            "readings": readings
        }

    def send_batch(self, batch: Dict[str, Any]) -> bool:
        """Send a batch of sensor data to the backend"""
        try:
            response = requests.post(
                self.api_url,
                json=batch,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            response.raise_for_status()
            result = response.json()
            print(f"✅ Sent {result.get('readings_processed', 0)} readings")
            return True
        except requests.exceptions.RequestException as e:
            print(f"❌ Error sending data: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"   Response: {e.response.text}")
            return False

    def test_connection(self) -> bool:
        """Test connection to backend"""
        try:
            health_url = f"{self.backend_url}/health"
            response = requests.get(health_url, timeout=5)
            response.raise_for_status()
            print(f"✅ Backend is reachable at {self.backend_url}")
            return True
        except requests.exceptions.RequestException as e:
            print(f"❌ Cannot reach backend at {self.backend_url}: {e}")
            print(f"   Make sure the backend is running: cd apps/backend && python main.py")
            return False

    def run_once(self):
        """Send one batch of readings"""
        print(f"\n📡 Device Simulator - Sending sensor data to {self.backend_url}")
        print("=" * 60)

        if not self.test_connection():
            sys.exit(1)

        batch = self.generate_batch()
        print(f"\n📊 Generated readings for {len(batch['readings'])} sensors:")
        for reading in batch['readings']:
            print(f"  - {reading['sensor_id']}: {reading['value']} {reading['unit']} @ {reading['location']}")

        if self.send_batch(batch):
            print("\n✅ Successfully sent sensor data!")
        else:
            print("\n❌ Failed to send sensor data")
            sys.exit(1)

    def run_continuous(self, interval: int = DEFAULT_INTERVAL):
        """Run continuously, sending readings at specified interval"""
        print(f"\n📡 Device Simulator - Continuous mode (interval: {interval}s)")
        print(f"   Backend: {self.backend_url}")
        print("=" * 60)
        print("Press Ctrl+C to stop\n")

        if not self.test_connection():
            sys.exit(1)

        try:
            count = 0
            while True:
                count += 1
                print(f"\n[{count}] Generating and sending sensor readings...")
                batch = self.generate_batch()
                
                if self.send_batch(batch):
                    print(f"   Next reading in {interval} seconds...")
                else:
                    print(f"   Retrying in {interval} seconds...")
                
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n\n🛑 Stopped by user")
            sys.exit(0)


def main():
    parser = argparse.ArgumentParser(
        description="Home Inspection Device Simulator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Send one batch
  python device_simulator.py

  # Run continuously
  python device_simulator.py --continuous

  # Custom interval and backend
  python device_simulator.py --continuous --interval 10 --backend http://localhost:8000
        """
    )
    parser.add_argument(
        "--continuous",
        action="store_true",
        help="Run continuously, sending readings at regular intervals"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=DEFAULT_INTERVAL,
        help=f"Interval between readings in seconds (default: {DEFAULT_INTERVAL})"
    )
    parser.add_argument(
        "--backend",
        type=str,
        default=DEFAULT_BACKEND_URL,
        help=f"Backend API URL (default: {DEFAULT_BACKEND_URL})"
    )

    args = parser.parse_args()

    simulator = DeviceSimulator(backend_url=args.backend)

    if args.continuous:
        simulator.run_continuous(interval=args.interval)
    else:
        simulator.run_once()


if __name__ == "__main__":
    main()













