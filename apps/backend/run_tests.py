#!/usr/bin/env python3
"""
Comprehensive test runner for Home Inspection System
Runs all tests including seed data, E2E tests, and RAG integration tests
"""

import os
import sys
import subprocess
import json
import time
from datetime import datetime
from typing import Dict, Any

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


class TestRunner:
    """Comprehensive test runner for the Home Inspection System"""
    
    def __init__(self):
        self.results = {
            "timestamp": datetime.utcnow().isoformat(),
            "tests": {}
        }
    
    def log_step(self, step: str, success: bool, message: str = ""):
        """Log test step result"""
        status = "✅" if success else "❌"
        print(f"{status} {step}: {message}")
        return success
    
    def check_dependencies(self) -> bool:
        """Check if all required dependencies are installed"""
        try:
            import requests
            import websocket
            import sqlalchemy
            import fastapi
            import uvicorn
            self.log_step("Dependencies Check", True, "All required packages are installed")
            return True
        except ImportError as e:
            self.log_step("Dependencies Check", False, f"Missing dependency: {e}")
            return False
    
    def run_seed_data(self) -> bool:
        """Run seed data script"""
        try:
            print("\n🌱 Running seed data script...")
            result = subprocess.run([sys.executable, "seed_data.py"], 
                                  capture_output=True, text=True, cwd=os.path.dirname(__file__))
            
            if result.returncode == 0:
                self.log_step("Seed Data", True, "Seed data created successfully")
                print(result.stdout)
                return True
            else:
                self.log_step("Seed Data", False, f"Seed data failed: {result.stderr}")
                return False
        except Exception as e:
            self.log_step("Seed Data", False, str(e))
            return False
    
    def start_backend_server(self) -> bool:
        """Start backend server for testing"""
        try:
            print("\n🚀 Starting backend server...")
            # Check if server is already running
            import requests
            try:
                response = requests.get("http://localhost:8000/", timeout=2)
                self.log_step("Backend Server", True, "Backend server is already running")
                return True
            except:
                pass
            
            # Start server in background
            self.server_process = subprocess.Popen(
                [sys.executable, "main.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=os.path.dirname(__file__)
            )
            
            # Wait for server to start
            for i in range(30):  # Wait up to 30 seconds
                try:
                    response = requests.get("http://localhost:8000/", timeout=1)
                    if response.status_code == 200:
                        self.log_step("Backend Server", True, "Backend server started successfully")
                        return True
                except:
                    time.sleep(1)
            
            self.log_step("Backend Server", False, "Failed to start backend server")
            return False
            
        except Exception as e:
            self.log_step("Backend Server", False, str(e))
            return False
    
    def run_e2e_tests(self) -> bool:
        """Run end-to-end tests"""
        try:
            print("\n🧪 Running E2E tests...")
            result = subprocess.run([sys.executable, "test_e2e.py"], 
                                  capture_output=True, text=True, cwd=os.path.dirname(__file__))
            
            if result.returncode == 0:
                self.log_step("E2E Tests", True, "E2E tests completed successfully")
                print(result.stdout)
                
                # Parse test results if available
                if os.path.exists("e2e_test_results.json"):
                    with open("e2e_test_results.json", "r") as f:
                        e2e_results = json.load(f)
                        self.results["tests"]["e2e"] = e2e_results
                
                return True
            else:
                self.log_step("E2E Tests", False, f"E2E tests failed: {result.stderr}")
                print(result.stdout)
                return False
        except Exception as e:
            self.log_step("E2E Tests", False, str(e))
            return False
    
    def run_rag_integration_tests(self) -> bool:
        """Run RAG integration tests"""
        try:
            print("\n🤖 Running RAG integration tests...")
            result = subprocess.run([sys.executable, "test_rag_integration.py"], 
                                  capture_output=True, text=True, cwd=os.path.dirname(__file__))
            
            if result.returncode == 0:
                self.log_step("RAG Integration Tests", True, "RAG integration tests completed successfully")
                print(result.stdout)
                
                # Parse test results if available
                if os.path.exists("rag_integration_test_results.json"):
                    with open("rag_integration_test_results.json", "r") as f:
                        rag_results = json.load(f)
                        self.results["tests"]["rag_integration"] = rag_results
                
                return True
            else:
                self.log_step("RAG Integration Tests", False, f"RAG integration tests failed: {result.stderr}")
                print(result.stdout)
                return False
        except Exception as e:
            self.log_step("RAG Integration Tests", False, str(e))
            return False
    
    def run_frontend_tests(self) -> bool:
        """Run frontend tests (if available)"""
        try:
            frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
            if not os.path.exists(frontend_dir):
                self.log_step("Frontend Tests", True, "Frontend tests skipped (no frontend directory)")
                return True
            
            print("\n🎨 Running frontend tests...")
            
            # Check if frontend dependencies are installed
            if os.path.exists(os.path.join(frontend_dir, "package.json")):
                # Try to run frontend tests
                result = subprocess.run(["npm", "test"], 
                                      capture_output=True, text=True, cwd=frontend_dir)
                
                if result.returncode == 0:
                    self.log_step("Frontend Tests", True, "Frontend tests completed successfully")
                    return True
                else:
                    self.log_step("Frontend Tests", False, f"Frontend tests failed: {result.stderr}")
                    return False
            else:
                self.log_step("Frontend Tests", True, "Frontend tests skipped (no package.json)")
                return True
                
        except Exception as e:
            self.log_step("Frontend Tests", False, str(e))
            return False
    
    def cleanup(self):
        """Cleanup after tests"""
        try:
            if hasattr(self, 'server_process'):
                self.server_process.terminate()
                self.server_process.wait(timeout=5)
        except:
            pass
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all tests in sequence"""
        print("🧪 Starting Comprehensive Test Suite for Home Inspection System")
        print("=" * 70)
        
        # Track overall success
        overall_success = True
        
        # 1. Check dependencies
        if not self.check_dependencies():
            overall_success = False
        
        # 2. Run seed data
        if not self.run_seed_data():
            overall_success = False
        
        # 3. Start backend server
        if not self.start_backend_server():
            overall_success = False
            return self.results
        
        try:
            # 4. Run E2E tests
            if not self.run_e2e_tests():
                overall_success = False
            
            # 5. Run RAG integration tests
            if not self.run_rag_integration_tests():
                overall_success = False
            
            # 6. Run frontend tests
            if not self.run_frontend_tests():
                overall_success = False
        
        finally:
            # Cleanup
            self.cleanup()
        
        # Final summary
        print("\n" + "=" * 70)
        if overall_success:
            print("🎉 All tests passed! Home Inspection System is ready for production.")
        else:
            print("⚠️  Some tests failed. Please check the logs above for details.")
        
        self.results["overall_success"] = overall_success
        self.results["timestamp"] = datetime.utcnow().isoformat()
        
        # Save results
        with open("comprehensive_test_results.json", "w") as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Comprehensive test results saved to: comprehensive_test_results.json")
        
        return self.results


def main():
    """Main test runner function"""
    test_runner = TestRunner()
    results = test_runner.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if results["overall_success"] else 1)


if __name__ == "__main__":
    main()
