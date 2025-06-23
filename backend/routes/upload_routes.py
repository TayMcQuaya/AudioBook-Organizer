from flask import Blueprint, request, jsonify, current_app, session
import os
from ..services.audio_service import AudioService
from ..routes.password_protection import require_temp_auth
from ..middleware.auth_middleware import require_credits, consume_credits

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
        # Handle CORS preflight request BEFORE authentication
        if request.method == 'OPTIONS':
            response = current_app.make_default_options_response()
            headers = response.headers
            headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
            headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
            headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Temp-Auth'
            headers['Access-Control-Allow-Credentials'] = 'true'
            return response
        
        app.logger.debug('Upload request received')
        app.logger.debug(f'Files in request: {request.files}')
        app.logger.debug(f'Request headers: {request.headers}')
        
        # Production authentication check
        app.logger.debug(f'Processing upload request for {request.method} {request.endpoint}')
        
        # Security: Only log essential info for debugging, no sensitive data
        app.logger.debug(f'Testing mode: {current_app.config.get("TESTING_MODE", False)}')
        app.logger.debug(f'Auth status: {"Authenticated" if session.get("temp_authenticated", False) else "Not authenticated"}')
        
        # Handle credit checking and consumption for testing mode
        if current_app.config.get('TESTING_MODE'):
            app.logger.info("✅ Testing mode - Simulated consumption of 2 credits for audio_processing")
        else:
            # In production mode, we would need proper credit verification here
            # For now, we'll skip credit checks in production
            app.logger.info("Production mode - Credit checks would be implemented here")
        
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
            
            # Add authentication status to response for debugging
            response = jsonify(result)
            response.headers['X-Auth-Status'] = 'authenticated'
            response.headers['X-Session-Status'] = str(session.get('temp_authenticated', False))
            return response

        except Exception as e:
            app.logger.error(f'Upload error: {str(e)}')
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500 