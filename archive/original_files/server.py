from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from pydub import AudioSegment
import os
import json
import zipfile
import io
from werkzeug.utils import secure_filename
import time
import shutil

# Initialize Flask app
app = Flask(__name__, static_url_path='', static_folder='public')
CORS(app)  # Enable CORS for all routes

# Debug logging
app.logger.setLevel('DEBUG')

# Configure upload and export directories
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
EXPORT_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'exports')

app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['EXPORT_FOLDER'] = EXPORT_FOLDER

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(EXPORT_FOLDER, exist_ok=True)

# Debug route to check all registered routes
@app.route('/debug/routes', methods=['GET'])
def list_routes():
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'path': str(rule)
        })
    return jsonify(routes)

@app.route('/')
def serve_index():
    return send_from_directory('public', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('public', path)

@app.route('/uploads/<filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/exports/<export_id>/<filename>')
def serve_export(export_id, filename):
    export_path = os.path.join(app.config['EXPORT_FOLDER'], export_id)
    return send_from_directory(export_path, filename)

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def upload_audio():
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response

    app.logger.debug('Upload request received')
    app.logger.debug(f'Files in request: {request.files}')
    app.logger.debug(f'Request headers: {request.headers}')
    
    try:
        if 'audio' not in request.files:
            app.logger.error('No audio file in request')
            return jsonify({'success': False, 'error': 'No audio file provided'}), 400

        file = request.files['audio']
        app.logger.debug(f'Received file: {file.filename}')
        
        if file.filename == '':
            app.logger.error('Empty filename')
            return jsonify({'success': False, 'error': 'No selected file'}), 400

        # Generate a unique filename using timestamp
        timestamp = int(time.time() * 1000)
        original_filename = secure_filename(file.filename)
        
        # Save the uploaded file temporarily
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"temp_{original_filename}")
        file.save(temp_path)
        
        try:
            # Convert to WAV if it's an MP3
            if original_filename.lower().endswith('.mp3'):
                audio = AudioSegment.from_mp3(temp_path)
                filename = f"{timestamp}_{os.path.splitext(original_filename)[0]}.wav"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                audio.export(filepath, format='wav')
                os.remove(temp_path)  # Clean up temp file
            else:
                # If it's already a WAV, just rename the temp file
                filename = f"{timestamp}_{original_filename}"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                os.rename(temp_path, filepath)
            
            app.logger.debug('File processed successfully')

            # Create a URL-safe path for the frontend
            safe_path = f"/uploads/{filename}"

            return jsonify({
                'success': True,
                'filename': filename,
                'path': safe_path
            })

        except Exception as e:
            # Clean up temp file if conversion fails
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e

    except Exception as e:
        app.logger.error(f'Upload error: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/export', methods=['POST', 'OPTIONS'])
def export_audiobook():
    try:
        data = request.json
        chapters = data.get('chapters', [])
        export_options = {
            'exportMetadata': data.get('exportMetadataFlag', False),
            'exportAudio': data.get('exportAudioFlag', False),
            'createZip': data.get('createZipFlag', False),
            'mergeAudio': data.get('mergeAudioFlag', False),
            'silenceDuration': data.get('silenceDuration', 2)
        }

        # Create export directory for this session
        export_id = str(int(time.time()))
        export_path = os.path.join(app.config['EXPORT_FOLDER'], export_id)
        os.makedirs(export_path, exist_ok=True)

        # Export metadata if requested
        if export_options['exportMetadata']:
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

        # Handle audio processing
        if export_options['exportAudio'] or export_options['mergeAudio']:
            # Process each chapter's audio files
            for chapter_idx, chapter in enumerate(chapters):
                chapter_dir = os.path.join(export_path, f'chapter_{chapter_idx + 1}')
                os.makedirs(chapter_dir, exist_ok=True)
                
                processed_audio_files = []
                for section_idx, section in enumerate(chapter.get('sections', [])):
                    audio_path = section.get('audioPath', '')
                    if audio_path:
                        # Convert URL path to filesystem path
                        filename = os.path.basename(audio_path)
                        fs_audio_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                        
                        if os.path.exists(fs_audio_path):
                            processed_audio_files.append(fs_audio_path)
                            
                            # Copy individual files if requested
                            if export_options['exportAudio']:
                                export_audio_path = os.path.join(chapter_dir, f"section_{section_idx+1}.wav")
                                shutil.copy2(fs_audio_path, export_audio_path)

                # Merge chapter audio files if requested
                if export_options['mergeAudio'] and processed_audio_files:
                    merged_audio = AudioSegment.empty()
                    silence = AudioSegment.silent(duration=export_options['silenceDuration'] * 1000)  # Convert to milliseconds

                    # Merge all audio files in the chapter with silence between them
                    for i, audio_path in enumerate(processed_audio_files):
                        audio = AudioSegment.from_wav(audio_path)
                        if i > 0:  # Add silence between sections
                            merged_audio += silence
                        merged_audio += audio

                    # Export merged chapter audio
                    chapter_audio_path = os.path.join(chapter_dir, f"chapter_{chapter_idx+1}_merged.wav")
                    merged_audio.export(chapter_audio_path, format='wav')

        # Create ZIP archive if requested
        if export_options['createZip']:
            zip_path = os.path.join(export_path, 'audiobook_export.zip')
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # Add metadata if it exists
                if export_options['exportMetadata']:
                    zipf.write(metadata_path, 'metadata.json')
                
                # Add all files from the export directory
                for root, _, files in os.walk(export_path):
                    for file in files:
                        if file != 'audiobook_export.zip':  # Don't include the zip file itself
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, export_path)
                            zipf.write(file_path, arcname)

        return jsonify({
            'success': True,
            'exportId': export_id,
            'message': 'Export completed successfully'
        })

    except Exception as e:
        app.logger.error(f'Export error: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/test', methods=['GET'])
def test_api():
    return jsonify({
        'success': True,
        'message': 'API is working'
    })

if __name__ == '__main__':
    print("\nServer starting...")
    print(f"Static folder: {app.static_folder}")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Export folder: {EXPORT_FOLDER}")
    print("\nRegistered routes:")
    for rule in app.url_map.iter_rules():
        print(f"{rule.endpoint}: {rule.methods} {rule}")
    print("\nStarting server on http://localhost:3000")
    app.run(host='localhost', port=3000, debug=True) 