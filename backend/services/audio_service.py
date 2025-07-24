import os
import time
import logging
from werkzeug.utils import secure_filename
from typing import Dict, Any, Optional
from io import BytesIO

from ..utils.audio_utils import process_audio_file
from ..utils.file_utils import generate_unique_filename, create_url_safe_path

logger = logging.getLogger(__name__)

class AudioService:
    """Service for handling audio file operations"""
    
    def __init__(self, upload_folder):
        self.upload_folder = upload_folder
        self.storage_service = None
        self.use_supabase_storage = os.environ.get('STORAGE_BACKEND', 'local') == 'supabase'
        
        if self.use_supabase_storage:
            try:
                from ..services.supabase_storage_service import get_storage_service
                self.storage_service = get_storage_service()
                logger.info("🗄️ AudioService using Supabase Storage backend")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase Storage: {e}")
                logger.info("📁 Falling back to local storage")
                self.use_supabase_storage = False
        else:
            logger.info("📁 AudioService using local storage backend")
    
    def upload_audio_file(self, file):
        """
        Handle audio file upload with conversion.
        Preserves the exact logic from original server.py upload_audio() function
        """
        if not file or file.filename == '':
            raise ValueError('No selected file')
        
        # Generate a unique filename using timestamp - exact logic preserved
        timestamp = int(time.time() * 1000)
        original_filename = secure_filename(file.filename)
        
        # Save the uploaded file temporarily - exact logic preserved
        temp_path = os.path.join(self.upload_folder, f"temp_{original_filename}")
        file.save(temp_path)
        
        try:
            import logging
            logger = logging.getLogger(__name__)
            
            logger.info(f'Processing audio file: {original_filename}')
            logger.info(f'Temp file path: {temp_path}')
            logger.info(f'Upload folder: {self.upload_folder}')
            
            # Process the audio file (convert if needed) - exact logic preserved
            filename, filepath = process_audio_file(
                temp_path, original_filename, self.upload_folder, timestamp
            )
            
            logger.info(f'Audio processed successfully: {filename}')
            logger.info(f'Final file path: {filepath}')
            
            # Verify the file was created
            if not os.path.exists(filepath):
                raise FileNotFoundError(f'Processed audio file not found at: {filepath}')
            
            # Create a URL-safe path for the frontend - exact logic preserved
            safe_path = create_url_safe_path(filename)
            logger.info(f'Generated safe path: {safe_path}')
            
            return {
                'success': True,
                'filename': filename,
                'path': safe_path
            }
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Audio processing failed for {original_filename}: {str(e)}')
            logger.error(f'Error type: {type(e).__name__}')
            
            # Clean up temp file if it still exists
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                    logger.info(f'Cleaned up temp file: {temp_path}')
                except Exception as cleanup_error:
                    logger.error(f'Failed to clean up temp file: {cleanup_error}')
            
            raise e
    
    def upload_audio_file_with_storage(self, file, user_id: str, project_id: str, 
                                     chapter_id: int, section_id: int) -> Dict[str, Any]:
        """
        Handle audio file upload with Supabase Storage support
        
        Args:
            file: File object from request
            user_id: User ID for storage organization
            project_id: Project ID
            chapter_id: Chapter ID
            section_id: Section ID
            
        Returns:
            Dict with success, filename, path, and storage_path
        """
        if not file or file.filename == '':
            raise ValueError('No selected file')
        
        # Generate a unique filename using timestamp
        timestamp = int(time.time() * 1000)
        original_filename = secure_filename(file.filename)
        
        # Save the uploaded file temporarily
        temp_path = os.path.join(self.upload_folder, f"temp_{original_filename}")
        file.save(temp_path)
        
        try:
            logger.info(f'Processing audio file for Supabase Storage: {original_filename}')
            
            # Process the audio file (convert if needed)
            filename, filepath = process_audio_file(
                temp_path, original_filename, self.upload_folder, timestamp
            )
            
            # If using Supabase Storage, upload the processed file
            if self.use_supabase_storage and self.storage_service:
                try:
                    # Read the processed file
                    with open(filepath, 'rb') as f:
                        file_data = f.read()
                    
                    # Calculate file size in MB
                    file_size_mb = len(file_data) / (1024 * 1024)
                    
                    # Check storage quota
                    has_space, message = self.storage_service.check_user_storage_quota(
                        user_id, file_size_mb
                    )
                    
                    if not has_space:
                        # Clean up local file
                        if os.path.exists(filepath):
                            os.remove(filepath)
                        raise ValueError(message)
                    
                    # Generate storage path
                    storage_path = self.storage_service.generate_storage_path(
                        user_id, project_id, chapter_id, section_id, filename
                    )
                    
                    # Upload to Supabase
                    success, uploaded_path, error = self.storage_service.upload_audio_file(
                        file_data, storage_path, 'audio/wav'
                    )
                    
                    if not success:
                        # Clean up local file
                        if os.path.exists(filepath):
                            os.remove(filepath)
                        raise ValueError(f"Storage upload failed: {error}")
                    
                    # Create database record
                    upload_id = self.storage_service.create_file_upload_record(
                        user_id, project_id, filename, file_size_mb,
                        storage_path, chapter_id, section_id
                    )
                    
                    # Clean up local file after successful upload
                    if os.path.exists(filepath):
                        os.remove(filepath)
                    
                    logger.info(f'✅ Audio uploaded to Supabase Storage: {storage_path}')
                    
                    return {
                        'success': True,
                        'filename': filename,
                        'path': storage_path,  # Return storage path for Supabase
                        'storage_backend': 'supabase',
                        'upload_id': upload_id,
                        'file_size_mb': round(file_size_mb, 2)
                    }
                    
                except Exception as storage_error:
                    logger.error(f"Supabase Storage error, falling back to local: {storage_error}")
                    # Fall through to local storage
            
            # Local storage (original behavior)
            safe_path = create_url_safe_path(filename)
            file_size_mb = os.path.getsize(filepath) / (1024 * 1024)
            
            # Update storage usage for local storage too
            if hasattr(self, 'storage_service') and self.storage_service:
                try:
                    # Update user's storage usage
                    self.supabase.rpc('update_user_storage', {
                        'p_user_id': user_id,
                        'p_size_mb': file_size_mb,
                        'p_operation': 'add'
                    }).execute()
                except Exception as e:
                    logger.warning(f"Failed to update storage usage for local file: {e}")
            
            return {
                'success': True,
                'filename': filename,
                'path': safe_path,
                'storage_backend': 'local',
                'file_size_mb': round(file_size_mb, 2)
            }
            
        except Exception as e:
            logger.error(f'Audio upload failed: {str(e)}')
            
            # Clean up temp file if it still exists
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception as cleanup_error:
                    logger.error(f'Failed to clean up temp file: {cleanup_error}')
            
            raise e
    
    def get_audio_url(self, audio_path: str, is_supabase_path: bool = None) -> str:
        """
        Get the appropriate URL for audio file access
        
        Args:
            audio_path: The path to the audio file
            is_supabase_path: Whether this is a Supabase Storage path (auto-detect if None)
            
        Returns:
            URL for accessing the audio file
        """
        # Auto-detect if this is a Supabase path
        if is_supabase_path is None:
            # Supabase paths have UUID format at the start
            is_supabase_path = '/' in audio_path and len(audio_path.split('/')[0]) == 36
        
        if is_supabase_path and self.storage_service:
            # Get signed URL from Supabase
            success, signed_url, error = self.storage_service.get_signed_url(audio_path)
            if success:
                return signed_url
            else:
                logger.error(f"Failed to get signed URL: {error}")
                # Fall back to local path
        
        # Return local path (original behavior)
        return audio_path 