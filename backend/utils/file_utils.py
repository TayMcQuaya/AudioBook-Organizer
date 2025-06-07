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
    Preserves the exact logic from original server.py
    """
    return f"/uploads/{filename}" 