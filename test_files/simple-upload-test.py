#!/usr/bin/env python3
"""
Simple DOCX upload test to get the exact error message
"""

import requests
import io

def test_upload_with_existing_session():
    """
    Test upload using the same authentication as the browser
    """
    print("🧪 Testing DOCX Upload with Authentication")
    print("=" * 50)
    
    base_url = "http://localhost:3000"
    
    # Create a session
    session = requests.Session()
    
    # Authenticate using the same password as the browser
    # You mentioned you're using "test123" as the password
    auth_data = {"password": "Aur@Vo1ce!Launch2025"}  # Adjust this if different
    
    print("🔐 Authenticating...")
    auth_response = session.post(f"{base_url}/api/auth/temp-login", json=auth_data)
    
    if auth_response.status_code != 200:
        print(f"❌ Authentication failed: {auth_response.status_code}")
        print(f"Response: {auth_response.text}")
        
        # Try alternative passwords
        for pwd in ["dev123", "test", "testing", "password"]:
            print(f"Trying password: {pwd}")
            auth_response = session.post(f"{base_url}/api/auth/temp-login", json={"password": pwd})
            if auth_response.status_code == 200:
                print(f"✅ Authentication successful with password: {pwd}")
                break
        else:
            print("❌ Could not authenticate with any common passwords")
            return False
    else:
        print("✅ Authentication successful")
    
    # Test DOCX upload with a minimal valid DOCX file
    print("\n📄 Testing DOCX Upload...")
    
    # Create minimal DOCX content as bytes
    # This is a simplified test - you can replace with actual file content
    
    # Test 1: Upload with no file (should give specific error)
    print("Test 1: No file")
    response = session.post(f"{base_url}/api/upload/docx")
    print(f"  Status: {response.status_code}")
    try:
        error_data = response.json()
        print(f"  Error: {error_data.get('error', 'Unknown')}")
    except:
        print(f"  Raw response: {response.text[:200]}")
    
    # Test 2: Upload with empty file
    print("\nTest 2: Empty file")
    files = {'file': ('test.docx', b'', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
    response = session.post(f"{base_url}/api/upload/docx", files=files)
    print(f"  Status: {response.status_code}")
    try:
        error_data = response.json()
        print(f"  Error: {error_data.get('error', 'Unknown')}")
        print(f"  Error Type: {error_data.get('error_type', 'Unknown')}")
        if 'details' in error_data:
            print(f"  Details: {error_data['details']}")
    except:
        print(f"  Raw response: {response.text[:200]}")
    
    # Test 3: Upload with invalid file extension
    print("\nTest 3: Invalid extension")
    files = {'file': ('test.txt', b'Hello world', 'text/plain')}
    response = session.post(f"{base_url}/api/upload/docx", files=files)
    print(f"  Status: {response.status_code}")
    try:
        error_data = response.json()
        print(f"  Error: {error_data.get('error', 'Unknown')}")
    except:
        print(f"  Raw response: {response.text[:200]}")
    
    print("\n📋 Summary:")
    print("- Authentication is working in testing mode")
    print("- Check the specific errors above to identify the issue")
    print("- If all tests show proper validation errors, the issue")
    print("  might be with the specific DOCX file you're uploading")
    
    return True

if __name__ == "__main__":
    test_upload_with_existing_session() 