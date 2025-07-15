#!/usr/bin/env python3
"""
Clear Rate Limiting Script
Clears login attempt limits for development/testing
"""

import sys
import os
import time
from datetime import datetime

# Add the backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def clear_rate_limits():
    """Clear rate limiting storage"""
    try:
        from backend.services.security_service import get_security_service
        
        print("🔧 Clearing rate limiting...")
        
        # Get security service
        security_service = get_security_service()
        
        # Clear all login attempts
        security_service.login_attempts.clear()
        
        # Clear all rate limit storage
        security_service.rate_limit_storage.clear()
        
        print("✅ Rate limiting cleared successfully!")
        print("🔄 You should now be able to log in again")
        
        return True
        
    except Exception as e:
        print(f"❌ Error clearing rate limits: {e}")
        return False

def check_current_limits():
    """Check current rate limiting status"""
    try:
        from backend.services.security_service import get_security_service
        
        print("🔍 Checking current rate limits...")
        
        # Get security service
        security_service = get_security_service()
        
        # Check login attempts
        if hasattr(security_service, 'login_attempts') and security_service.login_attempts:
            print(f"📊 Active login attempt limits: {len(security_service.login_attempts)} identifiers")
            for identifier, attempts in security_service.login_attempts.items():
                if attempts:
                    oldest_attempt = attempts[0]
                    time_since = time.time() - oldest_attempt
                    remaining_time = 900 - time_since  # 15 minutes window
                    print(f"  - {identifier}: {len(attempts)} attempts, {max(0, remaining_time):.0f}s remaining")
        else:
            print("✅ No active login attempt limits")
        
        # Check rate limits
        if hasattr(security_service, 'rate_limit_storage') and security_service.rate_limit_storage:
            print(f"📊 Active rate limits: {len(security_service.rate_limit_storage)} identifiers")
        else:
            print("✅ No active rate limits")
            
    except Exception as e:
        print(f"❌ Error checking limits: {e}")

if __name__ == "__main__":
    print("🔧 Rate Limit Management Tool")
    print("=" * 40)
    
    if len(sys.argv) > 1 and sys.argv[1] == "clear":
        clear_rate_limits()
    else:
        check_current_limits()
        print("\n💡 To clear rate limits, run: python clear_rate_limit.py clear") 