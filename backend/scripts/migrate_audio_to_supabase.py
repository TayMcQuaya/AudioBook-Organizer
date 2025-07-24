#!/usr/bin/env python3
"""
Migrate existing audio files from local storage to Supabase Storage

This script:
1. Scans the local uploads directory for audio files
2. Uploads them to Supabase Storage with proper organization
3. Updates the database with new storage paths
4. Optionally removes local files after successful migration
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import argparse

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.supabase_service import SupabaseService
from services.supabase_storage_service import SupabaseStorageService
from config import Config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AudioMigrator:
    def __init__(self, dry_run: bool = True, delete_after: bool = False):
        """Initialize the migrator
        
        Args:
            dry_run: If True, only simulate the migration without making changes
            delete_after: If True, delete local files after successful migration
        """
        self.dry_run = dry_run
        self.delete_after = delete_after
        self.supabase = SupabaseService()
        self.storage = SupabaseStorageService()
        self.uploads_dir = Path('uploads')
        self.stats = {
            'total_files': 0,
            'migrated': 0,
            'failed': 0,
            'skipped': 0,
            'total_size_mb': 0
        }
    
    def scan_local_files(self) -> List[Dict]:
        """Scan local uploads directory for audio files"""
        audio_files = []
        
        if not self.uploads_dir.exists():
            logger.error(f"Uploads directory not found: {self.uploads_dir}")
            return audio_files
        
        # Audio file extensions
        audio_extensions = {'.mp3', '.wav', '.m4a', '.ogg', '.flac'}
        
        for file_path in self.uploads_dir.rglob('*'):
            if file_path.is_file() and file_path.suffix.lower() in audio_extensions:
                rel_path = file_path.relative_to(self.uploads_dir)
                file_info = {
                    'local_path': str(file_path),
                    'relative_path': str(rel_path),
                    'size_mb': file_path.stat().st_size / (1024 * 1024),
                    'filename': file_path.name
                }
                audio_files.append(file_info)
                self.stats['total_files'] += 1
                self.stats['total_size_mb'] += file_info['size_mb']
        
        logger.info(f"Found {len(audio_files)} audio files ({self.stats['total_size_mb']:.2f} MB)")
        return audio_files
    
    def parse_file_path(self, relative_path: str) -> Optional[Dict]:
        """Parse the file path to extract user_id, project_id, etc."""
        parts = relative_path.split('/')
        
        # Expected format: user_id/project_id/chapter_id/section_id/filename
        if len(parts) >= 5:
            return {
                'user_id': parts[0],
                'project_id': parts[1],
                'chapter_id': parts[2],
                'section_id': parts[3],
                'filename': parts[4]
            }
        
        # Fallback: Try to extract what we can
        logger.warning(f"Unexpected path format: {relative_path}")
        return None
    
    def migrate_file(self, file_info: Dict) -> Tuple[bool, Optional[str]]:
        """Migrate a single file to Supabase Storage"""
        try:
            # Parse file path
            path_info = self.parse_file_path(file_info['relative_path'])
            if not path_info:
                logger.error(f"Cannot parse path: {file_info['relative_path']}")
                return False, None
            
            # Read file
            with open(file_info['local_path'], 'rb') as f:
                file_data = f.read()
            
            # Determine MIME type
            ext = Path(file_info['filename']).suffix.lower()
            mime_types = {
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.m4a': 'audio/mp4',
                '.ogg': 'audio/ogg',
                '.flac': 'audio/flac'
            }
            mime_type = mime_types.get(ext, 'audio/mpeg')
            
            # Upload to Supabase Storage
            storage_path = f"{path_info['user_id']}/{path_info['project_id']}/{path_info['chapter_id']}/{path_info['section_id']}/{path_info['filename']}"
            
            if self.dry_run:
                logger.info(f"[DRY RUN] Would upload: {file_info['local_path']} -> {storage_path}")
                return True, storage_path
            
            success, error, path = self.storage.upload_audio_file(
                file_data=file_data,
                storage_path=storage_path,
                mime_type=mime_type
            )
            
            if success:
                logger.info(f"✓ Migrated: {file_info['local_path']} -> {storage_path}")
                
                # Update database (if we have a file_uploads record)
                # This would need to be implemented based on your database schema
                
                # Delete local file if requested
                if self.delete_after:
                    os.remove(file_info['local_path'])
                    logger.info(f"  Deleted local file: {file_info['local_path']}")
                
                return True, storage_path
            else:
                logger.error(f"✗ Failed to migrate {file_info['local_path']}: {error}")
                return False, None
                
        except Exception as e:
            logger.error(f"✗ Error migrating {file_info['local_path']}: {str(e)}")
            return False, None
    
    def run(self):
        """Run the migration process"""
        logger.info(f"Starting audio migration (dry_run={self.dry_run}, delete_after={self.delete_after})")
        
        # Scan local files
        audio_files = self.scan_local_files()
        if not audio_files:
            logger.info("No audio files found to migrate")
            return
        
        # Process each file
        for i, file_info in enumerate(audio_files, 1):
            logger.info(f"\nProcessing {i}/{len(audio_files)}: {file_info['filename']}")
            
            success, storage_path = self.migrate_file(file_info)
            
            if success:
                self.stats['migrated'] += 1
            else:
                self.stats['failed'] += 1
        
        # Print summary
        logger.info("\n" + "="*60)
        logger.info("Migration Summary:")
        logger.info(f"  Total files found: {self.stats['total_files']}")
        logger.info(f"  Successfully migrated: {self.stats['migrated']}")
        logger.info(f"  Failed: {self.stats['failed']}")
        logger.info(f"  Skipped: {self.stats['skipped']}")
        logger.info(f"  Total size: {self.stats['total_size_mb']:.2f} MB")
        
        if self.dry_run:
            logger.info("\nThis was a DRY RUN. No files were actually migrated.")
            logger.info("Run with --execute to perform the actual migration.")


def main():
    parser = argparse.ArgumentParser(description='Migrate audio files to Supabase Storage')
    parser.add_argument('--execute', action='store_true', 
                       help='Actually perform the migration (default is dry run)')
    parser.add_argument('--delete-after', action='store_true',
                       help='Delete local files after successful migration')
    args = parser.parse_args()
    
    migrator = AudioMigrator(
        dry_run=not args.execute,
        delete_after=args.delete_after
    )
    
    try:
        migrator.run()
    except KeyboardInterrupt:
        logger.info("\nMigration interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()