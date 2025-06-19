import os
import time
from werkzeug.utils import secure_filename

def generate_unique_filename(original_filename):
    """
    Generate a unique filename using timestamp.
    Preserves the exact logic from original server.py
    """
    timestamp = int(time.time() * 1000)
    secure_name = secure_filename(original_filename)
    return f"{timestamp}_{secure_name}"

def ensure_directories_exist(upload_folder, export_folder):
    """
    Ensure upload and export directories exist.
    Preserves the exact logic from original server.py
    """
    os.makedirs(upload_folder, exist_ok=True)
    os.makedirs(export_folder, exist_ok=True)

def create_url_safe_path(filename):
    """
    Create a URL-safe path for the frontend.
    For production, return full backend URL to handle cross-domain file access.
    """
    import os
    
    # In production, use full backend URL for cross-domain access
    if os.environ.get('FLASK_ENV') == 'production':
        backend_url = os.environ.get('BACKEND_URL', 'https://audiobook-organizer-test-vdhku.ondigitalocean.app')
        return f"{backend_url}/uploads/{filename}"
    else:
        # For local development, use relative path
        return f"/uploads/{filename}" 