#!/usr/bin/env python3
"""
AudioBook Organizer - Credit System Test
Test script to verify credit system functionality before going live
"""

import os
import sys
import requests
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the backend to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.services.supabase_service import SupabaseService

class CreditSystemTester:
    def __init__(self):
        self.base_url = "http://localhost:5000"
        
        # Initialize Supabase service with environment variables
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_ANON_KEY')
        jwt_secret = os.getenv('JWT_SECRET_KEY')
        
        if supabase_url and supabase_key and jwt_secret:
            self.supabase_service = SupabaseService(supabase_url, supabase_key, jwt_secret)
        else:
            self.supabase_service = None
            
        self.test_user_id = "test_user_123"
        self.auth_token = None
        
    def log(self, message, status="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        status_emoji = {
            "INFO": "ℹ️",
            "SUCCESS": "✅", 
            "ERROR": "❌",
            "WARNING": "⚠️"
        }
        print(f"[{timestamp}] {status_emoji.get(status, 'ℹ️')} {message}")
    
    def test_database_connection(self):
        """Test if Supabase connection is working"""
        self.log("Testing database connection...")
        
        try:
            if self.supabase_service is None:
                self.log("Supabase service not initialized (missing env vars)", "WARNING")
                self.log("Credit system will work in testing mode only", "WARNING")
                return False
            elif self.supabase_service.is_configured():
                self.log("Supabase is configured", "SUCCESS")
                return True
            else:
                self.log("Supabase is not configured properly", "WARNING")
                self.log("Credit system will work in testing mode only", "WARNING")
                return False
        except Exception as e:
            self.log(f"Database connection failed: {e}", "ERROR")
            return False
    
    def test_credit_operations(self):
        """Test basic credit operations"""
        self.log("Testing credit operations...")
        
        try:
            if self.supabase_service is None:
                self.log("Skipping credit operations (Supabase not initialized)", "WARNING")
                return True
                
            # Test getting credits for non-existent user
            credits = self.supabase_service.get_user_credits("non_existent")
            self.log(f"Non-existent user credits: {credits}", "INFO")
            
            # Test initializing credits
            if self.supabase_service.is_configured():
                success = self.supabase_service.initialize_user_credits(self.test_user_id, 100)
                if success:
                    self.log("Credit initialization successful", "SUCCESS")
                else:
                    self.log("Credit initialization failed", "ERROR")
                
                # Test getting credits
                credits = self.supabase_service.get_user_credits(self.test_user_id)
                self.log(f"Test user credits: {credits}", "INFO")
                
                # Test updating credits
                update_success = self.supabase_service.update_user_credits(self.test_user_id, -10)
                if update_success:
                    new_credits = self.supabase_service.get_user_credits(self.test_user_id)
                    self.log(f"Credits after -10: {new_credits}", "SUCCESS")
                else:
                    self.log("Credit update failed", "ERROR")
                
                # Test usage logging
                log_success = self.supabase_service.log_usage(
                    self.test_user_id, 
                    "test_action", 
                    10, 
                    {"test": True}
                )
                if log_success:
                    self.log("Usage logging successful", "SUCCESS")
                else:
                    self.log("Usage logging failed", "ERROR")
            else:
                self.log("Skipping database operations (not configured)", "WARNING")
                
            return True
            
        except Exception as e:
            self.log(f"Credit operations test failed: {e}", "ERROR")
            return False
    
    def test_backend_endpoints(self):
        """Test backend credit endpoints"""
        self.log("Testing backend credit endpoints...")
        
        try:
            # Test if backend is running
            try:
                response = requests.get(f"{self.base_url}/health", timeout=5)
                if response.status_code == 200:
                    self.log("Backend is running", "SUCCESS")
                else:
                    self.log(f"Backend returned status {response.status_code}", "WARNING")
            except requests.exceptions.RequestException:
                self.log("Backend is not running", "WARNING")
                self.log("Start backend with: python app.py", "INFO")
                return False
            
            # Test credit endpoint (this might fail without auth, that's OK)
            try:
                response = requests.get(f"{self.base_url}/api/auth/credits")
                if response.status_code == 401:
                    self.log("Credit endpoint requires auth (expected)", "SUCCESS")
                elif response.status_code == 200:
                    self.log("Credit endpoint accessible", "SUCCESS")
                else:
                    self.log(f"Credit endpoint returned {response.status_code}", "INFO")
            except requests.exceptions.RequestException as e:
                self.log(f"Credit endpoint test failed: {e}", "ERROR")
            
            return True
            
        except Exception as e:
            self.log(f"Backend endpoint test failed: {e}", "ERROR")
            return False
    
    def test_middleware_decorators(self):
        """Test credit middleware decorators"""
        self.log("Testing middleware decorators...")
        
        try:
            from backend.middleware.auth_middleware import require_credits, consume_credits
            
            # Test that decorators exist and are callable
            if callable(require_credits) and callable(consume_credits):
                self.log("Credit decorators are available", "SUCCESS")
            else:
                self.log("Credit decorators not found", "ERROR")
                return False
            
            # Test decorator creation
            test_decorator = require_credits(10)
            if callable(test_decorator):
                self.log("Credit decorator creation successful", "SUCCESS")
            else:
                self.log("Credit decorator creation failed", "ERROR")
                
            return True
            
        except ImportError as e:
            self.log(f"Failed to import decorators: {e}", "ERROR")
            return False
        except Exception as e:
            self.log(f"Decorator test failed: {e}", "ERROR")
            return False
    
    def generate_test_report(self):
        """Generate a summary test report"""
        self.log("=" * 50, "INFO")
        self.log("CREDIT SYSTEM TEST REPORT", "INFO")
        self.log("=" * 50, "INFO")
        
        tests = [
            ("Database Connection", self.test_database_connection),
            ("Credit Operations", self.test_credit_operations),
            ("Backend Endpoints", self.test_backend_endpoints),
            ("Middleware Decorators", self.test_middleware_decorators)
        ]
        
        results = []
        for test_name, test_func in tests:
            self.log(f"\nRunning {test_name} test...")
            try:
                result = test_func()
                results.append((test_name, result))
                status = "PASSED" if result else "FAILED"
                self.log(f"{test_name}: {status}", "SUCCESS" if result else "ERROR")
            except Exception as e:
                results.append((test_name, False))
                self.log(f"{test_name}: FAILED - {e}", "ERROR")
        
        # Summary
        self.log("\n" + "=" * 50, "INFO")
        self.log("TEST SUMMARY", "INFO")
        self.log("=" * 50, "INFO")
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        
        for test_name, result in results:
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name}: {status}", "SUCCESS" if result else "ERROR")
        
        self.log(f"\nOverall: {passed}/{total} tests passed", 
                "SUCCESS" if passed == total else "WARNING")
        
        if passed == total:
            self.log("🎉 Credit system is ready for testing!", "SUCCESS")
        else:
            self.log("⚠️ Some tests failed. Review the issues above.", "WARNING")
        
        return passed == total

def main():
    """Run the credit system tests"""
    print("🚀 AudioBook Organizer - Credit System Tester")
    print("=" * 60)
    
    tester = CreditSystemTester()
    success = tester.generate_test_report()
    
    if success:
        print("\n💡 NEXT STEPS:")
        print("1. Start your backend: python app.py")
        print("2. Open your frontend and test DOCX uploads")
        print("3. Check credit consumption in your database")
        print("4. Test the credit display in the UI")
        print("\n✨ When ready, integrate payment system later!")
    else:
        print("\n🔧 PLEASE FIX:")
        print("1. Check your .env file has Supabase credentials")
        print("2. Ensure your database schema is up to date")
        print("3. Verify backend dependencies are installed")
    
    return success

if __name__ == "__main__":
    main() 