from flask import Blueprint, request, jsonify, current_app, session
import os
from ..services.audio_service import AudioService
from ..routes.password_protection import require_temp_auth
from ..middleware.auth_middleware import require_auth, require_credits, consume_credits

def create_upload_routes(app, upload_folder):
    """
    Create file upload routes.
    Preserves the exact logic from original server.py but adapted for modular architecture
    """
    audio_service = AudioService(upload_folder)
    
    @app.route('/api/upload', methods=['POST', 'OPTIONS'])
    def upload_audio():
        """
        Handle audio file upload with proper auth and credit management.
        Preserves exact logic but adds proper authentication and credit enforcement.
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
        
        # Check mode and apply appropriate authentication
        if current_app.config.get('TESTING_MODE'):
            # Testing mode: check temp authentication
            if not session.get('temp_authenticated'):
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Please authenticate with the temporary password first'
                }), 401
        else:
            # Normal mode: use proper auth + credits
            from flask import g
            from ..middleware.auth_middleware import extract_token_from_header
            from ..services.supabase_service import get_supabase_service
            
            # Extract and verify token
            token = extract_token_from_header()
            if not token:
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Authorization header with Bearer token is required'
                }), 401
            
            supabase_service = get_supabase_service()
            user = supabase_service.get_user_from_token(token)
            if not user:
                return jsonify({
                    'error': 'Invalid token',
                    'message': 'The provided token is invalid or expired'
                }), 401
            
            # Store user in context
            g.current_user = user
            g.user_id = user['id']
            g.user_email = user['email']
            
            # Check credits (configurable cost for audio upload)
            required_credits = current_app.config['CREDIT_COST_AUDIO_UPLOAD']
            current_credits = supabase_service.get_user_credits(user['id'])
            if current_credits < required_credits:
                return jsonify({
                    'error': 'Insufficient credits',
                    'message': f'This action requires {required_credits} credits. You have {current_credits} credits.',
                    'current_credits': current_credits,
                    'required_credits': required_credits
                }), 402
        
        app.logger.debug('Upload request received')
        app.logger.debug(f'Files in request: {request.files}')
        app.logger.debug(f'Request headers: {request.headers}')
        
        # Production authentication check
        app.logger.debug(f'Processing upload request for {request.method} {request.endpoint}')
        
        # Security: Only log essential info for debugging, no sensitive data
        app.logger.debug(f'Testing mode: {current_app.config.get("TESTING_MODE", False)}')
        
        if current_app.config.get('TESTING_MODE'):
            app.logger.debug(f'Auth status: {"Authenticated" if session.get("temp_authenticated", False) else "Not authenticated"}')
            app.logger.info("✅ Testing mode - Credit simulation handled by auth middleware")
        else:
            # Normal mode - credits handled by decorators
            app.logger.info("✅ Normal mode - Credits enforced by decorators")
        
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
            
            # Consume credits after successful upload (normal mode only)
            if not current_app.config.get('TESTING_MODE'):
                from flask import g
                from ..services.supabase_service import get_supabase_service
                
                credits_to_consume = current_app.config['CREDIT_COST_AUDIO_UPLOAD']
                supabase_service = get_supabase_service()
                success = supabase_service.update_user_credits(g.user_id, -credits_to_consume)
                if success:
                    supabase_service.log_usage(
                        g.user_id, 
                        'audio_upload', 
                        credits_to_consume,
                        {'endpoint': request.endpoint, 'method': request.method, 'filename': file.filename}
                    )
                    app.logger.info(f"✅ Consumed {credits_to_consume} credits for audio_upload by user {g.user_id}")
                else:
                    app.logger.warning(f"⚠️ Failed to consume credits for user {g.user_id}")
            
            # Add authentication status to response for debugging
            response = jsonify(result)
            response.headers['X-Auth-Status'] = 'authenticated'
            if current_app.config.get('TESTING_MODE'):
                response.headers['X-Session-Status'] = str(session.get('temp_authenticated', False))
            return response

        except Exception as e:
            app.logger.error(f'Upload error: {str(e)}')
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500 

    @app.route('/api/upload/txt', methods=['POST', 'OPTIONS'])
    def upload_txt():
        """
        Handle text file upload with proper auth and credit management.
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
        
        # Check mode and apply appropriate authentication
        if current_app.config.get('TESTING_MODE'):
            # Testing mode: check temp authentication
            if not session.get('temp_authenticated'):
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Please authenticate with the temporary password first'
                }), 401
        else:
            # Normal mode: use proper auth + credits
            from flask import g
            from ..middleware.auth_middleware import extract_token_from_header
            from ..services.supabase_service import get_supabase_service
            
            # Extract and verify token
            token = extract_token_from_header()
            if not token:
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Authorization header with Bearer token is required'
                }), 401
            
            supabase_service = get_supabase_service()
            user = supabase_service.get_user_from_token(token)
            if not user:
                return jsonify({
                    'error': 'Invalid token',
                    'message': 'The provided token is invalid or expired'
                }), 401
            
            # Store user in context
            g.current_user = user
            g.user_id = user['id']
            g.user_email = user['email']
            
            # Check credits (configurable cost for text upload)
            required_credits = current_app.config['CREDIT_COST_TXT_UPLOAD']
            current_credits = supabase_service.get_user_credits(user['id'])
            if current_credits < required_credits:
                return jsonify({
                    'error': 'Insufficient credits',
                    'message': f'This action requires {required_credits} credits. You have {current_credits} credits.',
                    'current_credits': current_credits,
                    'required_credits': required_credits
                }), 402
        
        app.logger.debug('Text upload request received')
        
        try:
            if 'file' not in request.files:
                app.logger.error('No text file in request')
                return jsonify({'success': False, 'error': 'No text file provided'}), 400

            file = request.files['file']
            app.logger.debug(f'Received text file: {file.filename}')
            
            if file.filename == '':
                app.logger.error('Empty filename')
                return jsonify({'success': False, 'error': 'No selected file'}), 400
            
            # Validate file type
            if not file.filename.lower().endswith('.txt'):
                return jsonify({'success': False, 'error': 'Please upload a .txt file'}), 400
            
            # Check file size (10MB limit for text files)
            MAX_TXT_SIZE = 10 * 1024 * 1024  # 10MB
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)  # Reset file pointer
            
            if file_size > MAX_TXT_SIZE:
                return jsonify({
                    'success': False,
                    'error': f'File too large. Maximum size is 10MB'
                }), 400
            
            if file_size == 0:
                return jsonify({
                    'success': False,
                    'error': 'File is empty'
                }), 400
            
            # Read text content
            try:
                text_content = file.read().decode('utf-8')
                app.logger.debug(f'Text file processed: {len(text_content)} characters')
            except UnicodeDecodeError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid text file encoding. Please use UTF-8 encoding.'
                }), 400
            
            # Prepare response
            result = {
                'success': True,
                'text': text_content,
                'metadata': {
                    'filename': file.filename,
                    'file_size': file_size,
                    'text_length': len(text_content),
                    'processing_method': 'backend_txt'
                }
            }
            
            # Consume credits after successful upload (normal mode only)
            if not current_app.config.get('TESTING_MODE'):
                from flask import g
                from ..services.supabase_service import get_supabase_service
                
                credits_to_consume = current_app.config['CREDIT_COST_TXT_UPLOAD']
                supabase_service = get_supabase_service()
                success = supabase_service.update_user_credits(g.user_id, -credits_to_consume)
                if success:
                    supabase_service.log_usage(
                        g.user_id, 
                        'txt_upload', 
                        credits_to_consume,
                        {
                            'endpoint': request.endpoint, 
                            'method': request.method, 
                            'filename': file.filename,
                            'file_size': file_size,
                            'text_length': len(text_content)
                        }
                    )
                    app.logger.info(f"✅ Consumed {credits_to_consume} credits for txt_upload by user {g.user_id}")
                else:
                    app.logger.warning(f"⚠️ Failed to consume credits for user {g.user_id}")
            
            return jsonify(result)

        except Exception as e:
            app.logger.error(f'Text upload error: {str(e)}')
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500 