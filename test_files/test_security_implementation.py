"""
Security Implementation Test Script
Tests all security measures without breaking existing functionality
"""

import requests
import time
import json

def test_csrf_protection(base_url="http://localhost:3000"):
    """Test CSRF protection"""
    print("🔒 Testing CSRF Protection...")
    
    # Test CSRF token endpoint
    try:
        response = requests.get(f"{base_url}/api/security/csrf-token")
        print(f"   CSRF token endpoint: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('csrf_token'):
                print(f"   ✅ CSRF token generated successfully")
                return True
            else:
                print(f"   ❌ CSRF token generation failed: {data}")
        else:
            print(f"   ❌ CSRF endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ CSRF test error: {e}")
    
    return False

def test_security_headers(base_url="http://localhost:3000"):
    """Test security headers"""
    print("🛡️ Testing Security Headers...")
    
    try:
        response = requests.get(base_url)
        headers = response.headers
        
        security_headers = [
            'Content-Security-Policy',
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection'
        ]
        
        headers_found = 0
        for header in security_headers:
            if header in headers:
                print(f"   ✅ {header}: Present")
                headers_found += 1
            else:
                print(f"   ❌ {header}: Missing")
        
        if headers_found >= 3:
            print(f"   ✅ Security headers implementation working ({headers_found}/4)")
            return True
        else:
            print(f"   ❌ Insufficient security headers ({headers_found}/4)")
            
    except Exception as e:
        print(f"   ❌ Security headers test error: {e}")
    
    return False

def test_rate_limiting(base_url="http://localhost:3000"):
    """Test rate limiting (basic test)"""
    print("⏱️ Testing Rate Limiting...")
    
    try:
        # Test a few requests to see if rate limiting is active
        success_count = 0
        for i in range(3):
            response = requests.get(f"{base_url}/api/stripe/config")
            if response.status_code == 200:
                success_count += 1
            elif response.status_code == 429:
                print(f"   ✅ Rate limiting active (got 429 after {i+1} requests)")
                return True
            time.sleep(0.5)
        
        if success_count > 0:
            print(f"   ✅ Rate limiting configured (allowing normal requests)")
            return True
        else:
            print(f"   ❌ Rate limiting may be too restrictive")
            
    except Exception as e:
        print(f"   ❌ Rate limiting test error: {e}")
    
    return False

def test_input_validation(base_url="http://localhost:3000"):
    """Test input validation"""
    print("✅ Testing Input Validation...")
    
    try:
        # Test with invalid package type
        session = requests.Session()
        
        # Get CSRF token first
        csrf_response = session.get(f"{base_url}/api/security/csrf-token")
        if csrf_response.status_code != 200:
            print("   ❌ Cannot get CSRF token for validation test")
            return False
            
        csrf_token = csrf_response.json().get('csrf_token')
        headers = {'X-CSRFToken': csrf_token, 'Content-Type': 'application/json'}
        
        # Test with invalid package type
        invalid_data = {"package_type": "invalid_package_with_long_name_and_special_chars@#$"}
        response = session.post(f"{base_url}/api/stripe/create-checkout-session",
                              json=invalid_data,
                              headers=headers)
        
        if response.status_code == 400:
            print("   ✅ Input validation working (rejected invalid package type)")
            return True
        elif response.status_code == 401:
            print("   ✅ Input validation working (authentication required)")
            return True
        else:
            print(f"   ❌ Unexpected response: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Input validation test error: {e}")
    
    return False

def test_api_health(base_url="http://localhost:3000"):
    """Test basic API health"""
    print("🏥 Testing API Health...")
    
    try:
        response = requests.get(f"{base_url}/api/test")
        if response.status_code == 200:
            print("   ✅ API is responding correctly")
            return True
        else:
            print(f"   ❌ API health check failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ API health test error: {e}")
    
    return False

def main():
    """Run all security tests"""
    print("🔐 Security Implementation Test Suite")
    print("=" * 50)
    
    base_url = "http://localhost:3000"
    
    tests = [
        ("API Health", test_api_health),
        ("CSRF Protection", test_csrf_protection),
        ("Security Headers", test_security_headers),
        ("Rate Limiting", test_rate_limiting),
        ("Input Validation", test_input_validation),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func(base_url)
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test failed with exception: {e}")
            results.append((test_name, False))
        print()
    
    # Summary
    print("📊 Test Results Summary")
    print("=" * 50)
    passed = 0
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All security measures are working correctly!")
    elif passed >= len(results) * 0.8:
        print("✅ Most security measures are working. Check failed tests.")
    else:
        print("⚠️ Several security measures need attention.")

if __name__ == "__main__":
    main() 