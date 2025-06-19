#!/usr/bin/env python3
"""
AudioBook Organizer - Quick Setup Script
Run this on a fresh computer to set up the application
"""

import os
import sys
import subprocess
import secrets
from pathlib import Path

def run_command(cmd, description=""):
    """Run a command and handle errors"""
    print(f"➤ {description or cmd}")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        if result.stdout:
            print(f"  ✅ {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ❌ Error: {e}")
        if e.stderr:
            print(f"  ❌ {e.stderr.strip()}")
        return False

def create_directories():
    """Create required directories"""
    dirs = ['uploads', 'exports', 'logs']
    for dir_name in dirs:
        dir_path = Path(dir_name)
        if not dir_path.exists():
            dir_path.mkdir(exist_ok=True)
            print(f"  ✅ Created directory: {dir_name}")
        else:
            print(f"  ℹ️ Directory already exists: {dir_name}")

def setup_environment():
    """Set up environment file"""
    env_path = Path('.env')
    env_example_path = Path('env.example')
    
    if not env_path.exists() and env_example_path.exists():
        # Copy env.example to .env
        with open(env_example_path, 'r') as f:
            content = f.read()
        
        # Generate a secure secret key
        secret_key = secrets.token_hex(32)
        content = content.replace('your-secret-key-change-this-in-production', secret_key)
        
        with open(env_path, 'w') as f:
            f.write(content)
        
        print("  ✅ Created .env file from template")
        print("  ⚠️ IMPORTANT: Edit .env file with your Supabase credentials!")
        return True
    elif env_path.exists():
        print("  ℹ️ .env file already exists")
        return True
    else:
        print("  ❌ env.example file not found")
        return False

def main():
    """Main setup function"""
    print("🚀 AudioBook Organizer - Quick Setup")
    print("=" * 50)
    
    # Check Python version
    if sys.version_info < (3, 7):
        print("❌ Python 3.7+ is required")
        sys.exit(1)
    
    print(f"✅ Python {sys.version.split()[0]} detected")
    
    # Install dependencies
    print("\n📦 Installing dependencies...")
    if not run_command("pip install -r requirements.txt", "Installing Python packages"):
        print("❌ Failed to install dependencies")
        sys.exit(1)
    
    # Create directories
    print("\n📁 Creating directories...")
    create_directories()
    
    # Setup environment
    print("\n⚙️ Setting up environment...")
    if not setup_environment():
        print("❌ Failed to setup environment")
        sys.exit(1)
    
    print("\n✅ Setup complete!")
    print("\n📋 Next steps:")
    print("1. Edit .env file with your Supabase credentials")
    print("2. Set TESTING_MODE=true and TEMPORARY_PASSWORD in .env")
    print("3. Run: python app.py")
    print("4. Open: http://localhost:3000")
    
    # Ask if user wants to run the app now
    try:
        choice = input("\n🚀 Start the application now? (y/N): ").lower().strip()
        if choice in ['y', 'yes']:
            print("\n🚀 Starting AudioBook Organizer...")
            run_command("python app.py", "Starting application")
    except KeyboardInterrupt:
        print("\n👋 Setup completed. Run 'python app.py' when ready!")
        sys.exit(0)

if __name__ == '__main__':
    main() 