import os
import re
from pydub import AudioSegment

def convert_mp3_to_wav(temp_path, output_path):
    """
    Convert MP3 file to WAV format.
    Preserves the exact logic from original server.py
    """
    audio = AudioSegment.from_mp3(temp_path)
    audio.export(output_path, format='wav')

def clean_filename(original_filename):
    """
    Clean the filename by removing existing timestamps to avoid nested timestamps
    """
    # Remove existing timestamp patterns (sequences of 13+ digits)
    cleaned = re.sub(r'^\d{13,}_', '', original_filename)
    cleaned = re.sub(r'_\d{13,}_', '_', cleaned)
    # Remove any duplicate underscores
    cleaned = re.sub(r'_{2,}', '_', cleaned)
    # Remove leading/trailing underscores
    cleaned = cleaned.strip('_')
    return cleaned if cleaned else original_filename

def process_audio_file(temp_path, original_filename, upload_folder, timestamp):
    """
    Process uploaded audio file - convert MP3 to WAV if needed.
    Preserves the exact logic from original server.py but with improved filename handling
    """
    try:
        # Clean the original filename to avoid nested timestamps
        clean_original = clean_filename(original_filename)
        
        if original_filename.lower().endswith('.mp3'):
            # Convert MP3 to WAV
            base_name = os.path.splitext(clean_original)[0]
            filename = f"{timestamp}_{base_name}.wav"
            filepath = os.path.join(upload_folder, filename)
            convert_mp3_to_wav(temp_path, filepath)
            os.remove(temp_path)  # Clean up temp file
        else:
            # If it's already a WAV, just rename the temp file
            filename = f"{timestamp}_{clean_original}"
            filepath = os.path.join(upload_folder, filename)
            os.rename(temp_path, filepath)
        
        return filename, filepath
    except Exception as e:
        # Clean up temp file if conversion fails
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise e 