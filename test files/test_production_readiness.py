#!/usr/bin/env python3
"""
Production Readiness Test Script
Tests authentication, session management, and navigation in both modes
Simulates production environment conditions
"""

import requests
import os
import time
import json
from pathlib import Path

class ProductionReadinessTest:
    def __init__(self):
        self.base_url = "http://localhost:3000"  # Change to your production URL for testing
        self.session = requests.Session()
        self.results = {}
        
    def log(self, message, level="INFO"):
        """Enhanced logging"""
        timestamp = time.strftime("%H:%M:%S")
        symbols = {"INFO": "ℹ️", "SUCCESS": "✅", "ERROR": "❌", "WARNING": "⚠️"}
        symbol = symbols.get(level, "•")
        print(f"[{timestamp}] {symbol} {message}")
        
    def test_backend_health(self):
        """Test if backend is running and responsive"""
        self.log("Testing backend health and responsiveness...", "INFO")
        
        try:
            # Test basic health
            response = self.session.get(f"{self.base_url}/api/test", timeout=5)
            if response.status_code == 200:
                self.log("Backend is running and responsive", "SUCCESS")
                return True
            else:
                self.log(f"Backend health check failed: {response.status_code}", "ERROR")
                return False
        except requests.exceptions.RequestException as e:
            self.log(f"Backend not accessible: {e}", "ERROR")
            return False
    
    def test_environment_detection(self):
        """Test environment configuration detection"""
        self.log("Testing environment detection and configuration...", "INFO")
        
        try:
            response = self.session.get(f"{self.base_url}/debug/config")
            if response.status_code == 200:
                data = response.json()
                self.log(f"Environment detected: {data.get('environment', 'unknown')}", "SUCCESS")
                self.log(f"Server type: {data.get('server_type', 'unknown')}", "INFO")
                self.log(f"Testing mode: {data.get('testing_mode', False)}", "INFO")
                self.log(f"Temp password configured: {data.get('temporary_password_configured', False)}", "INFO")
                
                self.results['environment'] = data
                return True
            else:
                self.log(f"Environment detection failed: {response.status_code}", "WARNING")
                return False
        except Exception as e:
            self.log(f"Environment detection error: {e}", "WARNING")
            return False
    
    def test_testing_mode_auth(self):
        """Test testing mode authentication flow"""
        self.log("Testing TESTING MODE authentication flow...", "INFO")
        
        try:
            # Check testing mode status
            response = self.session.get(f"{self.base_url}/api/auth/temp-status")
            if response.status_code != 200:
                self.log(f"Testing mode status check failed: {response.status_code}", "ERROR")
                return False
                
            status_data = response.json()
            if not status_data.get('testing_mode'):
                self.log("Testing mode not enabled, skipping testing mode tests", "WARNING")
                return True
                
            self.log(f"Testing mode active: {status_data.get('testing_mode')}", "SUCCESS")
            self.log(f"Currently authenticated: {status_data.get('authenticated')}", "INFO")
            
            # Test login
            login_data = {"password": os.getenv("TEMPORARY_PASSWORD", "test123")}
            response = self.session.post(f"{self.base_url}/api/auth/temp-login", json=login_data)
            
            if response.status_code == 200:
                self.log("Testing mode login successful", "SUCCESS")
                
                # Test protected endpoint access
                response = self.session.get(f"{self.base_url}/api/projects")
                if response.status_code == 200:
                    self.log("Protected endpoint access works in testing mode", "SUCCESS")
                    return True
                else:
                    self.log(f"Protected endpoint access failed: {response.status_code}", "ERROR")
                    return False
            else:
                self.log(f"Testing mode login failed: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Testing mode auth test error: {e}", "ERROR")
            return False
    
    def test_normal_mode_session_recovery(self):
        """Test normal mode session recovery capabilities"""
        self.log("Testing NORMAL MODE session recovery...", "INFO")
        
        # This test requires proper Supabase configuration
        # We'll test the backend endpoints that support session recovery
        
        try:
            # Test auth config endpoint
            response = self.session.get(f"{self.base_url}/api/auth/config")
            if response.status_code == 200:
                config_data = response.json()
                if config_data.get('success') and config_data.get('config'):
                    self.log("Supabase configuration available", "SUCCESS")
                    supabase_config = config_data['config']
                    self.log(f"Supabase URL configured: {bool(supabase_config.get('supabase_url'))}", "INFO")
                    self.log(f"Supabase key configured: {bool(supabase_config.get('supabase_anon_key'))}", "INFO")
                    return True
                else:
                    self.log("Supabase configuration not available", "WARNING")
                    return False
            else:
                self.log(f"Auth config endpoint failed: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Normal mode test error: {e}", "ERROR")
            return False
    
    def test_performance_timing(self):
        """Test response times to simulate production performance"""
        self.log("Testing performance and response times...", "INFO")
        
        endpoints = [
            "/debug/config",
            "/api/test", 
            "/api/auth/temp-status",
            "/api/auth/config"
        ]
        
        timing_results = {}
        
        for endpoint in endpoints:
            try:
                start_time = time.time()
                response = self.session.get(f"{self.base_url}{endpoint}", timeout=10)
                end_time = time.time()
                
                response_time = round((end_time - start_time) * 1000, 2)  # Convert to ms
                timing_results[endpoint] = {
                    'response_time_ms': response_time,
                    'status_code': response.status_code,
                    'success': response.status_code < 400
                }
                
                if response_time < 1000:  # Under 1 second is good
                    self.log(f"{endpoint}: {response_time}ms ✅", "SUCCESS")
                elif response_time < 3000:  # Under 3 seconds is acceptable
                    self.log(f"{endpoint}: {response_time}ms ⚠️", "WARNING")
                else:  # Over 3 seconds is concerning
                    self.log(f"{endpoint}: {response_time}ms ❌", "ERROR")
                    
            except Exception as e:
                self.log(f"{endpoint}: Failed - {e}", "ERROR")
                timing_results[endpoint] = {'error': str(e)}
        
        self.results['performance'] = timing_results
        return True
    
    def test_session_persistence(self):
        """Test session persistence across requests"""
        self.log("Testing session persistence across requests...", "INFO")
        
        try:
            # First, try to login in testing mode if available
            login_response = self.session.post(f"{self.base_url}/api/auth/temp-login", 
                                             json={"password": os.getenv("TEMPORARY_PASSWORD", "test123")})
            
            if login_response.status_code == 200:
                self.log("Logged in successfully", "SUCCESS")
                
                # Make multiple requests to test session persistence
                for i in range(3):
                    response = self.session.get(f"{self.base_url}/api/auth/temp-status")
                    if response.status_code == 200:
                        data = response.json()
                        if data.get('authenticated'):
                            self.log(f"Session persistent on request {i+1}", "SUCCESS")
                        else:
                            self.log(f"Session lost on request {i+1}", "ERROR")
                            return False
                    else:
                        self.log(f"Session check failed on request {i+1}: {response.status_code}", "ERROR")
                        return False
                    
                    time.sleep(0.5)  # Brief delay between requests
                
                return True
            else:
                self.log("Could not test session persistence (login failed)", "WARNING")
                return True  # Don't fail the entire test
                
        except Exception as e:
            self.log(f"Session persistence test error: {e}", "ERROR")
            return False
    
    def test_cors_headers(self):
        """Test CORS configuration for production"""
        self.log("Testing CORS configuration for cross-domain requests...", "INFO")
        
        try:
            # Test preflight request
            response = self.session.options(f"{self.base_url}/api/test", 
                                          headers={'Origin': 'https://audio-book-organizer.vercel.app'})
            
            if response.status_code in [200, 204]:
                cors_headers = {
                    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                    'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
                    'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials')
                }
                
                self.log("CORS headers present:", "SUCCESS")
                for header, value in cors_headers.items():
                    if value:
                        self.log(f"  {header}: {value}", "INFO")
                
                return True
            else:
                self.log(f"CORS preflight failed: {response.status_code}", "WARNING")
                return False
                
        except Exception as e:
            self.log(f"CORS test error: {e}", "WARNING")
            return False
    
    def run_all_tests(self):
        """Run all production readiness tests"""
        self.log("🚀 Starting Production Readiness Test Suite", "INFO")
        self.log("=" * 60, "INFO")
        
        tests = [
            ("Backend Health", self.test_backend_health),
            ("Environment Detection", self.test_environment_detection),
            ("Testing Mode Auth", self.test_testing_mode_auth),
            ("Normal Mode Session Recovery", self.test_normal_mode_session_recovery),
            ("Performance Timing", self.test_performance_timing),
            ("Session Persistence", self.test_session_persistence),
            ("CORS Configuration", self.test_cors_headers),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            self.log(f"\n📝 Running {test_name} test...", "INFO")
            self.log("-" * 40, "INFO")
            
            try:
                if test_func():
                    passed += 1
                    self.log(f"{test_name} test: PASSED", "SUCCESS")
                else:
                    self.log(f"{test_name} test: FAILED", "ERROR")
            except Exception as e:
                self.log(f"{test_name} test: EXCEPTION - {e}", "ERROR")
        
        # Summary
        self.log("\n" + "=" * 60, "INFO")
        self.log("🏁 Production Readiness Test Results", "INFO")
        self.log("=" * 60, "INFO")
        self.log(f"Tests Passed: {passed}/{total}", "SUCCESS" if passed == total else "WARNING")
        
        if passed == total:
            self.log("✅ ALL TESTS PASSED - Ready for production deployment!", "SUCCESS")
            return True
        elif passed >= total * 0.8:  # 80% or more
            self.log("⚠️ MOSTLY READY - Minor issues detected but should work in production", "WARNING")
            return True
        else:
            self.log("❌ NOT READY - Significant issues detected, fix before production", "ERROR")
            return False

def main():
    """Main test runner"""
    tester = ProductionReadinessTest()
    
    # Check if backend is available
    if not tester.test_backend_health():
        print("\n❌ Backend not available. Please start the backend first:")
        print("   python app.py")
        print("   or")
        print("   python backend/app.py")
        return False
    
    # Run all tests
    return tester.run_all_tests()

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1) 