#!/usr/bin/env python3
"""
Debug script to test DOCX upload functionality
"""

import requests
import os
from pathlib import Path

def debug_docx_upload():
    """Debug the DOCX upload process"""
    
    print("🧪 Debugging DOCX Upload Functionality")
    print("=" * 50)
    
    base_url = "http://localhost:3000"
    
    # Check if backend is running
    try:
        response = requests.get(f"{base_url}/api/test", timeout=5)
        print(f"✅ Backend is running at {base_url}")
    except requests.exceptions.RequestException:
        print(f"❌ Backend not running at {base_url}")
        return False
    
    # Create a session for authentication
    session = requests.Session()
    
    # Test temp authentication first
    print("\n🔐 Testing Authentication:")
    print("-" * 30)
    
    # Get temp password from environment or default
    temp_password = os.getenv("TEMPORARY_PASSWORD", "test123")
    
    # Login with temp auth
    login_response = session.post(f"{base_url}/api/auth/temp-login", json={"password": temp_password})
    if login_response.status_code == 200:
        print("✅ Authentication successful")
    else:
        print(f"❌ Authentication failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        return False
    
    # Test DOCX upload endpoint with validation
    print("\n📄 Testing DOCX Upload Endpoint:")
    print("-" * 35)
    
    # First, test with no file (should get specific error)
    print("1. Testing with no file...")
    response = session.post(f"{base_url}/api/upload/docx")
    print(f"   Status: {response.status_code}")
    if response.status_code == 400:
        try:
            error_data = response.json()
            print(f"   Error: {error_data.get('error', 'Unknown error')}")
        except:
            print(f"   Raw response: {response.text}")
    
    # Test with empty file
    print("\n2. Testing with empty file...")
    empty_file_data = {'file': ('test.docx', b'', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
    response = session.post(f"{base_url}/api/upload/docx", files=empty_file_data)
    print(f"   Status: {response.status_code}")
    if response.status_code >= 400:
        try:
            error_data = response.json()
            print(f"   Error: {error_data.get('error', 'Unknown error')}")
        except:
            print(f"   Raw response: {response.text}")
    
    # Test with non-DOCX file
    print("\n3. Testing with non-DOCX file...")
    txt_file_data = {'file': ('test.txt', b'Hello world', 'text/plain')}
    response = session.post(f"{base_url}/api/upload/docx", files=txt_file_data)
    print(f"   Status: {response.status_code}")
    if response.status_code >= 400:
        try:
            error_data = response.json()
            print(f"   Error: {error_data.get('error', 'Unknown error')}")
        except:
            print(f"   Raw response: {response.text}")
    
    # Test with minimal valid DOCX (if we can create one)
    print("\n4. Testing DOCX file validation...")
    print("   To test with a real DOCX file, please:")
    print("   - Ensure your DOCX file is valid")
    print("   - Check file size (max 25MB)")
    print("   - Verify file extension is .docx")
    
    # Check backend logs for more details
    print("\n💡 Debugging Tips:")
    print("-" * 20)
    print("1. Check backend console for detailed error logs")
    print("2. Verify the DOCX file is not corrupted")
    print("3. Check if file size is within limits")
    print("4. Ensure file extension is correct (.docx)")
    print("5. Try with a simple DOCX file first")
    
    return True

def check_backend_config():
    """Check backend configuration"""
    print("\n🔧 Backend Configuration Check:")
    print("-" * 35)
    
    # Check if backend is in testing mode
    try:
        response = requests.get("http://localhost:3000/api/auth/temp-status")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Testing mode: {data.get('testing_mode', False)}")
            print(f"✅ Authentication ready: {data.get('authenticated', False)}")
        else:
            print(f"⚠️ Could not check backend status: {response.status_code}")
    except Exception as e:
        print(f"❌ Backend check failed: {e}")

def main():
    """Main debug function"""
    print("🔍 AudioBook Organizer - DOCX Upload Debug")
    print("=" * 50)
    
    check_backend_config()
    debug_docx_upload()
    
    print("\n📋 Next Steps:")
    print("1. If authentication works, try uploading a simple DOCX file")
    print("2. Check the browser console for detailed error messages")
    print("3. Look at the backend console for server-side errors")
    print("4. If issues persist, the file might be corrupted or too complex")

if __name__ == "__main__":
    main() 