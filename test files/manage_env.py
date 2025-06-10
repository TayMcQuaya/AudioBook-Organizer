#!/usr/bin/env python3
"""
AudioBook Creator - Environment Management Script

Usage:
  python manage_env.py local    # Switch to local/development environment
  python manage_env.py prod     # Switch to production environment
  python manage_env.py status   # Show current environment status

This script helps you safely switch between local development and production
configurations without accidentally exposing sensitive production data.
"""
import sys
import shutil
import os
from pathlib import Path

def get_current_env_info():
    """Get information about the current .env file"""
    env_path = Path('.env')
    if not env_path.exists():
        return None, "No .env file found"
    
    # Read first few lines to determine environment type
    try:
        with open('.env', 'r') as f:
            content = f.read()
            if 'FLASK_ENV=development' in content:
                return 'local', 'Development environment (local)'
            elif 'FLASK_ENV=production' in content:
                return 'prod', 'Production environment'
            else:
                return 'unknown', 'Unknown environment type'
    except Exception as e:
        return None, f"Error reading .env: {e}"

def switch_environment(env_type):
    """Switch to the specified environment"""
    if env_type == 'local':
        source = '.env.local'
        env_name = 'LOCAL/DEVELOPMENT'
        print("🔧 Switching to LOCAL/DEVELOPMENT environment...")
    elif env_type == 'prod':
        source = '.env.production'
        env_name = 'PRODUCTION'
        print("🚀 Switching to PRODUCTION environment...")
    else:
        print("❌ Invalid environment. Use 'local', 'prod', or 'status'")
        print("\nUsage:")
        print("  python manage_env.py local   # Development environment")
        print("  python manage_env.py prod    # Production environment") 
        print("  python manage_env.py status  # Show current environment")
        return False
    
    # Check if source file exists
    if not os.path.exists(source):
        print(f"❌ {source} file not found!")
        print(f"\nTo create {source}:")
        print(f"1. Copy your current .env to {source}")
        print(f"2. Modify {source} with appropriate {env_name} settings")
        print(f"3. Run this script again")
        return False
    
    # Backup current .env if it exists
    if os.path.exists('.env'):
        backup_name = f'.env.backup.{get_timestamp()}'
        shutil.copy('.env', backup_name)
        print(f"📁 Backed up current .env → {backup_name}")
    
    # Copy new environment
    shutil.copy(source, '.env')
    print(f"✅ Environment switched to {env_name}")
    print(f"📁 Copied {source} → .env")
    
    # Show warning for production
    if env_type == 'prod':
        print("\n🚨 PRODUCTION ENVIRONMENT ACTIVE!")
        print("⚠️  Make sure all production secrets are configured correctly")
        print("⚠️  Verify Supabase, reCAPTCHA, and other services are set up")
    
    return True

def show_status():
    """Show current environment status"""
    print("📊 Environment Status:")
    print("=" * 50)
    
    # Current environment
    env_type, env_desc = get_current_env_info()
    if env_type:
        if env_type == 'local':
            print(f"🔧 Current: {env_desc}")
        elif env_type == 'prod':
            print(f"🚀 Current: {env_desc}")
        else:
            print(f"❓ Current: {env_desc}")
    else:
        print(f"❌ Current: {env_desc}")
    
    print()
    
    # Available environments
    print("📁 Available environments:")
    for env_file, env_name in [('.env.local', 'Local/Development'), ('.env.production', 'Production')]:
        if os.path.exists(env_file):
            print(f"  ✅ {env_file} ({env_name})")
        else:
            print(f"  ❌ {env_file} (Not found)")
    
    print()
    
    # Security check
    if env_type == 'prod':
        print("🛡️  PRODUCTION SECURITY CHECKLIST:")
        check_production_security()

def check_production_security():
    """Check production security configuration"""
    security_items = [
        ("Strong SECRET_KEY", "SECRET_KEY", lambda v: len(v) >= 32),
        ("Production Supabase URL", "SUPABASE_URL", lambda v: v and 'supabase.co' in v and not 'localhost' in v),
        ("reCAPTCHA enabled", "RECAPTCHA_ENABLED", lambda v: v.lower() == 'true'),
        ("Debug disabled", "FLASK_DEBUG", lambda v: v.lower() == 'false'),
        ("Production environment", "FLASK_ENV", lambda v: v.lower() == 'production'),
    ]
    
    try:
        with open('.env', 'r') as f:
            env_content = f.read()
        
        for item_name, env_var, check_func in security_items:
            # Extract value from .env content
            for line in env_content.split('\n'):
                if line.startswith(f'{env_var}='):
                    value = line.split('=', 1)[1].strip()
                    if check_func(value):
                        print(f"  ✅ {item_name}")
                    else:
                        print(f"  ⚠️  {item_name} - needs attention")
                    break
            else:
                print(f"  ❌ {item_name} - not found")
                
    except Exception as e:
        print(f"  ❌ Error checking security: {e}")

def get_timestamp():
    """Get current timestamp for backup files"""
    from datetime import datetime
    return datetime.now().strftime("%Y%m%d_%H%M%S")

def main():
    """Main function"""
    print("🔧 AudioBook Creator - Environment Manager")
    print("=" * 50)
    
    if len(sys.argv) != 2:
        print("Usage: python manage_env.py [local|prod|status]")
        print("\nCommands:")
        print("  local   - Switch to local/development environment")
        print("  prod    - Switch to production environment")
        print("  status  - Show current environment status")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == 'status':
        show_status()
    elif command in ['local', 'prod']:
        if switch_environment(command):
            print("\n✅ Environment switch completed!")
            print("🔄 Restart your server to apply changes: python app.py")
        else:
            sys.exit(1)
    else:
        print(f"❌ Unknown command: {command}")
        print("Use: local, prod, or status")
        sys.exit(1)

if __name__ == '__main__':
    main() 