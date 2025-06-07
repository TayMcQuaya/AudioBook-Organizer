import os
import json
import zipfile
import time
import shutil
from pydub import AudioSegment

class ExportService:
    """Service for handling export operations"""
    
    def __init__(self, upload_folder, export_folder):
        self.upload_folder = upload_folder
        self.export_folder = export_folder
    
    def export_audiobook(self, data):
        """
        Export audiobook with all options.
        Preserves the exact logic from original server.py export_audiobook() function
        """
        chapters = data.get('chapters', [])
        export_options = {
            'exportMetadata': data.get('exportMetadataFlag', False),
            'exportAudio': data.get('exportAudioFlag', False),
            'createZip': data.get('createZipFlag', False),
            'mergeAudio': data.get('mergeAudioFlag', False),
            'silenceDuration': data.get('silenceDuration', 2)
        }

        # Create export directory for this session - exact logic preserved
        export_id = str(int(time.time()))
        export_path = os.path.join(self.export_folder, export_id)
        os.makedirs(export_path, exist_ok=True)

        # Export metadata if requested - exact logic preserved
        if export_options['exportMetadata']:
            self._export_metadata(chapters, export_path)

        # Handle audio processing - exact logic preserved
        if export_options['exportAudio'] or export_options['mergeAudio']:
            self._process_audio_exports(chapters, export_path, export_options)

        # Create ZIP archive if requested - exact logic preserved
        if export_options['createZip']:
            self._create_zip_archive(export_path, export_options)

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
                    # Convert URL path to filesystem path - exact logic preserved
                    filename = os.path.basename(audio_path)
                    fs_audio_path = os.path.join(self.upload_folder, filename)
                    
                    if os.path.exists(fs_audio_path):
                        processed_audio_files.append(fs_audio_path)
                        
                        # Copy individual files if requested - exact logic preserved
                        if export_options['exportAudio']:
                            export_audio_path = os.path.join(chapter_dir, f"section_{section_idx+1}.wav")
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

        # Export merged chapter audio - exact logic preserved
        chapter_audio_path = os.path.join(chapter_dir, f"chapter_{chapter_idx+1}_merged.wav")
        merged_audio.export(chapter_audio_path, format='wav')
    
    def _create_zip_archive(self, export_path, export_options):
        """Create ZIP archive - exact logic preserved"""
        zip_path = os.path.join(export_path, 'audiobook_export.zip')
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add metadata if it exists - exact logic preserved
            if export_options['exportMetadata']:
                metadata_path = os.path.join(export_path, 'metadata.json')
                if os.path.exists(metadata_path):
                    zipf.write(metadata_path, 'metadata.json')
            
            # Add all files from the export directory - exact logic preserved
            for root, _, files in os.walk(export_path):
                for file in files:
                    if file != 'audiobook_export.zip':  # Don't include the zip file itself
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, export_path)
                        zipf.write(file_path, arcname) 