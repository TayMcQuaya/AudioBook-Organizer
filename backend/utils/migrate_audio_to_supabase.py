#!/usr/bin/env python3
"""
Audio Files Migration Script - Migrate local audio files to Supabase Storage

This script migrates existing audio files from local storage to Supabase Storage.
It should be run during deployment to move existing files to the cloud.

Usage:
    python migrate_audio_to_supabase.py [--dry-run] [--user-id USER_ID]

Options:
    --dry-run: Show what would be migrated without actually migrating
    --user-id: Migrate files for a specific user only
"""

import os
import sys
import argparse
import logging
from typing import List, Dict, Tuple
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.supabase_service import get_supabase_service
from services.supabase_storage_service import get_storage_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AudioMigrator:
    """Handles migration of audio files from local to Supabase Storage"""
    
    def __init__(self, upload_folder: str):
        self.upload_folder = upload_folder
        self.supabase = get_supabase_service()
        self.storage = get_storage_service()
        self.stats = {
            'total_files': 0,
            'migrated': 0,
            'failed': 0,
            'skipped': 0,
            'total_size_mb': 0
        }
    
    def scan_local_files(self) -> List[Dict[str, str]]:
        """Scan upload folder for audio files"""
        audio_files = []
        
        if not os.path.exists(self.upload_folder):
            logger.error(f"Upload folder not found: {self.upload_folder}")
            return audio_files
        
        for filename in os.listdir(self.upload_folder):
            if filename.lower().endswith(('.wav', '.mp3')):
                filepath = os.path.join(self.upload_folder, filename)
                file_size = os.path.getsize(filepath) / (1024 * 1024)  # MB
                
                audio_files.append({
                    'filename': filename,
                    'filepath': filepath,
                    'size_mb': round(file_size, 2)
                })
                
        return audio_files
    
    def find_file_references(self, filename: str) -> List[Dict[str, any]]:
        """Find database references to a file"""
        try:
            # Search in projects table for file references
            response = self.supabase.client.table('projects').select('*').ilike(
                'project_data', f'%{filename}%'
            ).execute()
            
            references = []
            for project in response.data:
                # Parse project data to find exact references
                if project.get('project_data'):
                    import json
                    try:
                        data = json.loads(project['project_data'])
                        for chapter in data.get('chapters', []):
                            for section in chapter.get('sections', []):
                                if section.get('audioPath', '').endswith(filename):
                                    references.append({
                                        'user_id': project['user_id'],
                                        'project_id': project['id'],
                                        'chapter_id': chapter['id'],
                                        'section_id': section['id'],
                                        'audio_path': section['audioPath']
                                    })
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse project data for project {project['id']}")
            
            return references
            
        except Exception as e:
            logger.error(f"Error finding references for {filename}: {e}")
            return []
    
    def migrate_file(self, file_info: Dict[str, str], references: List[Dict], 
                     dry_run: bool = False) -> Tuple[bool, str]:
        """Migrate a single file to Supabase Storage"""
        filename = file_info['filename']
        filepath = file_info['filepath']
        
        if not references:
            logger.info(f"⚠️  No references found for {filename}, skipping")
            self.stats['skipped'] += 1
            return True, "No references found"
        
        # Use the first reference to determine storage path
        ref = references[0]
        user_id = ref['user_id']
        
        # Generate a project ID if not exists
        project_id = f"migrated_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Create storage path
        storage_path = self.storage.generate_storage_path(
            user_id, project_id, 
            ref.get('chapter_id', 1), 
            ref.get('section_id', 1), 
            filename
        )
        
        if dry_run:
            logger.info(f"🔍 [DRY RUN] Would migrate {filename} -> {storage_path}")
            return True, "Dry run - no action taken"
        
        try:
            # Check user quota
            has_space, message = self.storage.check_user_storage_quota(
                user_id, file_info['size_mb']
            )
            
            if not has_space:
                logger.warning(f"❌ {message} for {filename}")
                self.stats['failed'] += 1
                return False, message
            
            # Migrate the file
            logger.info(f"📤 Migrating {filename} ({file_info['size_mb']} MB)...")
            success, error = self.storage.migrate_local_file_to_storage(
                filepath, storage_path
            )
            
            if success:
                # Create file upload record
                upload_id = self.storage.create_file_upload_record(
                    user_id, project_id, filename, file_info['size_mb'],
                    storage_path, ref.get('chapter_id', 1), ref.get('section_id', 1)
                )
                
                # Update all project references
                for ref in references:
                    self.update_project_reference(ref, storage_path)
                
                logger.info(f"✅ Successfully migrated {filename}")
                self.stats['migrated'] += 1
                self.stats['total_size_mb'] += file_info['size_mb']
                
                # Optionally delete local file after successful migration
                # os.remove(filepath)
                
                return True, "Migration successful"
            else:
                logger.error(f"❌ Failed to migrate {filename}: {error}")
                self.stats['failed'] += 1
                return False, error
                
        except Exception as e:
            logger.error(f"❌ Error migrating {filename}: {e}")
            self.stats['failed'] += 1
            return False, str(e)
    
    def update_project_reference(self, reference: Dict, new_storage_path: str):
        """Update project data to use new storage path"""
        try:
            # Get current project data
            response = self.supabase.client.table('projects').select('*').eq(
                'id', reference['project_id']
            ).execute()
            
            if not response.data:
                return
            
            project = response.data[0]
            import json
            
            # Update the audio path in project data
            data = json.loads(project['project_data'])
            updated = False
            
            for chapter in data.get('chapters', []):
                if chapter['id'] == reference['chapter_id']:
                    for section in chapter.get('sections', []):
                        if section['id'] == reference['section_id']:
                            section['audioPath'] = new_storage_path
                            section['storageBackend'] = 'supabase'
                            updated = True
                            break
            
            if updated:
                # Save updated project data
                self.supabase.client.table('projects').update({
                    'project_data': json.dumps(data),
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('id', reference['project_id']).execute()
                
                logger.debug(f"Updated project {reference['project_id']} reference")
                
        except Exception as e:
            logger.error(f"Failed to update project reference: {e}")
    
    def run_migration(self, dry_run: bool = False, user_id: str = None):
        """Run the migration process"""
        logger.info("🚀 Starting audio file migration to Supabase Storage")
        logger.info(f"Upload folder: {self.upload_folder}")
        
        if dry_run:
            logger.info("🔍 Running in DRY RUN mode - no files will be migrated")
        
        # Scan for audio files
        audio_files = self.scan_local_files()
        self.stats['total_files'] = len(audio_files)
        
        if not audio_files:
            logger.info("No audio files found to migrate")
            return
        
        logger.info(f"Found {len(audio_files)} audio files to process")
        
        # Process each file
        for i, file_info in enumerate(audio_files, 1):
            logger.info(f"\n[{i}/{len(audio_files)}] Processing {file_info['filename']}")
            
            # Find references in database
            references = self.find_file_references(file_info['filename'])
            
            # Filter by user if specified
            if user_id:
                references = [r for r in references if r['user_id'] == user_id]
            
            # Migrate the file
            self.migrate_file(file_info, references, dry_run)
        
        # Print summary
        logger.info("\n" + "="*50)
        logger.info("📊 Migration Summary:")
        logger.info(f"Total files found: {self.stats['total_files']}")
        logger.info(f"Successfully migrated: {self.stats['migrated']}")
        logger.info(f"Failed: {self.stats['failed']}")
        logger.info(f"Skipped (no references): {self.stats['skipped']}")
        logger.info(f"Total data migrated: {self.stats['total_size_mb']:.2f} MB")
        logger.info("="*50)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Migrate audio files from local storage to Supabase Storage'
    )
    parser.add_argument(
        '--dry-run', 
        action='store_true',
        help='Show what would be migrated without actually migrating'
    )
    parser.add_argument(
        '--user-id',
        type=str,
        help='Migrate files for a specific user only'
    )
    parser.add_argument(
        '--upload-folder',
        type=str,
        default=os.environ.get('UPLOAD_FOLDER', './uploads'),
        help='Path to the upload folder (default: ./uploads)'
    )
    
    args = parser.parse_args()
    
    # Check environment
    if not os.environ.get('SUPABASE_URL'):
        logger.error("SUPABASE_URL environment variable not set")
        sys.exit(1)
    
    if not os.environ.get('SUPABASE_SERVICE_KEY'):
        logger.error("SUPABASE_SERVICE_KEY environment variable not set")
        sys.exit(1)
    
    # Run migration
    migrator = AudioMigrator(args.upload_folder)
    migrator.run_migration(dry_run=args.dry_run, user_id=args.user_id)


if __name__ == '__main__':
    main()