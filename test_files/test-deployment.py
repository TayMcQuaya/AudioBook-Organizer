#!/usr/bin/env python3
"""
AudioBook Organizer - Deployment Test Script

This script tests your deployment configuration to ensure everything is set up correctly.

Usage:
    python test-deployment.py
"""

import os
import sys
import requests
import json
from pathlib import Path

def check_local_backend():
    """Test local backend connection"""
    try:
        response = requests.get('http://localhost:3000/api/test', timeout=5)
        if response.status_code == 200:
            print("✅ Local backend is running and responding")
            return True
        else:
            print(f"⚠️ Local backend responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Local backend is not running (start with 'python app.py')")
        return False
    except Exception as e:
        print(f"❌ Error testing local backend: {e}")
        return False

def check_production_backend(backend_url):
    """Test production backend connection"""
    try:
        test_url = f"{backend_url}/api/test"
        response = requests.get(test_url, timeout=10)
        if response.status_code == 200:
            print(f"✅ Production backend is responding: {backend_url}")
            return True
        else:
            print(f"⚠️ Production backend responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to production backend: {backend_url}")
        return False
    except Exception as e:
        print(f"❌ Error testing production backend: {e}")
        return False

def check_configuration_files():
    """Check if configuration files are properly set up"""
    issues = []
    
    # Check Dockerfile
    dockerfile_path = Path('Dockerfile')
    if dockerfile_path.exists():
        print("✅ Dockerfile exists")
    else:
        issues.append("❌ Dockerfile is missing")
    
    # Check requirements.txt
    requirements_path = Path('requirements.txt')
    if requirements_path.exists():
        print("✅ requirements.txt exists")
    else:
        issues.append("❌ requirements.txt is missing")
    
    # Check frontend api.js
    api_js_path = Path('frontend/js/modules/api.js')
    if api_js_path.exists():
        print("✅ Frontend API module exists")
        # Check if it has the apiFetch function
        with open(api_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'apiFetch' in content:
                print("✅ apiFetch function is present")
            else:
                issues.append("❌ apiFetch function is missing from api.js")
    else:
        issues.append("❌ Frontend API module is missing")
    
    # Check if storage.js has been updated
    storage_js_path = Path('frontend/js/modules/storage.js')
    if storage_js_path.exists():
        with open(storage_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'import { apiFetch }' in content:
                print("✅ storage.js has been updated with apiFetch import")
            else:
                issues.append("❌ storage.js needs to import apiFetch")
    
    # Check vercel.json
    vercel_json_path = Path('vercel.json')
    if vercel_json_path.exists():
        print("✅ vercel.json exists")
    else:
        issues.append("⚠️ vercel.json is missing (will be created by deploy script)")
    
    return issues

def check_environment_variables():
    """Check environment variables for local development"""
    required_vars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'JWT_SECRET_KEY'
    ]
    
    missing_vars = []
    
    # Check if .env file exists
    env_path = Path('.env')
    if env_path.exists():
        print("✅ .env file exists")
    else:
        print("⚠️ .env file not found (create one for local development)")
    
    # Check environment variables
    for var in required_vars:
        if os.environ.get(var):
            print(f"✅ {var} is set")
        else:
            missing_vars.append(var)
    
    if missing_vars:
        print("⚠️ Missing environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("  (These should be set in .env for local development)")
    
    return missing_vars

def main():
    print("🧪 Testing AudioBook Organizer Deployment Configuration")
    print("=" * 60)
    
    # Check configuration files
    print("\n📁 Checking Configuration Files:")
    config_issues = check_configuration_files()
    
    # Check environment variables
    print("\n🔧 Checking Environment Variables:")
    env_issues = check_environment_variables()
    
    # Test local backend
    print("\n🏠 Testing Local Backend:")
    local_backend_ok = check_local_backend()
    
    # Check if frontend configuration looks ready
    print("\n🌐 Frontend Configuration:")
    index_html_path = Path('frontend/public/index.html')
    if index_html_path.exists():
        with open(index_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'REPLACE_WITH_BACKEND_URL' in content:
                print("⚠️ Frontend not configured for production yet")
                print("   Run: python deploy-setup.py --backend-url <your-backend-url>")
            else:
                print("✅ Frontend appears to be configured for production")
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 DEPLOYMENT READINESS SUMMARY")
    print("=" * 60)
    
    if not config_issues and not env_issues and local_backend_ok:
        print("🎉 Your application is ready for deployment!")
        print("\nNext steps:")
        print("1. Deploy backend to DigitalOcean")
        print("2. Run deploy-setup.py with your backend URL")
        print("3. Deploy frontend to Vercel")
    else:
        print("⚠️ Issues found that should be addressed:")
        for issue in config_issues:
            print(f"   {issue}")
        
        if env_issues:
            print("   ❌ Missing environment variables for local development")
        
        if not local_backend_ok:
            print("   ❌ Local backend is not running")
    
    print(f"\n💡 For deployment help, see: DEPLOYMENT_README.md")

if __name__ == '__main__':
    main() 