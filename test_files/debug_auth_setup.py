#!/usr/bin/env python3
"""
AudioBook Organizer - Authentication Setup Diagnostics
Debug script for authentication issues in different environments/locations
"""

import os
import sys
import json
from datetime import datetime, timezone
import jwt
from dotenv import load_dotenv

def check_environment_setup():
    """Check if environment is properly configured"""
    print("🔍 AudioBook Organizer - Auth Setup Diagnostics")
    print("=" * 60)
    
    # Load environment
    load_dotenv()
    
    # Check critical environment variables
    critical_vars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_KEY',
        'SECRET_KEY',
        'TESTING_MODE'
    ]
    
    print("📋 Environment Variables Check:")
    missing_vars = []
    
    for var in critical_vars:
        value = os.environ.get(var)
        if value:
            # Mask sensitive values
            if 'KEY' in var or 'SECRET' in var:
                display_value = f"{value[:8]}...{value[-4:]}" if len(value) > 12 else "***"
            else:
                display_value = value
            print(f"  ✅ {var}: {display_value}")
        else:
            print(f"  ❌ {var}: Missing")
            missing_vars.append(var)
    
    if missing_vars:
        print(f"\n❌ Missing critical environment variables: {', '.join(missing_vars)}")
        return False
    
    print("\n✅ All critical environment variables present")
    return True

def check_supabase_config():
    """Check Supabase configuration"""
    print("\n🔗 Supabase Configuration Check:")
    
    url = os.environ.get('SUPABASE_URL')
    anon_key = os.environ.get('SUPABASE_ANON_KEY')
    
    if not url or not anon_key:
        print("  ❌ Supabase configuration incomplete")
        return False
    
    # Basic URL validation
    if not url.startswith('https://') or not url.endswith('.supabase.co'):
        print(f"  ⚠️ Unusual Supabase URL format: {url}")
    else:
        print(f"  ✅ Supabase URL format valid: {url}")
    
    # Check if anon key looks like a JWT
    try:
        # Just check format, don't validate signature
        parts = anon_key.split('.')
        if len(parts) == 3:
            print("  ✅ Anon key appears to be valid JWT format")
        else:
            print("  ⚠️ Anon key doesn't appear to be JWT format")
    except Exception as e:
        print(f"  ⚠️ Could not validate anon key format: {e}")
    
    return True

def check_system_time():
    """Check system time and timezone"""
    print("\n🕐 System Time Check:")
    
    now = datetime.now()
    utc_now = datetime.now(timezone.utc)
    
    print(f"  🕐 Local time: {now}")
    print(f"  🌍 UTC time: {utc_now}")
    print(f"  ⏰ Timezone offset: {now.utcoffset() if now.tzinfo else 'No timezone info'}")
    
    # Check if system time is reasonable (not way off)
    expected_year = 2024
    if now.year < expected_year or now.year > expected_year + 2:
        print(f"  ⚠️ System time appears to be incorrect (year: {now.year})")
        return False
    
    print("  ✅ System time appears reasonable")
    return True

def test_token_creation():
    """Test JWT token creation with current setup"""
    print("\n🔑 Token Creation Test:")
    
    try:
        secret_key = os.environ.get('SECRET_KEY')
        if not secret_key:
            print("  ❌ SECRET_KEY not found")
            return False
        
        # Create a test token
        now = datetime.now(timezone.utc)
        test_payload = {
            'user_id': 'test-user',
            'email': 'test@example.com',
            'iat': int(now.timestamp()),
            'exp': int(now.timestamp()) + 3600  # 1 hour from now
        }
        
        token = jwt.encode(test_payload, secret_key, algorithm='HS256')
        print(f"  ✅ Test token created successfully")
        
        # Try to decode it
        decoded = jwt.decode(token, secret_key, algorithms=['HS256'])
        print(f"  ✅ Test token decoded successfully")
        print(f"  📊 Token expires in: {decoded['exp'] - int(now.timestamp())} seconds")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Token test failed: {e}")
        return False

def check_file_permissions():
    """Check if necessary files exist and are readable"""
    print("\n📁 File Permissions Check:")
    
    critical_files = [
        '.env',
        'app.py',
        'backend/app.py',
        'frontend/index.html'
    ]
    
    all_good = True
    for file_path in critical_files:
        if os.path.exists(file_path):
            if os.access(file_path, os.R_OK):
                print(f"  ✅ {file_path}: Exists and readable")
            else:
                print(f"  ⚠️ {file_path}: Exists but not readable")
                all_good = False
        else:
            print(f"  ❌ {file_path}: Does not exist")
            all_good = False
    
    return all_good

def generate_setup_commands():
    """Generate commands to fix common issues"""
    print("\n🔧 Recommended Fix Commands:")
    print("Run these commands to fix common setup issues:")
    print()
    
    print("1. Clear browser storage completely:")
    print("   - Open browser DevTools (F12)")
    print("   - Go to Application/Storage tab")
    print("   - Clear all storage data")
    print("   - Or run in console:")
    print("     localStorage.clear(); sessionStorage.clear(); location.reload();")
    print()
    
    print("2. Restart the application:")
    print("   python app.py")
    print()
    
    print("3. If still having issues, try incognito/private browsing:")
    print("   - This ensures no cached auth data")
    print()
    
    print("4. Check system time/timezone:")
    print("   - Ensure system clock is accurate")
    print("   - JWT tokens are time-sensitive")

def main():
    """Run all diagnostic checks"""
    print("Starting AudioBook Organizer authentication diagnostics...\n")
    
    checks = [
        ("Environment Setup", check_environment_setup),
        ("Supabase Configuration", check_supabase_config),
        ("System Time", check_system_time),
        ("Token Creation", test_token_creation),
        ("File Permissions", check_file_permissions)
    ]
    
    results = []
    for check_name, check_func in checks:
        try:
            result = check_func()
            results.append((check_name, result))
        except Exception as e:
            print(f"  ❌ {check_name} check failed with error: {e}")
            results.append((check_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 DIAGNOSTIC SUMMARY:")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for check_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}: {check_name}")
    
    print(f"\nOverall: {passed}/{total} checks passed")
    
    if passed == total:
        print("✅ All checks passed! Setup appears correct.")
        print("If still having auth issues, try clearing browser storage.")
    else:
        print("❌ Some checks failed. See recommendations below.")
        generate_setup_commands()

if __name__ == "__main__":
    main() 