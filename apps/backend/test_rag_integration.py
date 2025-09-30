#!/usr/bin/env python3
"""
RAG Integration Tests for Home Inspection System
Tests sensor data integration with RAG system for AI scenarios
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import SessionLocal
from models.sensor import Sensor
from models.reading import Reading
from utils.context_injection import build_sensor_context


class RAGIntegrationTest:
    """Test RAG integration with sensor data"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
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
    
    def setup_roofing_scenario(self) -> bool:
        """Setup sensor data for roofing inspection scenario"""
        try:
            # Create roofing-specific sensor data
            roofing_data = {
                "sensors": [
                    {
                        "sensor_id": "roof_moisture_001",
                        "vendor": "RoofTech",
                        "model": "MoisturePro-Roof",
                        "type": "moisture_meter"
                    },
                    {
                        "sensor_id": "roof_thermal_001",
                        "vendor": "ThermoTech",
                        "model": "ThermalSpot-Roof",
                        "type": "thermal_spot"
                    }
                ],
                "readings": [
                    # High moisture in attic (problem)
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
                    # Thermal anomaly (potential leak)
                    {
                        "sensor_id": "roof_thermal_001",
                        "type": "temperature",
                        "location": "attic_ceiling_south",
                        "value": 52.3,
                        "unit": "°C",
                        "confidence": 0.89,
                        "calibration_json": {"emissivity": 0.95},
                        "extras_json": {"ambient": 22.1, "distance": 1.2},
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    # Normal moisture (baseline)
                    {
                        "sensor_id": "roof_moisture_001",
                        "type": "moisture_level",
                        "location": "attic_ceiling_east",
                        "value": 35.2,
                        "unit": "%",
                        "confidence": 0.94,
                        "calibration_json": {"calibrated_at": "2024-01-15T10:00:00Z"},
                        "extras_json": {"battery": 95, "signal": 92},
                        "timestamp": (datetime.utcnow() - timedelta(minutes=30)).isoformat()
                    }
                ]
            }
            
            response = requests.post(f"{self.base_url}/sensor/data", json=roofing_data)
            if response.status_code == 200:
                self.log_test("Roofing Scenario Setup", True, "Roofing sensor data created successfully")
                return True
            else:
                self.log_test("Roofing Scenario Setup", False, f"Failed to create roofing data: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Roofing Scenario Setup", False, str(e))
            return False
    
    def setup_plumbing_scenario(self) -> bool:
        """Setup sensor data for plumbing inspection scenario"""
        try:
            # Create plumbing-specific sensor data
            plumbing_data = {
                "sensors": [
                    {
                        "sensor_id": "plumb_moisture_001",
                        "vendor": "PlumbTech",
                        "model": "MoisturePro-Plumb",
                        "type": "moisture_meter"
                    },
                    {
                        "sensor_id": "plumb_thermal_001",
                        "vendor": "ThermoTech",
                        "model": "ThermalSpot-Plumb",
                        "type": "thermal_spot"
                    }
                ],
                "readings": [
                    # High moisture near pipes (leak detection)
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
                    # Thermal anomaly (hot water leak)
                    {
                        "sensor_id": "plumb_thermal_001",
                        "type": "temperature",
                        "location": "basement_hot_water_pipe",
                        "value": 48.7,
                        "unit": "°C",
                        "confidence": 0.87,
                        "calibration_json": {"emissivity": 0.95},
                        "extras_json": {"ambient": 18.5, "distance": 0.8},
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    # Normal moisture (baseline)
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
            
            response = requests.post(f"{self.base_url}/sensor/data", json=plumbing_data)
            if response.status_code == 200:
                self.log_test("Plumbing Scenario Setup", True, "Plumbing sensor data created successfully")
                return True
            else:
                self.log_test("Plumbing Scenario Setup", False, f"Failed to create plumbing data: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Plumbing Scenario Setup", False, str(e))
            return False
    
    def test_sensor_context_generation(self) -> bool:
        """Test sensor context generation for RAG integration"""
        try:
            # Test context generation for roofing scenario
            roofing_context = build_sensor_context("roofing", "attic", window_sec=3600)
            
            if roofing_context and len(roofing_context) > 0:
                # Check if context contains relevant data
                has_moisture_data = any("moisture" in str(item).lower() for item in roofing_context)
                has_thermal_data = any("temperature" in str(item).lower() for item in roofing_context)
                
                if has_moisture_data and has_thermal_data:
                    self.log_test("Roofing Context Generation", True, f"Generated context with {len(roofing_context)} items")
                else:
                    self.log_test("Roofing Context Generation", False, "Context missing moisture or thermal data")
                    return False
            else:
                self.log_test("Roofing Context Generation", False, "No context generated for roofing scenario")
                return False
            
            # Test context generation for plumbing scenario
            plumbing_context = build_sensor_context("plumbing", "basement", window_sec=3600)
            
            if plumbing_context and len(plumbing_context) > 0:
                # Check if context contains relevant data
                has_moisture_data = any("moisture" in str(item).lower() for item in plumbing_context)
                has_thermal_data = any("temperature" in str(item).lower() for item in plumbing_context)
                
                if has_moisture_data and has_thermal_data:
                    self.log_test("Plumbing Context Generation", True, f"Generated context with {len(plumbing_context)} items")
                    return True
                else:
                    self.log_test("Plumbing Context Generation", False, "Context missing moisture or thermal data")
                    return False
            else:
                self.log_test("Plumbing Context Generation", False, "No context generated for plumbing scenario")
                return False
                
        except Exception as e:
            self.log_test("Sensor Context Generation", False, str(e))
            return False
    
    def test_rag_scenario_simulation(self) -> bool:
        """Test RAG scenario simulation with sensor data"""
        try:
            # Simulate RAG scenarios
            scenarios = [
                {
                    "name": "Roofing Inspection",
                    "component": "roofing",
                    "location_prefix": "attic",
                    "expected_issues": ["moisture", "thermal_anomaly"]
                },
                {
                    "name": "Plumbing Inspection", 
                    "component": "plumbing",
                    "location_prefix": "basement",
                    "expected_issues": ["moisture", "thermal_anomaly"]
                }
            ]
            
            for scenario in scenarios:
                # Get sensor context
                context = build_sensor_context(
                    scenario["component"], 
                    scenario["location_prefix"], 
                    window_sec=3600
                )
                
                if context:
                    # Simulate AI analysis
                    context_str = str(context)
                    
                    # Check for expected issues
                    has_moisture_issues = any("moisture" in item.lower() and float(item.split("value")[1].split(",")[0].split(":")[1].strip()) > 80 
                                           for item in context_str.split("}") if "moisture" in item.lower())
                    
                    has_thermal_issues = any("temperature" in item.lower() and float(item.split("value")[1].split(",")[0].split(":")[1].strip()) > 45 
                                          for item in context_str.split("}") if "temperature" in item.lower())
                    
                    if has_moisture_issues and has_thermal_issues:
                        self.log_test(f"{scenario['name']} RAG Simulation", True, 
                                   f"Detected moisture and thermal issues in {scenario['name']} scenario")
                    else:
                        self.log_test(f"{scenario['name']} RAG Simulation", False, 
                                   f"Failed to detect expected issues in {scenario['name']} scenario")
                        return False
                else:
                    self.log_test(f"{scenario['name']} RAG Simulation", False, 
                               f"No context available for {scenario['name']} scenario")
                    return False
            
            return True
            
        except Exception as e:
            self.log_test("RAG Scenario Simulation", False, str(e))
            return False
    
    def test_ai_recommendation_generation(self) -> bool:
        """Test AI recommendation generation based on sensor data"""
        try:
            # Get latest sensor data
            response = requests.get(f"{self.base_url}/sensor/latest", params={"limit": 20})
            if response.status_code != 200:
                self.log_test("AI Recommendation Generation", False, "Failed to retrieve sensor data")
                return False
            
            data = response.json()
            readings = data.get("readings", [])
            
            if not readings:
                self.log_test("AI Recommendation Generation", False, "No sensor data available")
                return False
            
            # Analyze readings for recommendations
            recommendations = []
            
            for reading in readings:
                location = reading.get("location", "")
                value = reading.get("value", 0)
                reading_type = reading.get("type", "")
                
                # Generate recommendations based on sensor data
                if "moisture" in reading_type.lower() and value > 80:
                    if "attic" in location.lower():
                        recommendations.append({
                            "issue": "High moisture in attic",
                            "recommendation": "Check for roof leaks, inspect insulation, improve ventilation",
                            "priority": "high",
                            "location": location,
                            "value": value
                        })
                    elif "basement" in location.lower():
                        recommendations.append({
                            "issue": "High moisture in basement",
                            "recommendation": "Check for plumbing leaks, improve drainage, inspect foundation",
                            "priority": "high", 
                            "location": location,
                            "value": value
                        })
                
                elif "temperature" in reading_type.lower() and value > 45:
                    recommendations.append({
                        "issue": "Thermal anomaly detected",
                        "recommendation": "Investigate heat source, check for electrical issues or water leaks",
                        "priority": "medium",
                        "location": location,
                        "value": value
                    })
            
            if recommendations:
                self.log_test("AI Recommendation Generation", True, 
                           f"Generated {len(recommendations)} recommendations based on sensor data")
                
                # Print sample recommendations
                for i, rec in enumerate(recommendations[:3], 1):
                    print(f"  {i}. {rec['issue']} ({rec['location']}: {rec['value']})")
                    print(f"     → {rec['recommendation']}")
                
                return True
            else:
                self.log_test("AI Recommendation Generation", False, "No recommendations generated")
                return False
                
        except Exception as e:
            self.log_test("AI Recommendation Generation", False, str(e))
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all RAG integration tests"""
        print("🤖 Starting RAG Integration Tests for Home Inspection System")
        print("=" * 60)
        
        # Setup test scenarios
        if not self.setup_roofing_scenario():
            print("❌ Failed to setup roofing scenario")
            return {"success": False}
        
        if not self.setup_plumbing_scenario():
            print("❌ Failed to setup plumbing scenario")
            return {"success": False}
        
        # Run tests
        tests = [
            self.test_sensor_context_generation,
            self.test_rag_scenario_simulation,
            self.test_ai_recommendation_generation
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
        print(f"📊 RAG Integration Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All RAG integration tests passed! System is ready for AI scenarios.")
        else:
            print("⚠️  Some RAG integration tests failed. Please check the logs above.")
        
        return {
            "success": passed == total,
            "total_tests": total,
            "passed_tests": passed,
            "failed_tests": total - passed,
            "success_rate": (passed / total) * 100,
            "test_results": self.test_results
        }


def main():
    """Main RAG integration test function"""
    # Check if backend is running
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        print("✅ Backend API is running")
    except:
        print("❌ Backend API is not running. Please start it first with:")
        print("   cd apps/backend && python main.py")
        return
    
    # Run RAG integration tests
    test_suite = RAGIntegrationTest()
    results = test_suite.run_all_tests()
    
    # Save results to file
    with open("rag_integration_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 RAG integration test results saved to: rag_integration_test_results.json")


if __name__ == "__main__":
    main()
