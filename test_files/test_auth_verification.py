#!/usr/bin/env python3
"""
Authentication Verification Script for AudioBook Organizer
This script helps debug authentication issues in production
"""

import requests
import json
import sys

def test_backend_connectivity():
    """Test if the backend is reachable"""
    backend_url = "https://audiobook-organizer-test-vdhku.ondigitalocean.app"
    
    try:
        response = requests.get(f"{backend_url}/api/test", timeout=10)
        print(f"✅ Backend connectivity: {response.status_code}")
        return True
    except Exception as e:
        print(f"❌ Backend connectivity failed: {e}")
        return False

def test_temp_auth_login():
    """Test temporary authentication login"""
    backend_url = "https://audiobook-organizer-test-vdhku.ondigitalocean.app"
    
    # Get the password from environment or input
    password = input("Enter the temporary password: ").strip()
    
    try:
        response = requests.post(
            f"{backend_url}/api/auth/temp-login",
            json={"password": password},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Login response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                token = data.get('token')
                print(f"✅ Authentication successful")
                print(f"   Token received: {token[:20]}..." if token else "No token")
                return token
            else:
                print(f"❌ Authentication failed: {data.get('error')}")
        else:
            print(f"❌ Authentication request failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Authentication request error: {e}")
    
    return None

def test_upload_with_token(token):
    """Test audio upload with authentication token"""
    backend_url = "https://audiobook-organizer-test-vdhku.ondigitalocean.app"
    
    # Create a small test audio file (silence)
    import io
    import wave
    
    # Create a minimal WAV file (1 second of silence)
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)  # mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(44100)  # 44.1kHz
        # Write 1 second of silence (44100 frames of zeros)
        silent_frames = b'\x00\x00' * 44100
        wav_file.writeframes(silent_frames)
    
    buffer.seek(0)
    
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
        headers['X-Temp-Auth'] = token
    
    try:
        files = {'audio': ('test_upload.wav', buffer, 'audio/wav')}
        
        response = requests.post(
            f"{backend_url}/api/upload",
            files=files,
            headers=headers,
            timeout=30
        )
        
        print(f"Upload response status: {response.status_code}")
        print(f"Upload response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Upload successful: {data}")
            return True
        else:
            print(f"❌ Upload failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Upload request error: {e}")
    
    return False

def test_debug_endpoints():
    """Test debug endpoints"""
    backend_url = "https://audiobook-organizer-test-vdhku.ondigitalocean.app"
    
    endpoints = [
        "/debug/config",
        "/api/debug-env",
        "/api/auth/temp-status"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{backend_url}{endpoint}", timeout=10)
            print(f"\n📊 {endpoint}: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(json.dumps(data, indent=2))
        except Exception as e:
            print(f"❌ {endpoint} failed: {e}")

def test_multiple_requests_token_persistence(token):
    """Test if tokens persist across multiple requests (worker process issue)"""
    backend_url = "https://audiobook-organizer-test-vdhku.ondigitalocean.app"
    
    print("🔄 Testing token persistence across multiple requests...")
    
    # Make several requests to see if we hit different workers
    headers = {
        'Authorization': f'Bearer {token}',
        'X-Temp-Auth': token
    }
    
    for i in range(5):
        try:
            response = requests.get(
                f"{backend_url}/api/auth/temp-status",
                headers=headers,
                timeout=10
            )
            
            print(f"Request {i+1}: Status {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"  - Authenticated: {data.get('authenticated', 'unknown')}")
            else:
                print(f"  - Failed: {response.text}")
                
        except Exception as e:
            print(f"Request {i+1} failed: {e}")
    
    # Test if upload endpoint recognizes the token
    print("\n🧪 Testing upload endpoint token recognition...")
    try:
        # Just hit the endpoint without actually uploading
        response = requests.options(
            f"{backend_url}/api/upload",
            headers=headers,
            timeout=10
        )
        print(f"OPTIONS request: {response.status_code}")
    except Exception as e:
        print(f"OPTIONS request failed: {e}")

def main():
    """Main test flow"""
    print("🧪 AudioBook Organizer Authentication Verification")
    print("=" * 50)
    
    # Step 1: Test backend connectivity
    if not test_backend_connectivity():
        print("Cannot proceed without backend connectivity")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    
    # Step 2: Test debug endpoints
    print("📊 Testing debug endpoints...")
    test_debug_endpoints()
    
    print("\n" + "=" * 50)
    
    # Step 3: Test authentication
    print("🔐 Testing authentication...")
    token = test_temp_auth_login()
    
    if token:
        print("\n" + "=" * 50)
        
        # Step 3.5: Test token persistence across requests
        test_multiple_requests_token_persistence(token)
        
        print("\n" + "=" * 50)
        
        # Step 4: Test upload with token
        print("📁 Testing upload with authentication...")
        success = test_upload_with_token(token)
        
        if success:
            print("\n✅ All tests passed! Authentication is working correctly.")
        else:
            print("\n❌ Upload failed even with valid authentication.")
            print("\n🔍 DIAGNOSIS: This is likely a Gunicorn worker process issue.")
            print("   - Tokens are stored in memory in each worker process")
            print("   - When you authenticate, token goes to Worker A")
            print("   - When you upload, request goes to Worker B (no token)")
            print("   - SOLUTION: Use Redis or database for token storage")
    else:
        print("\n❌ Authentication failed. Cannot test upload.")

if __name__ == "__main__":
    main() 