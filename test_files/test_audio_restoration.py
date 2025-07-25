#!/usr/bin/env python3
"""
Audio Restoration Test Script

This script helps test the audio file restoration functionality 
by simulating different scenarios where audio files might be missing.

Usage:
1. Start your local server
2. Create a project with some audio files
3. Run this script to simulate missing files
4. Refresh the app page to test restoration
"""

import os
import sys
import shutil
import tempfile
import json
from pathlib import Path

def get_uploads_folder():
    """Get the uploads folder path"""
    # Look for uploads folder in project root
    current_dir = Path(__file__).parent.parent
    uploads_dir = current_dir / "uploads"
    
    if uploads_dir.exists():
        return uploads_dir
    else:
        print(f"❌ Uploads folder not found at: {uploads_dir}")
        return None

def list_audio_files(uploads_dir):
    """List all audio files in uploads directory"""
    if not uploads_dir or not uploads_dir.exists():
        return []
    
    audio_extensions = ['.wav', '.mp3', '.m4a', '.ogg']
    audio_files = []
    
    for file_path in uploads_dir.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in audio_extensions:
            audio_files.append(file_path)
    
    return audio_files

def backup_audio_files(uploads_dir, backup_dir):
    """Backup audio files to test restoration"""
    if not uploads_dir or not uploads_dir.exists():
        print("❌ Uploads directory not found")
        return False
    
    audio_files = list_audio_files(uploads_dir)
    if not audio_files:
        print("📭 No audio files found to backup")
        return False
    
    backup_dir.mkdir(exist_ok=True)
    
    for file_path in audio_files:
        backup_path = backup_dir / file_path.name
        shutil.copy2(file_path, backup_path)
        print(f"📦 Backed up: {file_path.name}")
    
    return True

def simulate_missing_files(uploads_dir, num_files=1):
    """Simulate missing audio files by temporarily moving them"""
    audio_files = list_audio_files(uploads_dir)
    if not audio_files:
        print("📭 No audio files found to simulate missing")
        return []
    
    # Move first few files to simulate missing
    moved_files = []
    for i, file_path in enumerate(audio_files[:num_files]):
        temp_path = file_path.with_suffix(file_path.suffix + '.backup')
        shutil.move(file_path, temp_path)
        moved_files.append((file_path, temp_path))
        print(f"🔄 Simulated missing: {file_path.name}")
    
    return moved_files

def restore_files(moved_files):
    """Restore files that were moved to simulate missing"""
    for original_path, temp_path in moved_files:
        if temp_path.exists():
            shutil.move(temp_path, original_path)
            print(f"✅ Restored: {original_path.name}")

def main():
    print("🎵 Audio Restoration Test Script")
    print("=" * 50)
    
    # Get uploads directory
    uploads_dir = get_uploads_folder()
    if not uploads_dir:
        print("❌ Cannot find uploads directory. Make sure server has been run at least once.")
        return
    
    print(f"📁 Using uploads directory: {uploads_dir}")
    
    # List current audio files
    audio_files = list_audio_files(uploads_dir)
    print(f"🎵 Found {len(audio_files)} audio files:")
    for file_path in audio_files:
        file_size = file_path.stat().st_size / 1024  # KB
        print(f"   - {file_path.name} ({file_size:.1f} KB)")
    
    if not audio_files:
        print("\n⚠️ No audio files found. Please:")
        print("   1. Start the application")
        print("   2. Upload some audio files to sections")
        print("   3. Run this test script again")
        return
    
    print("\n🧪 Test Options:")
    print("1. Simulate missing files (temporarily move files)")
    print("2. Create backup and remove files")
    print("3. List files only")
    print("4. Exit")
    
    choice = input("\nEnter your choice (1-4): ").strip()
    
    if choice == "1":
        # Simulate missing files
        num_files = min(2, len(audio_files))
        print(f"\n🔄 Simulating {num_files} missing audio files...")
        moved_files = simulate_missing_files(uploads_dir, num_files)
        
        print("\n✅ Test Setup Complete!")
        print("Now:")
        print("   1. Refresh your app page")
        print("   2. Check if missing audio warnings appear")
        print("   3. Test re-uploading or clearing missing audio")
        
        input("\nPress Enter when ready to restore files...")
        restore_files(moved_files)
        print("✅ Files restored!")
        
    elif choice == "2":
        # Create backup and remove files
        backup_dir = Path(tempfile.mkdtemp(prefix="audio_backup_"))
        print(f"\n📦 Creating backup in: {backup_dir}")
        
        if backup_audio_files(uploads_dir, backup_dir):
            # Remove original files
            audio_files = list_audio_files(uploads_dir)
            for file_path in audio_files[:2]:  # Remove first 2 files
                file_path.unlink()
                print(f"🗑️ Removed: {file_path.name}")
            
            print(f"\n✅ Test Setup Complete!")
            print(f"📦 Backup location: {backup_dir}")
            print("Now:")
            print("   1. Refresh your app page")
            print("   2. Check if missing audio warnings appear")
            print("   3. Test the restoration functionality")
            print(f"   4. Manually restore files from: {backup_dir}")
        
    elif choice == "3":
        # Just list files
        print("\n📋 Audio files listing complete")
        
    else:
        print("👋 Exiting...")

if __name__ == "__main__":
    main() 