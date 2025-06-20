import os
import time
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def cleanup_old_files(upload_folder, max_age_hours=48, max_files=500):
    """
    Clean up old uploaded files to prevent disk space issues.
    
    Args:
        upload_folder: Path to upload directory
        max_age_hours: Files older than this will be deleted (default: 48 hours)
        max_files: Maximum number of files to keep (default: 500)
    """
    try:
        if not os.path.exists(upload_folder):
            return
        
        upload_path = Path(upload_folder)
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        # Get all files with their modification times
        files_with_times = []
        for file_path in upload_path.iterdir():
            if file_path.is_file() and not file_path.name.startswith('temp_'):
                mtime = file_path.stat().st_mtime
                files_with_times.append((file_path, mtime))
        
        # Sort by modification time (newest first)
        files_with_times.sort(key=lambda x: x[1], reverse=True)
        
        deleted_count = 0
        
        # Delete files based on age
        for file_path, mtime in files_with_times:
            age_seconds = current_time - mtime
            if age_seconds > max_age_seconds:
                try:
                    file_path.unlink()
                    deleted_count += 1
                    logger.debug(f"Deleted old file: {file_path.name}")
                except OSError as e:
                    logger.warning(f"Could not delete {file_path.name}: {e}")
        
        # Delete excess files if we still have too many
        remaining_files = [f for f, _ in files_with_times if f.exists()]
        if len(remaining_files) > max_files:
            excess_files = remaining_files[max_files:]
            for file_path in excess_files:
                try:
                    file_path.unlink()
                    deleted_count += 1
                    logger.debug(f"Deleted excess file: {file_path.name}")
                except OSError as e:
                    logger.warning(f"Could not delete {file_path.name}: {e}")
        
        if deleted_count > 0:
            logger.info(f"Cleanup completed: {deleted_count} files deleted")
        
        # Clean up any remaining temp files
        cleanup_temp_files(upload_folder)
        
    except Exception as e:
        logger.error(f"File cleanup error: {e}")

def cleanup_temp_files(upload_folder):
    """Clean up temporary files that may have been left behind"""
    try:
        upload_path = Path(upload_folder)
        current_time = time.time()
        
        for file_path in upload_path.glob("temp_*"):
            # Delete temp files older than 1 hour
            if current_time - file_path.stat().st_mtime > 3600:
                try:
                    file_path.unlink()
                    logger.debug(f"Deleted abandoned temp file: {file_path.name}")
                except OSError:
                    pass
                    
    except Exception as e:
        logger.warning(f"Temp file cleanup error: {e}")

def get_storage_info(upload_folder):
    """Get storage usage information"""
    try:
        upload_path = Path(upload_folder)
        if not upload_path.exists():
            return {'file_count': 0, 'total_size': 0}
        
        file_count = 0
        total_size = 0
        
        for file_path in upload_path.iterdir():
            if file_path.is_file():
                file_count += 1
                total_size += file_path.stat().st_size
        
        return {
            'file_count': file_count,
            'total_size': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2)
        }
        
    except Exception as e:
        logger.error(f"Storage info error: {e}")
        return {'file_count': 0, 'total_size': 0} 