"""
Supabase Storage Service
Handles audio file uploads and management using Supabase Storage
"""

import os
import logging
from typing import Dict, Any, Optional, Tuple
from io import BytesIO
import mimetypes
from datetime import datetime, timedelta

from ..services.supabase_service import get_supabase_service

logger = logging.getLogger(__name__)

class SupabaseStorageService:
    """Service for managing audio files in Supabase Storage"""
    
    BUCKET_NAME = 'audiofiles'
    ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav']
    MAX_FILE_SIZE_MB = 50
    SIGNED_URL_EXPIRY = 3600  # 1 hour
    
    def __init__(self):
        """Initialize storage service with Supabase client"""
        self.supabase_service = get_supabase_service()
        self.supabase = self.supabase_service.get_service_client()  # Use service client to bypass RLS
        self.storage_enabled = os.environ.get('STORAGE_BACKEND', 'local') == 'supabase'
        
        if self.storage_enabled:
            logger.info("🗄️ Supabase Storage service initialized with service role")
        else:
            logger.info("📁 Using local storage (Supabase Storage disabled)")
    
    def is_enabled(self) -> bool:
        """Check if Supabase Storage is enabled"""
        return self.storage_enabled
    
    def check_user_storage_quota(self, user_id: str, file_size_mb: float) -> Tuple[bool, str]:
        """
        Check if user has enough storage quota for the file
        
        Returns:
            Tuple of (has_space, message)
        """
        try:
            # Get user's storage quota and usage
            result = self.supabase.rpc(
                'check_storage_availability',
                {'p_user_id': user_id, 'p_file_size_mb': file_size_mb}
            ).execute()
            
            has_space = result.data if result.data is not None else False
            
            if not has_space:
                # Get current usage for detailed message
                credits_data = self.supabase.table('user_credits')\
                    .select('storage_quota_mb, storage_used_mb')\
                    .eq('user_id', user_id)\
                    .single()\
                    .execute()
                
                if credits_data.data:
                    quota = credits_data.data['storage_quota_mb']
                    used = credits_data.data['storage_used_mb'] or 0
                    remaining = quota - used
                    
                    return False, f"Insufficient storage space. You have {remaining:.1f}MB remaining out of {quota}MB quota."
                else:
                    return False, "Unable to check storage quota."
            
            return True, "Storage space available"
            
        except Exception as e:
            logger.error(f"Error checking storage quota: {e}")
            return False, "Error checking storage availability"
    
    def generate_storage_path(self, user_id: str, project_id: str, 
                            chapter_id: int, section_id: int, filename: str) -> str:
        """Generate organized storage path for audio file"""
        # Clean filename
        clean_filename = "".join(c for c in filename if c.isalnum() or c in '._-')
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Path structure: user_id/project_id/chapter_section_timestamp_filename
        return f"{user_id}/{project_id}/{chapter_id}_{section_id}_{timestamp}_{clean_filename}"
    
    def upload_audio_file(self, file_data: bytes, storage_path: str, 
                         mime_type: str = 'audio/wav') -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Upload audio file to Supabase Storage
        
        Returns:
            Tuple of (success, storage_path, error_message)
        """
        try:
            # Validate mime type
            if mime_type not in self.ALLOWED_MIME_TYPES:
                return False, None, f"Invalid file type. Allowed types: {', '.join(self.ALLOWED_MIME_TYPES)}"
            
            # Upload to Supabase Storage
            result = self.supabase.storage.from_(self.BUCKET_NAME).upload(
                file=file_data,
                path=storage_path,
                file_options={"content-type": mime_type}
            )
            
            logger.info(f"✅ Audio file uploaded to Supabase Storage: {storage_path}")
            return True, storage_path, None
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Failed to upload to Supabase Storage: {error_msg}")
            
            # Check for specific errors
            if "Bucket not found" in error_msg:
                return False, None, "Storage bucket not configured. Please contact support."
            elif "row-level security" in error_msg.lower():
                return False, None, "Storage access denied. Please try again or contact support."
            else:
                return False, None, f"Storage upload failed: {error_msg}"
    
    def get_signed_url(self, storage_path: str, expires_in: int = None) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Get signed URL for audio file access
        
        Returns:
            Tuple of (success, signed_url, error_message)
        """
        try:
            expires_in = expires_in or self.SIGNED_URL_EXPIRY
            
            # Generate signed URL
            result = self.supabase.storage.from_(self.BUCKET_NAME).create_signed_url(
                path=storage_path,
                expires_in=expires_in
            )
            
            if result.get('signedURL'):
                return True, result['signedURL'], None
            else:
                return False, None, "Failed to generate signed URL"
                
        except Exception as e:
            logger.error(f"Error generating signed URL: {e}")
            return False, None, f"Error accessing file: {str(e)}"
    
    def delete_audio_file(self, storage_path: str) -> Tuple[bool, Optional[str]]:
        """
        Delete audio file from Supabase Storage
        
        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Delete from storage
            result = self.supabase.storage.from_(self.BUCKET_NAME).remove([storage_path])
            
            logger.info(f"🗑️ Audio file deleted from storage: {storage_path}")
            return True, None
            
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            return False, f"Failed to delete file: {str(e)}"
    
    def create_file_upload_record(self, user_id: str, project_id: str, 
                                 filename: str, file_size_mb: float,
                                 storage_path: str, chapter_id: int, 
                                 section_id: int) -> Optional[str]:
        """
        Create record in file_uploads table
        
        Returns:
            Upload ID if successful, None if failed
        """
        try:
            data = {
                'user_id': user_id,
                'project_id': project_id,
                'filename': filename,
                'file_size_mb': file_size_mb,
                'file_type': 'audio/wav',
                'storage_bucket': self.BUCKET_NAME,
                'storage_path': storage_path,
                'chapter_id': chapter_id,
                'section_id': section_id,
                'upload_status': 'completed',
                'processing_status': 'completed',
                'metadata': {
                    'original_filename': filename,
                    'upload_timestamp': datetime.now().isoformat()
                }
            }
            
            result = self.supabase.table('file_uploads').insert(data).execute()
            
            if result.data:
                return result.data[0]['id']
            return None
            
        except Exception as e:
            logger.error(f"Error creating file upload record: {e}")
            return None
    
    def get_user_storage_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user's storage usage statistics"""
        try:
            result = self.supabase.table('user_credits')\
                .select('storage_quota_mb, storage_used_mb')\
                .eq('user_id', user_id)\
                .single()\
                .execute()
            
            if result.data:
                quota = result.data['storage_quota_mb'] or 500
                used = result.data['storage_used_mb'] or 0
                
                return {
                    'quota_mb': quota,
                    'used_mb': round(used, 2),
                    'remaining_mb': round(quota - used, 2),
                    'usage_percentage': round((used / quota * 100) if quota > 0 else 0, 2),
                    'tier': 'Paid' if quota > 500 else 'Free'
                }
            
            return {
                'quota_mb': 500,
                'used_mb': 0,
                'remaining_mb': 500,
                'usage_percentage': 0,
                'tier': 'Free'
            }
            
        except Exception as e:
            logger.error(f"Error getting storage stats: {e}")
            return {
                'quota_mb': 500,
                'used_mb': 0,
                'remaining_mb': 500,
                'usage_percentage': 0,
                'tier': 'Free',
                'error': str(e)
            }
    
    def migrate_local_file_to_storage(self, local_path: str, storage_path: str) -> Tuple[bool, Optional[str]]:
        """
        Migrate a local file to Supabase Storage (used for migration script)
        
        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Read local file
            with open(local_path, 'rb') as f:
                file_data = f.read()
            
            # Get mime type
            mime_type, _ = mimetypes.guess_type(local_path)
            if not mime_type:
                mime_type = 'audio/wav'
            
            # Upload to storage
            success, path, error = self.upload_audio_file(file_data, storage_path, mime_type)
            
            if success:
                logger.info(f"✅ Migrated {local_path} to {storage_path}")
                return True, None
            else:
                return False, error
                
        except Exception as e:
            logger.error(f"Error migrating file: {e}")
            return False, str(e)
    
    def download_audio_file(self, storage_path: str) -> Tuple[bool, Optional[bytes], Optional[str]]:
        """
        Download audio file from Supabase Storage
        
        Args:
            storage_path: Path to file in storage bucket
            
        Returns:
            Tuple of (success, file_data, error_message)
        """
        if not self.is_enabled():
            return False, None, "Storage service not enabled"
        
        try:
            # Download from storage bucket
            response = self.supabase.storage.from_(self.bucket_name).download(storage_path)
            
            if response:
                logger.info(f"✅ Downloaded file from storage: {storage_path}")
                return True, response, None
            else:
                return False, None, "No data returned from storage"
                
        except Exception as e:
            logger.error(f"Error downloading from storage: {e}")
            return False, None, str(e)

# Singleton instance
_storage_service = None

def get_storage_service() -> SupabaseStorageService:
    """Get or create storage service instance"""
    global _storage_service
    if _storage_service is None:
        _storage_service = SupabaseStorageService()
    return _storage_service