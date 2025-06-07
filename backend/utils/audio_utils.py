import os
from pydub import AudioSegment

def convert_mp3_to_wav(temp_path, output_path):
    """
    Convert MP3 file to WAV format.
    Preserves the exact logic from original server.py
    """
    audio = AudioSegment.from_mp3(temp_path)
    audio.export(output_path, format='wav')

def process_audio_file(temp_path, original_filename, upload_folder, timestamp):
    """
    Process uploaded audio file - convert MP3 to WAV if needed.
    Preserves the exact logic from original server.py
    """
    try:
        if original_filename.lower().endswith('.mp3'):
            # Convert MP3 to WAV
            filename = f"{timestamp}_{os.path.splitext(original_filename)[0]}.wav"
            filepath = os.path.join(upload_folder, filename)
            convert_mp3_to_wav(temp_path, filepath)
            os.remove(temp_path)  # Clean up temp file
        else:
            # If it's already a WAV, just rename the temp file
            filename = f"{timestamp}_{original_filename}"
            filepath = os.path.join(upload_folder, filename)
            os.rename(temp_path, filepath)
        
        return filename, filepath
    except Exception as e:
        # Clean up temp file if conversion fails
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise e 