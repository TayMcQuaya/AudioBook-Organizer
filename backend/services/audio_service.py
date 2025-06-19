import os
import time
from werkzeug.utils import secure_filename
from flask import current_app
from ..utils.audio_utils import process_audio_file
from ..utils.file_utils import generate_unique_filename, create_url_safe_path

class AudioService:
    """Service for handling audio file operations"""
    
    def __init__(self, upload_folder):
        self.upload_folder = upload_folder
        # Ensure upload folder exists and is writable
        os.makedirs(upload_folder, exist_ok=True)
    
    def upload_audio_file(self, file):
        """
        Handle audio file upload with conversion.
        Preserves the exact logic from original server.py upload_audio() function
        """
        if not file or file.filename == '':
            raise ValueError('No selected file')
        
        current_app.logger.info(f"🎵 Processing audio upload: {file.filename}")
        current_app.logger.info(f"   - File size: {file.content_length or 'unknown'} bytes")
        current_app.logger.info(f"   - Upload folder: {self.upload_folder}")
        
        # Generate a unique timestamp - exact logic preserved
        timestamp = int(time.time() * 1000)
        original_filename = secure_filename(file.filename)
        
        current_app.logger.info(f"   - Generated timestamp: {timestamp}")
        current_app.logger.info(f"   - Secured filename: {original_filename}")
        
        # Save the uploaded file temporarily - exact logic preserved
        temp_path = os.path.join(self.upload_folder, f"temp_{original_filename}")
        current_app.logger.info(f"   - Temp path: {temp_path}")
        
        try:
            file.save(temp_path)
            current_app.logger.info(f"   - File saved to temp location successfully")
            
            # Verify temp file exists and has content
            if not os.path.exists(temp_path):
                raise Exception("Temp file was not created")
            
            temp_size = os.path.getsize(temp_path)
            current_app.logger.info(f"   - Temp file size: {temp_size} bytes")
            
            if temp_size == 0:
                raise Exception("Temp file is empty")
        
        except Exception as e:
            current_app.logger.error(f"   - Failed to save temp file: {str(e)}")
            raise Exception(f"Failed to save uploaded file: {str(e)}")
        
        try:
            # Process the audio file (convert if needed) - exact logic preserved
            filename, filepath = process_audio_file(
                temp_path, original_filename, self.upload_folder, timestamp
            )
            
            current_app.logger.info(f"   - Final filename: {filename}")
            current_app.logger.info(f"   - Final filepath: {filepath}")
            
            # Verify final file exists
            if not os.path.exists(filepath):
                raise Exception("Processed file was not created")
            
            final_size = os.path.getsize(filepath)
            current_app.logger.info(f"   - Final file size: {final_size} bytes")
            
            # Create a URL-safe path for the frontend - exact logic preserved
            safe_path = create_url_safe_path(filename)
            current_app.logger.info(f"   - Safe URL path: {safe_path}")
            
            current_app.logger.info(f"✅ Audio upload completed successfully")
            
            return {
                'success': True,
                'filename': filename,
                'path': safe_path
            }
            
        except Exception as e:
            current_app.logger.error(f"❌ Audio processing failed: {str(e)}")
            raise e 