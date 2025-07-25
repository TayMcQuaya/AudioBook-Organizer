"""
Verify Account Deletion - Check if all user data was properly deleted
"""

import os
import sys
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def verify_user_deletion(user_email_or_id):
    """
    Verify that all user data has been deleted from the database
    """
    # Initialize Supabase client
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Supabase credentials not found in environment")
        return False
    
    supabase = create_client(supabase_url, supabase_key)
    
    print(f"\n🔍 Checking deletion status for user: {user_email_or_id}")
    print("=" * 60)
    
    # Check profiles table
    try:
        profile_result = supabase.table('profiles').select('*').or_(f'id.eq.{user_email_or_id},email.eq.{user_email_or_id}').execute()
        if profile_result.data:
            print(f"❌ Profile still exists: {profile_result.data}")
        else:
            print("✅ Profile deleted successfully")
    except Exception as e:
        print(f"⚠️  Error checking profiles: {e}")
    
    # Check user_credits table
    try:
        credits_result = supabase.table('user_credits').select('*').eq('user_id', user_email_or_id).execute()
        if credits_result.data:
            print(f"❌ Credits record still exists: {credits_result.data}")
        else:
            print("✅ Credits deleted successfully")
    except Exception as e:
        print(f"⚠️  Error checking credits: {e}")
    
    # Check audiobook_projects table
    try:
        projects_result = supabase.table('audiobook_projects').select('*').eq('user_id', user_email_or_id).execute()
        if projects_result.data:
            print(f"❌ Projects still exist: {len(projects_result.data)} projects found")
        else:
            print("✅ Projects deleted successfully")
    except Exception as e:
        print(f"⚠️  Error checking projects: {e}")
    
    # Check file_uploads table
    try:
        files_result = supabase.table('file_uploads').select('*').eq('user_id', user_email_or_id).execute()
        if files_result.data:
            print(f"❌ File records still exist: {len(files_result.data)} files found")
            # List the files
            for file in files_result.data:
                print(f"   - {file.get('file_name', 'Unknown')} ({file.get('file_type', 'Unknown')})")
        else:
            print("✅ File records deleted successfully")
    except Exception as e:
        print(f"⚠️  Error checking file uploads: {e}")
    
    # Check usage_logs table
    try:
        usage_result = supabase.table('usage_logs').select('*').eq('user_id', user_email_or_id).execute()
        if usage_result.data:
            print(f"❌ Usage logs still exist: {len(usage_result.data)} logs found")
        else:
            print("✅ Usage logs deleted successfully")
    except Exception as e:
        print(f"⚠️  Error checking usage logs: {e}")
    
    # Check auth.users table (if we have access)
    try:
        # This might fail if we don't have service key access
        auth_result = supabase.table('auth.users').select('*').eq('id', user_email_or_id).execute()
        if auth_result.data:
            print(f"⚠️  Auth record still exists (this is expected without admin access)")
        else:
            print("✅ Auth record deleted successfully")
    except Exception as e:
        print(f"ℹ️  Cannot check auth.users table (expected): {e}")
    
    # Check file system for audio files
    print("\n📁 Checking file system for audio files:")
    upload_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
    
    if os.path.exists(upload_folder):
        user_files = []
        for file in os.listdir(upload_folder):
            if user_email_or_id in file:
                user_files.append(file)
        
        if user_files:
            print(f"❌ Found {len(user_files)} files still on disk:")
            for file in user_files:
                print(f"   - {file}")
        else:
            print("✅ No user files found on disk")
    else:
        print("ℹ️  Upload folder not found")
    
    print("\n" + "=" * 60)
    print("Verification complete!")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        user_identifier = sys.argv[1]
    else:
        user_identifier = input("Enter user ID or email to verify deletion: ")
    
    verify_user_deletion(user_identifier)