import os
import json
import zipfile
import time
import shutil
import logging
from pydub import AudioSegment

logger = logging.getLogger(__name__)

class ExportService:
    """Service for handling export operations"""
    
    def __init__(self, upload_folder, export_folder):
        self.upload_folder = upload_folder
        self.export_folder = export_folder
        self.storage_service = None
        self.use_supabase_storage = os.environ.get('STORAGE_BACKEND', 'local') == 'supabase'
        
        if self.use_supabase_storage:
            try:
                from ..services.supabase_storage_service import get_storage_service
                self.storage_service = get_storage_service()
                logger.info("🗌️ ExportService using Supabase Storage backend")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase Storage: {e}")
                logger.info("📁 Falling back to local storage")
                self.use_supabase_storage = False
    
    def export_audiobook(self, data):
        """
        Export audiobook with all options.
        Preserves the exact logic from original server.py export_audiobook() function
        """
        chapters = data.get('chapters', [])
        export_options = {
            'exportMetadata': data.get('exportMetadataFlag', False),
            'exportAudio': data.get('exportAudioFlag', False),
            'exportBookContent': data.get('exportBookContentFlag', False),
            'createZip': data.get('createZipFlag', False),
            'mergeAudio': data.get('mergeAudioFlag', False),
            'silenceDuration': data.get('silenceDuration', 2),
            'audioFormat': data.get('audioFormat', 'wav')  # NEW: Support for MP3/WAV selection
        }

        # Create export directory for this session - exact logic preserved
        export_id = str(int(time.time()))
        export_path = os.path.join(self.export_folder, export_id)
        os.makedirs(export_path, exist_ok=True)

        # Export metadata if requested - exact logic preserved
        if export_options['exportMetadata']:
            self._export_metadata(chapters, export_path)

        # Export book content if requested - NEW
        if export_options['exportBookContent']:
            self._export_book_content(data, export_path)

        # Handle audio processing - exact logic preserved
        if export_options['exportAudio'] or export_options['mergeAudio']:
            self._process_audio_exports(chapters, export_path, export_options)

        # Create ZIP archive if requested - exact logic preserved
        if export_options['createZip']:
            self._create_zip_archive(export_path, export_options)
        
        # Clean up temporary files from Supabase downloads
        self._cleanup_temp_files(export_path)

        return {
            'success': True,
            'exportId': export_id,
            'message': 'Export completed successfully'
        }
    
    def _export_metadata(self, chapters, export_path):
        """Export metadata to JSON - exact logic preserved"""
        metadata = {
            'chapters': [{
                'name': chapter.get('name', ''),
                'description': chapter.get('description', ''),
                'totalDuration': chapter.get('totalDuration', 0),
                'sections': [{
                    'name': section.get('name', ''),
                    'text': section.get('text', ''),
                    'timestamp': section.get('timestamp', ''),
                    'duration': section.get('duration', 0),
                    'status': section.get('status', '')
                } for section in chapter.get('sections', [])]
            } for chapter in chapters]
        }
        metadata_path = os.path.join(export_path, 'metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
    
    def _process_audio_exports(self, chapters, export_path, export_options):
        """Process audio exports - exact logic preserved"""
        for chapter_idx, chapter in enumerate(chapters):
            chapter_dir = os.path.join(export_path, f'chapter_{chapter_idx + 1}')
            os.makedirs(chapter_dir, exist_ok=True)
            
            processed_audio_files = []
            for section_idx, section in enumerate(chapter.get('sections', [])):
                audio_path = section.get('audioPath', '')
                if audio_path:
                    # Handle Supabase Storage or local files
                    storage_backend = section.get('storageBackend', 'local')
                    
                    if storage_backend == 'supabase' and self.storage_service:
                        # Download from Supabase Storage
                        success, file_data, error = self.storage_service.download_audio_file(audio_path)
                        if success and file_data:
                            # Save to temporary file for processing
                            temp_filename = f"temp_{os.path.basename(audio_path)}"
                            temp_path = os.path.join(export_path, temp_filename)
                            with open(temp_path, 'wb') as f:
                                f.write(file_data)
                            processed_audio_files.append(temp_path)
                        else:
                            logger.error(f"Failed to download from Supabase: {error}")
                    else:
                        # Local storage - original logic
                        filename = os.path.basename(audio_path)
                        fs_audio_path = os.path.join(self.upload_folder, filename)
                        
                        if os.path.exists(fs_audio_path):
                            processed_audio_files.append(fs_audio_path)
                        
                        # Convert and export individual files if requested - MODIFIED
                        if export_options['exportAudio']:
                            audio_format = export_options.get('audioFormat', 'wav')
                            file_extension = 'mp3' if audio_format == 'mp3' else 'wav'
                            export_audio_path = os.path.join(chapter_dir, f"section_{section_idx+1}.{file_extension}")
                            
                            # Convert audio format if needed
                            if audio_format == 'mp3':
                                audio = AudioSegment.from_wav(fs_audio_path)
                                audio.export(export_audio_path, format='mp3', bitrate='192k')
                            else:
                                # For WAV, just copy the file (preserves original quality)
                                shutil.copy2(fs_audio_path, export_audio_path)

            # Merge chapter audio files if requested - exact logic preserved
            if export_options['mergeAudio'] and processed_audio_files:
                self._merge_chapter_audio(processed_audio_files, chapter_dir, chapter_idx, export_options)
    
    def _merge_chapter_audio(self, audio_files, chapter_dir, chapter_idx, export_options):
        """Merge audio files for a chapter - exact logic preserved"""
        merged_audio = AudioSegment.empty()
        silence = AudioSegment.silent(duration=export_options['silenceDuration'] * 1000)  # Convert to milliseconds

        # Merge all audio files in the chapter with silence between them - exact logic preserved
        for i, audio_path in enumerate(audio_files):
            audio = AudioSegment.from_wav(audio_path)
            if i > 0:  # Add silence between sections
                merged_audio += silence
            merged_audio += audio

        # Export merged chapter audio with dynamic format - MODIFIED
        audio_format = export_options.get('audioFormat', 'wav')
        file_extension = 'mp3' if audio_format == 'mp3' else 'wav'
        chapter_audio_path = os.path.join(chapter_dir, f"chapter_{chapter_idx+1}_merged.{file_extension}")
        
        # Export with format parameter - MODIFIED
        if audio_format == 'mp3':
            merged_audio.export(chapter_audio_path, format='mp3', bitrate='192k')
        else:
            merged_audio.export(chapter_audio_path, format='wav')
    
    def _create_zip_archive(self, export_path, export_options):
        """Create ZIP archive - exact logic preserved"""
        zip_path = os.path.join(export_path, 'audiobook_export.zip')
        explicitly_added_files = set()  # Track files we explicitly add
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add metadata if it exists - exact logic preserved
            if export_options['exportMetadata']:
                metadata_path = os.path.join(export_path, 'metadata.json')
                if os.path.exists(metadata_path):
                    zipf.write(metadata_path, 'metadata.json')
                    explicitly_added_files.add('metadata.json')  # Track this file
            
            # Add book content if it exists - NEW
            if export_options['exportBookContent']:
                book_content_path = os.path.join(export_path, 'book_content.json')
                if os.path.exists(book_content_path):
                    zipf.write(book_content_path, 'book_content.json')
                    explicitly_added_files.add('book_content.json')  # Track this file
            
            # Add all other files from the export directory - MODIFIED to prevent duplicates
            for root, _, files in os.walk(export_path):
                for file in files:
                    if file != 'audiobook_export.zip':  # Don't include the zip file itself
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, export_path)
                        
                        # Skip files we already explicitly added - FIXED DUPLICATION
                        if arcname not in explicitly_added_files:
                            zipf.write(file_path, arcname)
    
    def _export_book_content(self, data, export_path):
        """Export complete book content with highlights - NEW"""
        book_content_data = {
            'bookContent': data.get('bookContent', ''),
            'bookText': data.get('bookText', ''),
            'highlights': data.get('highlights', []),
            'chapters': data.get('chapters', []),
            'version': data.get('version', '1.0'),
            'timestamp': data.get('timestamp', time.time())
        }
        book_content_path = os.path.join(export_path, 'book_content.json')
        with open(book_content_path, 'w') as f:
            json.dump(book_content_data, f, indent=2)
    
    def _cleanup_temp_files(self, export_path):
        """Clean up temporary files created during export"""
        try:
            # Remove temporary files downloaded from Supabase
            for root, _, files in os.walk(export_path):
                for file in files:
                    if file.startswith('temp_'):
                        temp_path = os.path.join(root, file)
                        try:
                            os.remove(temp_path)
                            logger.debug(f"Cleaned up temporary file: {temp_path}")
                        except Exception as e:
                            logger.warning(f"Failed to clean up {temp_path}: {e}")
        except Exception as e:
            logger.warning(f"Error during cleanup: {e}") 