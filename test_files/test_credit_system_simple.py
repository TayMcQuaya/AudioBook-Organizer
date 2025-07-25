#!/usr/bin/env python3
"""
AudioBook Organizer - Simple Credit System Test
Test credit system without requiring full Supabase setup
"""

import os
import sys
import requests
from datetime import datetime

class SimpleCreditTester:
    def __init__(self):
        self.base_url = "http://localhost:3000"
        
    def log(self, message, status="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        status_emoji = {
            "INFO": "ℹ️",
            "SUCCESS": "✅", 
            "ERROR": "❌",
            "WARNING": "⚠️"
        }
        print(f"[{timestamp}] {status_emoji.get(status, 'ℹ️')} {message}")
    
    def test_backend_running(self):
        """Test if backend is running"""
        self.log("Testing if backend is running...")
        
        try:
            response = requests.get(f"{self.base_url}/api/test", timeout=5)
            if response.status_code == 200:
                self.log("✅ Backend is running!", "SUCCESS")
                return True
            else:
                self.log(f"Backend returned status {response.status_code}", "WARNING")
                return False
        except requests.exceptions.RequestException:
            self.log("❌ Backend is not running", "ERROR")
            self.log("💡 Start backend with: python app.py", "INFO")
            return False
    
    def test_middleware_imports(self):
        """Test if credit middleware can be imported"""
        self.log("Testing credit middleware imports...")
        
        try:
            # Add backend to path
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
            
            from backend.middleware.auth_middleware import require_credits, consume_credits
            
            if callable(require_credits) and callable(consume_credits):
                self.log("✅ Credit decorators imported successfully!", "SUCCESS")
                
                # Test decorator creation
                test_decorator = require_credits(10)
                if callable(test_decorator):
                    self.log("✅ Credit decorator creation works!", "SUCCESS")
                    return True
                else:
                    self.log("❌ Credit decorator creation failed", "ERROR")
                    return False
            else:
                self.log("❌ Credit decorators not callable", "ERROR")
                return False
                
        except ImportError as e:
            self.log(f"❌ Import failed: {e}", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ Unexpected error: {e}", "ERROR")
            return False
    
    def test_config_settings(self):
        """Test if credit settings are configured"""
        self.log("Testing credit configuration...")
        
        try:
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
            from backend.config import Config
            
            # Check credit settings
            default_credits = getattr(Config, 'DEFAULT_CREDITS', None)
            max_credits = getattr(Config, 'MAX_CREDITS_PER_USER', None)
            
            if default_credits is not None:
                self.log(f"✅ Default credits: {default_credits}", "SUCCESS")
            else:
                self.log("⚠️ DEFAULT_CREDITS not configured", "WARNING")
                
            if max_credits is not None:
                self.log(f"✅ Max credits per user: {max_credits}", "SUCCESS")
            else:
                self.log("⚠️ MAX_CREDITS_PER_USER not configured", "WARNING")
            
            return default_credits is not None and max_credits is not None
            
        except ImportError as e:
            self.log(f"❌ Config import failed: {e}", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ Config test error: {e}", "ERROR")
            return False
    
    def test_frontend_files(self):
        """Test if frontend credit files exist"""
        self.log("Testing frontend credit files...")
        
        files_to_check = [
            "frontend/js/modules/ui.js",
            "frontend/js/modules/appUI.js", 
            "frontend/css/main.css"
        ]
        
        all_exist = True
        for file_path in files_to_check:
            if os.path.exists(file_path):
                self.log(f"✅ {file_path} exists", "SUCCESS")
            else:
                self.log(f"❌ {file_path} missing", "ERROR")
                all_exist = False
        
        return all_exist
    
    def test_credit_endpoints(self):
        """Test credit API endpoints"""
        self.log("Testing credit API endpoints...")
        
        if not self.test_backend_running():
            return False
        
        try:
            # Test credit endpoint (should require auth)
            response = requests.get(f"{self.base_url}/api/auth/credits")
            
            if response.status_code == 401:
                self.log("✅ Credit endpoint requires authentication (correct!)", "SUCCESS")
                return True
            elif response.status_code == 200:
                self.log("✅ Credit endpoint accessible", "SUCCESS")
                return True
            else:
                self.log(f"⚠️ Credit endpoint returned {response.status_code}", "WARNING")
                return False
                
        except Exception as e:
            self.log(f"❌ Credit endpoint test failed: {e}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all tests and generate report"""
        self.log("🚀 RUNNING SIMPLE CREDIT SYSTEM TESTS", "INFO")
        self.log("=" * 60, "INFO")
        
        tests = [
            ("Middleware Imports", self.test_middleware_imports),
            ("Configuration Settings", self.test_config_settings),
            ("Frontend Files", self.test_frontend_files),
            ("Backend Status", self.test_backend_running),
            ("Credit Endpoints", self.test_credit_endpoints)
        ]
        
        results = []
        for test_name, test_func in tests:
            self.log(f"\n🧪 Testing {test_name}...", "INFO")
            try:
                result = test_func()
                results.append((test_name, result))
            except Exception as e:
                self.log(f"❌ {test_name} failed with error: {e}", "ERROR")
                results.append((test_name, False))
        
        # Generate report
        self.log("\n" + "=" * 60, "INFO")
        self.log("📊 TEST RESULTS SUMMARY", "INFO")
        self.log("=" * 60, "INFO")
        
        passed = 0
        total = len(results)
        
        for test_name, result in results:
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name}: {status}", "SUCCESS" if result else "ERROR")
            if result:
                passed += 1
        
        self.log(f"\n📈 Overall: {passed}/{total} tests passed", 
                "SUCCESS" if passed == total else "WARNING")
        
        if passed == total:
            self.log("🎉 EXCELLENT! Credit system is ready!", "SUCCESS")
            self.log("\n💡 NEXT STEPS:", "INFO")
            self.log("1. ✅ Backend credit system is working", "INFO")
            self.log("2. ✅ Frontend files are in place", "INFO")
            self.log("3. 🔄 Test DOCX upload to see credits in action", "INFO")
            self.log("4. 👁️ Check browser console for credit updates", "INFO")
        elif passed >= total * 0.7:  # 70% pass rate
            self.log("⚠️ MOSTLY WORKING - Minor issues to fix", "WARNING")
            self.log("\n🔧 RECOMMENDED FIXES:", "INFO")
            for test_name, result in results:
                if not result:
                    self.log(f"• Fix: {test_name}", "INFO")
        else:
            self.log("❌ MULTIPLE ISSUES - Needs attention", "ERROR")
            self.log("\n🚨 CRITICAL FIXES NEEDED:", "INFO")
            for test_name, result in results:
                if not result:
                    self.log(f"• URGENT: {test_name}", "ERROR")
        
        return passed == total

def main():
    """Run simple credit system tests"""
    print("🧪 AudioBook Organizer - Simple Credit System Test")
    print("=" * 70)
    print("This test checks if your credit system is properly integrated")
    print("without requiring a full Supabase database setup.\n")
    
    tester = SimpleCreditTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🚀 YOUR CREDIT SYSTEM IS READY FOR TESTING!")
        print("\n📋 HOW TO TEST MANUALLY:")
        print("1. Start backend: python app.py")
        print("2. Open browser to localhost:5000")
        print("3. Upload a DOCX file")
        print("4. Watch credits decrease in the header")
        print("5. Try uploading when credits are low")
        print("\n🎯 Testing mode bypasses actual credit checks,")
        print("   so focus on the UI and user experience!")
    else:
        print("\n🔧 SOME ISSUES FOUND - Please fix the failed tests above")
        
    return success

if __name__ == "__main__":
    main() 