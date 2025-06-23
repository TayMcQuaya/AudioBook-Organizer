#!/usr/bin/env python3
"""
AudioBook Organizer - Testing Environment Setup
This script sets up the proper environment for testing the credit system
"""

import os
from pathlib import Path

def setup_testing_environment():
    """Set up environment for testing the credit system"""
    
    print("🧪 Setting up AudioBook Organizer Testing Environment")
    print("=" * 60)
    
    # Check if .env file exists
    env_file = Path('.env')
    
    if env_file.exists():
        print("✅ .env file found")
        
        # Read current .env content
        with open(env_file, 'r') as f:
            content = f.read()
        
        # Check key settings
        if 'TESTING_MODE=true' in content:
            print("✅ TESTING_MODE is already enabled")
        else:
            print("⚠️ TESTING_MODE is not enabled")
            print("💡 Please add or update these lines in your .env file:")
            print_env_settings()
    else:
        print("❌ .env file not found")
        print("💡 Please create a .env file with these settings:")
        print_env_settings()
        
        # Offer to create the file
        response = input("\n🤔 Would you like me to create a .env file for you? (y/n): ")
        if response.lower().startswith('y'):
            create_env_file()
    
    # Set current session environment variables for immediate testing
    print("\n🔧 Setting environment variables for current session...")
    os.environ['TESTING_MODE'] = 'true'
    os.environ['TEMPORARY_PASSWORD'] = 'test123'
    os.environ['DEFAULT_CREDITS'] = '100'
    os.environ['MAX_CREDITS_PER_USER'] = '10000'
    
    print("✅ Environment variables set for current session")
    print("\n🚀 Next steps:")
    print("1. Restart your backend: python app.py")
    print("2. Go to http://localhost:3000")
    print("3. Use password 'test123' to login")
    print("4. Test DOCX uploads to see credit system in action")

def print_env_settings():
    """Print the required environment settings"""
    print("\n" + "="*50)
    print("REQUIRED .ENV SETTINGS:")
    print("="*50)
    print("""
# Testing Mode Configuration
TESTING_MODE=true
TEMPORARY_PASSWORD=test123

# Credit System
DEFAULT_CREDITS=100
MAX_CREDITS_PER_USER=10000

# Basic Flask Settings
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=dev-secret-key-for-testing
FLASK_HOST=localhost
FLASK_PORT=3000

# Session Settings
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=Lax

# Disable authentication complexity for testing
RECAPTCHA_ENABLED=false
RATE_LIMITING_ENABLED=false
""")
    print("="*50)

def create_env_file():
    """Create a .env file with testing configuration"""
    env_content = """# AudioBook Organizer - Testing Configuration
# Generated automatically for credit system testing

# =================================================================
# 🧪 TESTING MODE (IMPORTANT!)
# =================================================================
TESTING_MODE=true
TEMPORARY_PASSWORD=test123

# =================================================================
# 💎 CREDIT SYSTEM
# =================================================================
DEFAULT_CREDITS=100
MAX_CREDITS_PER_USER=10000

# =================================================================
# ⚙️ BASIC SETTINGS
# =================================================================
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=dev-secret-key-for-testing-12345
FLASK_HOST=localhost
FLASK_PORT=3000

# =================================================================
# 🍪 SESSION SETTINGS
# =================================================================
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=Lax

# =================================================================
# 🔒 SECURITY (Simplified for testing)
# =================================================================
RECAPTCHA_ENABLED=false
RATE_LIMITING_ENABLED=false

# =================================================================
# 📝 NOTES
# =================================================================
# - Use password "test123" to login
# - Credit system UI will be visible but testing mode allows unlimited actions
# - This configuration is for LOCAL TESTING ONLY
# =================================================================
"""
    
    try:
        with open('.env', 'w') as f:
            f.write(env_content)
        print("✅ .env file created successfully!")
        print("📋 Configuration saved with testing mode enabled")
    except Exception as e:
        print(f"❌ Failed to create .env file: {e}")
        print("💡 Please create it manually with the settings shown above")

def main():
    """Main setup function"""
    setup_testing_environment()
    
    print("\n" + "="*60)
    print("🎯 TESTING CHECKLIST:")
    print("="*60)
    print("☐ 1. .env file configured with TESTING_MODE=true")
    print("☐ 2. Backend restarted (python app.py)")
    print("☐ 3. Browser opened to http://localhost:3000")
    print("☐ 4. Login with password 'test123'")
    print("☐ 5. Upload DOCX file to test credit system")
    print("☐ 6. Check credit counter in header (💎 icon)")
    print("☐ 7. Verify credits decrease by 10 per DOCX upload")
    print("\n✨ Your credit system should now work perfectly!")

if __name__ == "__main__":
    main() 