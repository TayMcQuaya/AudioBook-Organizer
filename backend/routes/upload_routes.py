from flask import Blueprint, request, jsonify, current_app
import os
from ..services.audio_service import AudioService
from ..routes.password_protection import require_temp_auth

def create_upload_routes(app, upload_folder):
    """
    Create file upload routes.
    Preserves the exact logic from original server.py but adapted for modular architecture
    """
    audio_service = AudioService(upload_folder)
    
    @app.route('/api/upload', methods=['POST', 'OPTIONS'])
    @require_temp_auth
    def upload_audio():
        """
        Handle audio file upload.
        Preserves the exact logic from original server.py upload_audio() function
        """
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

            # Use audio service to handle upload - preserves exact logic
            result = audio_service.upload_audio_file(file)
            app.logger.debug('File processed successfully')
            
            return jsonify(result)

        except Exception as e:
            app.logger.error(f'Upload error: {str(e)}')
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500 