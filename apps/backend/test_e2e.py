#!/usr/bin/env python3
"""
End-to-end tests for Home Inspection System
Tests the complete data flow from sensor data to frontend display
"""

import os
import sys
import json
import time
import requests
import websocket
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import SessionLocal, engine
from database.base import Base
from models.sensor import Sensor
from models.reading import Reading


class E2ETestSuite:
    """End-to-end test suite for the Home Inspection System"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.ws_url = base_url.replace("http", "ws") + "/sensor/stream"
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def test_database_connection(self) -> bool:
        """Test database connection and table creation"""
        try:
            db = SessionLocal()
            # Test query
            sensors = db.query(Sensor).all()
            db.close()
            self.log_test("Database Connection", True, f"Found {len(sensors)} sensors")
            return True
        except Exception as e:
            self.log_test("Database Connection", False, str(e))
            return False
    
    def test_api_health(self) -> bool:
        """Test API health endpoint"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=5)
            if response.status_code == 200:
                self.log_test("API Health", True, "API is responding")
                return True
            else:
                self.log_test("API Health", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Health", False, str(e))
            return False
    
    def test_sensor_data_submission(self) -> bool:
        """Test submitting sensor data via API"""
        try:
            # Test data for moisture sensor
            test_data = {
                "sensors": [
                    {
                        "sensor_id": "test_moist_001",
                        "vendor": "TestVendor",
                        "model": "TestModel",
                        "type": "moisture_meter"
                    }
                ],
                "readings": [
                    {
                        "sensor_id": "test_moist_001",
                        "type": "moisture_level",
                        "location": "test_basement",
                        "value": 75.5,
                        "unit": "%",
                        "confidence": 0.95,
                        "calibration_json": {"test": True},
                        "extras_json": {"battery": 90},
                        "timestamp": datetime.utcnow().isoformat()
                    }
                ]
            }
            
            response = requests.post(
                f"{self.base_url}/sensor/data",
                json=test_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                self.log_test("Sensor Data Submission", True, f"Created {len(result.get('readings', []))} readings")
                return True
            else:
                self.log_test("Sensor Data Submission", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Sensor Data Submission", False, str(e))
            return False
    
    def test_sensor_data_retrieval(self) -> bool:
        """Test retrieving sensor data via API"""
        try:
            # Test getting latest readings
            response = requests.get(
                f"{self.base_url}/sensor/latest",
                params={"limit": 10},
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                readings = data.get("readings", [])
                self.log_test("Sensor Data Retrieval", True, f"Retrieved {len(readings)} readings")
                return True
            else:
                self.log_test("Sensor Data Retrieval", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Sensor Data Retrieval", False, str(e))
            return False
    
    def test_websocket_connection(self) -> bool:
        """Test WebSocket connection"""
        try:
            ws_connected = False
            ws_message_received = False
            
            def on_message(ws, message):
                nonlocal ws_message_received
                ws_message_received = True
                print(f"📡 WebSocket message received: {message}")
            
            def on_error(ws, error):
                print(f"❌ WebSocket error: {error}")
            
            def on_close(ws, close_status_code, close_msg):
                print("🔌 WebSocket connection closed")
            
            def on_open(ws):
                nonlocal ws_connected
                ws_connected = True
                print("🔌 WebSocket connection opened")
            
            # Create WebSocket connection
            ws = websocket.WebSocketApp(
                self.ws_url,
                on_open=on_open,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close
            )
            
            # Start WebSocket in a thread
            ws_thread = threading.Thread(target=ws.run_forever)
            ws_thread.daemon = True
            ws_thread.start()
            
            # Wait for connection
            time.sleep(2)
            
            if ws_connected:
                self.log_test("WebSocket Connection", True, "WebSocket connected successfully")
                
                # Send test data to trigger WebSocket broadcast
                test_data = {
                    "sensors": [
                        {
                            "sensor_id": "ws_test_001",
                            "vendor": "WebSocketTest",
                            "model": "WSTest",
                            "type": "temperature"
                        }
                    ],
                    "readings": [
                        {
                            "sensor_id": "ws_test_001",
                            "type": "temperature",
                            "location": "websocket_test",
                            "value": 22.5,
                            "unit": "°C",
                            "confidence": 0.98,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    ]
                }
                
                # Submit data that should trigger WebSocket broadcast
                requests.post(f"{self.base_url}/sensor/data", json=test_data)
                
                # Wait for message
                time.sleep(3)
                
                if ws_message_received:
                    self.log_test("WebSocket Broadcast", True, "WebSocket message received")
                else:
                    self.log_test("WebSocket Broadcast", False, "No WebSocket message received")
                
                ws.close()
                return True
            else:
                self.log_test("WebSocket Connection", False, "Failed to connect to WebSocket")
                return False
                
        except Exception as e:
            self.log_test("WebSocket Connection", False, str(e))
            return False
    
    def test_sensor_context_integration(self) -> bool:
        """Test sensor context integration for RAG scenarios"""
        try:
            # Create test readings for different scenarios
            test_scenarios = [
                {
                    "sensor_id": "roofing_test_001",
                    "type": "moisture_level",
                    "location": "attic_ceiling",
                    "value": 85.0,
                    "unit": "%",
                    "confidence": 0.9,
                    "timestamp": datetime.utcnow().isoformat()
                },
                {
                    "sensor_id": "plumbing_test_001", 
                    "type": "temperature",
                    "location": "basement_pipe",
                    "value": 45.0,
                    "unit": "°C",
                    "confidence": 0.85,
                    "timestamp": datetime.utcnow().isoformat()
                }
            ]
            
            # Submit test data
            for scenario in test_scenarios:
                test_data = {
                    "sensors": [
                        {
                            "sensor_id": scenario["sensor_id"],
                            "vendor": "ContextTest",
                            "model": "ContextModel",
                            "type": scenario["type"].split("_")[0]
                        }
                    ],
                    "readings": [scenario]
                }
                
                response = requests.post(f"{self.base_url}/sensor/data", json=test_data)
                if response.status_code != 200:
                    self.log_test("Sensor Context Integration", False, f"Failed to submit scenario data: {response.text}")
                    return False
            
            # Test context retrieval
            response = requests.get(f"{self.base_url}/sensor/latest", params={"limit": 5})
            if response.status_code == 200:
                data = response.json()
                readings = data.get("readings", [])
                
                # Check if we have readings that would be useful for RAG context
                has_roofing_context = any(r.get("location") == "attic_ceiling" for r in readings)
                has_plumbing_context = any(r.get("location") == "basement_pipe" for r in readings)
                
                if has_roofing_context and has_plumbing_context:
                    self.log_test("Sensor Context Integration", True, "RAG context data available for Roofing and Plumbing scenarios")
                    return True
                else:
                    self.log_test("Sensor Context Integration", False, "Missing context data for RAG scenarios")
                    return False
            else:
                self.log_test("Sensor Context Integration", False, f"Failed to retrieve context data: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Sensor Context Integration", False, str(e))
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all E2E tests"""
        print("🧪 Starting End-to-End Tests for Home Inspection System")
        print("=" * 60)
        
        # Run all tests
        tests = [
            self.test_database_connection,
            self.test_api_health,
            self.test_sensor_data_submission,
            self.test_sensor_data_retrieval,
            self.test_websocket_connection,
            self.test_sensor_context_integration
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! System is ready for production.")
        else:
            print("⚠️  Some tests failed. Please check the logs above.")
        
        return {
            "total_tests": total,
            "passed_tests": passed,
            "failed_tests": total - passed,
            "success_rate": (passed / total) * 100,
            "test_results": self.test_results
        }


def main():
    """Main E2E test function"""
    # Check if backend is running
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        print("✅ Backend API is running")
    except:
        print("❌ Backend API is not running. Please start it first with:")
        print("   cd apps/backend && python main.py")
        return
    
    # Run E2E tests
    test_suite = E2ETestSuite()
    results = test_suite.run_all_tests()
    
    # Save results to file
    with open("e2e_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Test results saved to: e2e_test_results.json")


if __name__ == "__main__":
    main()
