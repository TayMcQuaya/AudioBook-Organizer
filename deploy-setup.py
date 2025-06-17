#!/usr/bin/env python3
"""
AudioBook Organizer - Deployment Setup Script

This script helps prepare the application for deployment by:
1. Updating the frontend configuration with the actual backend URL
2. Setting up environment variables
3. Providing deployment instructions

Usage:
    python deploy-setup.py --backend-url https://your-backend-url.ondigitalocean.app
"""

import argparse
import os
import re
import json
from pathlib import Path

def update_frontend_config(backend_url):
    """Update frontend configuration files with the backend URL"""
    
    # Update index.html
    index_html_path = Path('frontend/public/index.html')
    if index_html_path.exists():
        with open(index_html_path, 'r') as f:
            content = f.read()
        
        # Replace the placeholder in the configuration script
        content = content.replace('REPLACE_WITH_BACKEND_URL', backend_url)
        
        with open(index_html_path, 'w') as f:
            f.write(content)
        
        print(f"✅ Updated frontend configuration in {index_html_path}")
    
    # Update vercel.json
    vercel_json_path = Path('vercel.json')
    if vercel_json_path.exists():
        with open(vercel_json_path, 'r') as f:
            content = f.read()
        
        # Replace the placeholder in vercel.json
        content = content.replace('REPLACE_WITH_BACKEND_URL', backend_url)
        
        with open(vercel_json_path, 'w') as f:
            f.write(content)
        
        print(f"✅ Updated Vercel configuration in {vercel_json_path}")

def create_env_template(backend_url):
    """Create environment template files"""
    
    # Create .env.production template
    env_prod_content = f"""# Production Environment Variables for DigitalOcean
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=your-secret-key-here
PORT=8000

# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET_KEY=your-jwt-secret

# Security Configuration
RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key

# Optional: Testing Mode (set to false for production)
TESTING_MODE=false
TEMPORARY_PASSWORD=your-temp-password
"""
    
    with open('.env.production', 'w') as f:
        f.write(env_prod_content)
    
    print("✅ Created .env.production template")

def print_deployment_instructions(backend_url):
    """Print deployment instructions"""
    
    print("\n" + "="*60)
    print("🚀 DEPLOYMENT INSTRUCTIONS")
    print("="*60)
    
    print("\n📦 BACKEND DEPLOYMENT (DigitalOcean):")
    print("1. Go to DigitalOcean App Platform")
    print("2. Create new app from GitHub repository")
    print("3. Choose your repository and branch")
    print("4. Set environment variables in DigitalOcean dashboard:")
    print("   - FLASK_ENV=production")
    print("   - SECRET_KEY=<your-secret-key>")
    print("   - SUPABASE_URL=<your-supabase-url>")
    print("   - SUPABASE_ANON_KEY=<your-anon-key>")
    print("   - JWT_SECRET_KEY=<your-jwt-secret>")
    print("   - RECAPTCHA_SITE_KEY=<your-recaptcha-site-key>")
    print("   - RECAPTCHA_SECRET_KEY=<your-recaptcha-secret>")
    print("5. Deploy and note the URL")
    
    print("\n🌐 FRONTEND DEPLOYMENT (Vercel):")
    print("1. Go to Vercel dashboard")
    print("2. Import your GitHub repository")
    print("3. Set build settings:")
    print("   - Framework Preset: Other")
    print("   - Root Directory: frontend")
    print("   - Build Command: (leave empty)")
    print("   - Output Directory: (leave empty)")
    print("4. Deploy")
    
    print(f"\n✅ Your backend URL is configured as: {backend_url}")
    print("\n⚠️  IMPORTANT:")
    print("- Make sure to set all environment variables in DigitalOcean")
    print("- Test the deployment with the test endpoints")
    print("- Check logs if anything doesn't work")
    
    print("\n🔧 Local Development:")
    print("- Use 'python app.py' for local development")
    print("- Environment variables will be loaded from .env file")
    print("- Frontend will automatically use relative URLs for local development")

def main():
    parser = argparse.ArgumentParser(description='Prepare AudioBook Organizer for deployment')
    parser.add_argument('--backend-url', required=True, 
                       help='Backend URL from DigitalOcean (e.g., https://your-app.ondigitalocean.app)')
    
    args = parser.parse_args()
    
    backend_url = args.backend_url.rstrip('/')  # Remove trailing slash
    
    print("🔧 Preparing AudioBook Organizer for deployment...")
    print(f"Backend URL: {backend_url}")
    
    # Update configuration files
    update_frontend_config(backend_url)
    
    # Create environment templates
    create_env_template(backend_url)
    
    # Print instructions
    print_deployment_instructions(backend_url)
    
    print("\n✅ Deployment preparation complete!")
    print("💡 Run this script again if you need to change the backend URL")

if __name__ == '__main__':
    main() 