#!/usr/bin/env python3
"""
Quick test script to verify backend configuration for production deployment
"""

import os
import sys
sys.path.append('.')

from backend.config import config

def test_configuration():
    print('🔧 Backend Configuration Test:')
    print('=' * 50)

    # Test production config
    prod_config = config['production']()
    
    print(f'Testing Mode: {prod_config.TESTING_MODE}')
    print(f'Temp Password Set: {bool(prod_config.TEMPORARY_PASSWORD)}')
    print(f'Session Secure: {prod_config.SESSION_COOKIE_SECURE}')
    print(f'Session SameSite: {prod_config.SESSION_COOKIE_SAMESITE}')
    print(f'Session Lifetime: {prod_config.PERMANENT_SESSION_LIFETIME}')

    print('')
    print('Environment Variables:')
    print(f'- TESTING_MODE: {os.environ.get("TESTING_MODE", "NOT_SET")}')
    print(f'- TEMPORARY_PASSWORD: {"SET" if os.environ.get("TEMPORARY_PASSWORD") else "NOT_SET"}')
    print(f'- FLASK_ENV: {os.environ.get("FLASK_ENV", "NOT_SET")}')
    print(f'- SESSION_COOKIE_SECURE: {os.environ.get("SESSION_COOKIE_SECURE", "NOT_SET")}')
    
    print('')
    print('🚨 Required for Production Testing Mode:')
    print('1. TESTING_MODE=true')
    print('2. TEMPORARY_PASSWORD=your_password')
    print('3. SESSION_COOKIE_SECURE=true (for HTTPS)')
    print('')
    
    if not prod_config.TESTING_MODE:
        print('❌ TESTING_MODE is not enabled!')
        return False
    
    if not prod_config.TEMPORARY_PASSWORD:
        print('❌ TEMPORARY_PASSWORD is not configured!')
        return False
        
    print('✅ Basic configuration looks good!')
    return True

if __name__ == '__main__':
    test_configuration() 