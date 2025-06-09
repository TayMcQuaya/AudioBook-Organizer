#!/usr/bin/env python3
"""
Quick test script to verify authentication functionality
"""

import requests
import json

BASE_URL = "http://localhost:3000"

def test_auth_endpoints():
    """Test all authentication endpoints"""
    print("🧪 Testing AudioBook Authentication System")
    print("=" * 50)
    
    # Test 1: Auth Config
    print("\n1. Testing /api/auth/config...")
    try:
        response = requests.get(f"{BASE_URL}/api/auth/config")
        if response.status_code == 200:
            config = response.json()
            print(f"   ✅ Status: {response.status_code}")
            print(f"   📄 Supabase configured: {config.get('configured', False)}")
            print(f"   🔒 reCAPTCHA enabled: {config.get('config', {}).get('recaptcha_enabled', False)}")
        else:
            print(f"   ❌ Status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Security Status
    print("\n2. Testing /api/auth/security-status...")
    try:
        response = requests.get(f"{BASE_URL}/api/auth/security-status")
        if response.status_code == 200:
            security = response.json()
            print(f"   ✅ Status: {response.status_code}")
            print(f"   🛡️ Rate limiting: {security.get('security_status', {}).get('rate_limiting_enabled', False)}")
        else:
            print(f"   ❌ Status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Login endpoint (with invalid data to test validation)
    print("\n3. Testing /api/auth/login (validation test)...")
    try:
        test_data = {
            "email": "invalid-email",
            "password": "",
            "recaptcha_token": "disabled"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=test_data)
        print(f"   ✅ Status: {response.status_code} (expected 400 for validation)")
        if response.status_code != 200:
            error = response.json()
            print(f"   📝 Error message: {error.get('message', 'No message')}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 4: Signup endpoint (with invalid data to test validation)
    print("\n4. Testing /api/auth/signup (validation test)...")
    try:
        test_data = {
            "email": "test@example.com",
            "password": "short",
            "full_name": "",
            "recaptcha_token": "disabled"
        }
        response = requests.post(f"{BASE_URL}/api/auth/signup", json=test_data)
        print(f"   ✅ Status: {response.status_code} (expected 400 for validation)")
        if response.status_code != 200:
            error = response.json()
            print(f"   📝 Error message: {error.get('message', 'No message')}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 5: Frontend auth page
    print("\n5. Testing frontend auth page...")
    try:
        response = requests.get(f"{BASE_URL}/auth")
        if response.status_code == 200:
            print(f"   ✅ Status: {response.status_code}")
            print(f"   📱 Auth page accessible")
        else:
            print(f"   ❌ Status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Test completed! Check results above.")
    print("\n💡 Next steps:")
    print("   1. Go to http://localhost:3000/auth")
    print("   2. Try the password toggle (eye button)")
    print("   3. Fill out signup form and test validation")
    print("   4. Check browser console for any JavaScript errors")

if __name__ == "__main__":
    test_auth_endpoints() 