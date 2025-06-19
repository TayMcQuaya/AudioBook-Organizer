from flask import Blueprint, request, jsonify, current_app, session
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
        
        # Apply authentication check only for POST requests
        @require_temp_auth
        def authenticated_upload():
            app.logger.debug('Upload request received')
            app.logger.debug(f'Files in request: {request.files}')
            app.logger.debug(f'Request headers: {request.headers}')
            
            # Enhanced debugging for production authentication issues
            app.logger.info(f'🔐 UPLOAD AUTH DEBUG:')
            app.logger.info(f'   - Testing mode: {current_app.config.get("TESTING_MODE", False)}')
            app.logger.info(f'   - Session temp_authenticated: {session.get("temp_authenticated", False)}')
            app.logger.info(f'   - Session keys: {list(session.keys())}')
            app.logger.info(f'   - Authorization header: {"Present" if request.headers.get("Authorization") else "Missing"}')
            app.logger.info(f'   - X-Temp-Auth header: {"Present" if request.headers.get("X-Temp-Auth") else "Missing"}')
            app.logger.info(f'   - Request origin: {request.headers.get("Origin", "Not set")}')
            app.logger.info(f'   - Request method: {request.method}')
            app.logger.info(f'   - Content-Type: {request.headers.get("Content-Type", "Not set")}')
            app.logger.info(f'   - User-Agent: {request.headers.get("User-Agent", "Not set")[:100]}...')
            
            # Log auth headers for debugging (first 20 chars only for security)
            if request.headers.get("Authorization"):
                auth_header = request.headers.get("Authorization")
                app.logger.info(f'   - Auth header preview: {auth_header[:30]}...')
            if request.headers.get("X-Temp-Auth"):
                temp_auth = request.headers.get("X-Temp-Auth")
                app.logger.info(f'   - X-Temp-Auth preview: {temp_auth[:20]}...')
            
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
        
        # Call the authenticated function for POST requests
        return authenticated_upload() 