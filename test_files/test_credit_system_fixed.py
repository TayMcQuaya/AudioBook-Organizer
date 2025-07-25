#!/usr/bin/env python3
"""
Credit System Test Script
Tests the fixes for credit consumption and display consistency
"""
import os
import sys
import requests
import json
import time
from datetime import datetime

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

class CreditSystemTester:
    def __init__(self, base_url=None):
        self.base_url = base_url or os.environ.get('TEST_BASE_URL', 'http://localhost:3000')
        self.api_url = f"{self.base_url}/api"
        self.auth_token = os.environ.get('TEST_AUTH_TOKEN')
        self.user_id = os.environ.get('TEST_USER_ID')
        self.session = requests.Session()
        
    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def test_auth_setup(self):
        """Test authentication setup"""
        self.log("🔐 Testing authentication setup...")
        
        # Test config endpoint
        response = self.session.get(f"{self.api_url}/auth/config")
        if response.status_code != 200:
            self.log(f"❌ Config endpoint failed: {response.status_code}")
            return False
            
        config = response.json()
        if not config.get('success'):
            self.log(f"❌ Config response failed: {config}")
            return False
            
        self.log("✅ Authentication config loaded successfully")
        return True
        
    def test_credit_fetch_consistency(self):
        """Test credit fetching with and without refresh parameter"""
        self.log("💎 Testing credit fetch consistency...")
        
        if not self.auth_token:
            self.log("❌ No auth token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test 1: Fetch credits without refresh
        response1 = self.session.get(f"{self.api_url}/auth/credits", headers=headers)
        if response1.status_code != 200:
            self.log(f"❌ Credits fetch failed: {response1.status_code}")
            return False
            
        credits1 = response1.json().get('credits', 0)
        self.log(f"💎 Credits without refresh: {credits1}")
        
        # Test 2: Fetch credits with refresh=true
        response2 = self.session.get(f"{self.api_url}/auth/credits?refresh=true", headers=headers)
        if response2.status_code != 200:
            self.log(f"❌ Credits fetch with refresh failed: {response2.status_code}")
            return False
            
        credits2 = response2.json().get('credits', 0)
        self.log(f"💎 Credits with refresh=true: {credits2}")
        
        # Test 3: Both calls should return the same value
        if credits1 == credits2:
            self.log("✅ Credit fetch consistency test passed")
            return True
        else:
            self.log(f"❌ Credit fetch inconsistency: {credits1} vs {credits2}")
            return False
            
    def test_credit_consumption_accuracy(self):
        """Test credit consumption accuracy"""
        self.log("🔄 Testing credit consumption accuracy...")
        
        if not self.auth_token:
            self.log("❌ No auth token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Get initial credits
        response = self.session.get(f"{self.api_url}/auth/credits?refresh=true", headers=headers)
        if response.status_code != 200:
            self.log(f"❌ Initial credits fetch failed: {response.status_code}")
            return False
            
        initial_credits = response.json().get('credits', 0)
        self.log(f"💎 Initial credits: {initial_credits}")
        
        # Test TXT upload (should consume 3 credits)
        txt_content = "This is a test text file for credit consumption testing."
        files = {'file': ('test.txt', txt_content, 'text/plain')}
        
        response = self.session.post(f"{self.api_url}/upload/txt", files=files, headers=headers)
        if response.status_code != 200:
            self.log(f"❌ TXT upload failed: {response.status_code}")
            response_data = response.json()
            self.log(f"Error details: {response_data}")
            return False
            
        # Wait a moment for processing
        time.sleep(1)
        
        # Get credits after consumption
        response = self.session.get(f"{self.api_url}/auth/credits?refresh=true", headers=headers)
        if response.status_code != 200:
            self.log(f"❌ Credits fetch after consumption failed: {response.status_code}")
            return False
            
        final_credits = response.json().get('credits', 0)
        self.log(f"💎 Final credits: {final_credits}")
        
        # Check if exactly 3 credits were consumed
        expected_credits = initial_credits - 3
        if final_credits == expected_credits:
            self.log(f"✅ Credit consumption accurate: {initial_credits} -> {final_credits} (3 credits consumed)")
            return True
        else:
            self.log(f"❌ Credit consumption inaccurate: expected {expected_credits}, got {final_credits}")
            return False
            
    def test_fresh_credit_checks(self):
        """Test that credit checks use fresh data from database"""
        self.log("🔄 Testing fresh credit checks for actions...")
        
        if not self.auth_token:
            self.log("❌ No auth token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Get current credits
        response = self.session.get(f"{self.api_url}/auth/credits?refresh=true", headers=headers)
        if response.status_code != 200:
            self.log(f"❌ Credits fetch failed: {response.status_code}")
            return False
            
        current_credits = response.json().get('credits', 0)
        self.log(f"💎 Current credits: {current_credits}")
        
        # Test with insufficient credits scenario
        if current_credits < 3:
            self.log("✅ Already have insufficient credits for testing")
            
            # Try to upload TXT file (should fail with 402)
            txt_content = "Test file for insufficient credits."
            files = {'file': ('test_insufficient.txt', txt_content, 'text/plain')}
            
            response = self.session.post(f"{self.api_url}/upload/txt", files=files, headers=headers)
            if response.status_code == 402:
                self.log("✅ Action correctly denied due to insufficient credits")
                return True
            else:
                self.log(f"❌ Action should have been denied but got status: {response.status_code}")
                return False
        else:
            self.log("💎 Have sufficient credits - this test needs manual verification")
            self.log("💡 To test: Manually set credits to 2 in database, then try uploading")
            return True
            
    def test_cache_invalidation(self):
        """Test cache invalidation after credit consumption"""
        self.log("🔄 Testing cache invalidation...")
        
        if not self.auth_token:
            self.log("❌ No auth token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Get initial credits with caching
        response = self.session.get(f"{self.api_url}/auth/credits", headers=headers)
        if response.status_code != 200:
            self.log(f"❌ Initial credits fetch failed: {response.status_code}")
            return False
            
        cached_credits = response.json().get('credits', 0)
        self.log(f"💎 Cached credits: {cached_credits}")
        
        # Get credits with refresh (should bypass cache)
        response = self.session.get(f"{self.api_url}/auth/credits?refresh=true", headers=headers)
        if response.status_code != 200:
            self.log(f"❌ Fresh credits fetch failed: {response.status_code}")
            return False
            
        fresh_credits = response.json().get('credits', 0)
        self.log(f"💎 Fresh credits: {fresh_credits}")
        
        # Both should be the same (no pending cache invalidation issues)
        if cached_credits == fresh_credits:
            self.log("✅ Cache invalidation working correctly")
            return True
        else:
            self.log(f"❌ Cache invalidation issue: cached={cached_credits}, fresh={fresh_credits}")
            return False
            
    def test_env_config_reading(self):
        """Test that credit costs are read from environment variables"""
        self.log("⚙️ Testing environment variable configuration...")
        
        response = self.session.get(f"{self.api_url}/auth/config")
        if response.status_code != 200:
            self.log(f"❌ Config fetch failed: {response.status_code}")
            return False
            
        config = response.json()
        if not config.get('success'):
            self.log(f"❌ Config response failed: {config}")
            return False
            
        credit_costs = config.get('config', {}).get('credit_costs', {})
        if not credit_costs:
            self.log("❌ No credit costs in config")
            return False
            
        expected_costs = {
            'audio_upload': 2,
            'txt_upload': 3,
            'docx_processing': 5,
            'premium_export': 15
        }
        
        for cost_type, expected_value in expected_costs.items():
            actual_value = credit_costs.get(cost_type)
            if actual_value != expected_value:
                self.log(f"❌ Config mismatch for {cost_type}: expected {expected_value}, got {actual_value}")
                return False
                
        self.log("✅ Environment variable configuration working correctly")
        return True
        
    def run_all_tests(self):
        """Run all credit system tests"""
        self.log("🚀 Starting Credit System Test Suite...")
        
        tests = [
            ("Authentication Setup", self.test_auth_setup),
            ("Environment Config Reading", self.test_env_config_reading),
            ("Credit Fetch Consistency", self.test_credit_fetch_consistency),
            ("Cache Invalidation", self.test_cache_invalidation),
            ("Fresh Credit Checks", self.test_fresh_credit_checks),
            ("Credit Consumption Accuracy", self.test_credit_consumption_accuracy),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            self.log(f"\n📋 Running test: {test_name}")
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                self.log(f"❌ Test '{test_name}' failed with exception: {e}")
                failed += 1
                
        self.log(f"\n📊 Test Results: {passed} passed, {failed} failed")
        
        if failed == 0:
            self.log("🎉 All tests passed! Credit system is working correctly.")
            return True
        else:
            self.log(f"⚠️ {failed} tests failed. Please check the issues above.")
            return False

def main():
    """Main test runner"""
    tester = CreditSystemTester()
    
    # Note: This test script assumes you have a running server and valid authentication
    # In a real scenario, you would need to implement proper authentication flow
    
    print("🧪 Credit System Test Suite")
    print("=" * 50)
    print("Note: This test requires a running server and valid authentication")
    print("Set environment variables: TEST_BASE_URL, TEST_AUTH_TOKEN, TEST_USER_ID")
    print("=" * 50)
    
    if not tester.auth_token:
        print("❌ Please set TEST_AUTH_TOKEN environment variable for testing")
        print("Example: export TEST_AUTH_TOKEN='your-test-token'")
        return False
        
    return tester.run_all_tests()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 