import os
import time
from werkzeug.utils import secure_filename
from ..utils.audio_utils import process_audio_file
from ..utils.file_utils import generate_unique_filename, create_url_safe_path

class AudioService:
    """Service for handling audio file operations"""
    
    def __init__(self, upload_folder):
        self.upload_folder = upload_folder
    
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
            # Process the audio file (convert if needed) - exact logic preserved
            filename, filepath = process_audio_file(
                temp_path, original_filename, self.upload_folder, timestamp
            )
            
            # Create a URL-safe path for the frontend - exact logic preserved
            safe_path = create_url_safe_path(filename)
            
            return {
                'success': True,
                'filename': filename,
                'path': safe_path
            }
            
        except Exception as e:
            raise e 