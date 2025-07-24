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
    # Create audio service with lazy initialization to ensure env vars are loaded
    audio_service = None
    
    def get_audio_service():
        nonlocal audio_service
        if audio_service is None:
            audio_service = AudioService(upload_folder)
            app.logger.info(f"Initialized AudioService with STORAGE_BACKEND={os.environ.get('STORAGE_BACKEND', 'not set')}")
        return audio_service
    
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
            # CRITICAL FIX: Always get fresh credits for pre-action checks
            current_credits = supabase_service.get_user_credits(user['id'], use_cache=False)
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
            
            # Get additional parameters for Supabase Storage
            # Frontend sends camelCase, so we need to match that
            project_id = request.form.get('project_id')
            chapter_id = request.form.get('chapterId')  # Changed from 'chapter_id'
            section_id = request.form.get('sectionId')  # Changed from 'section_id'
            
            # Check if we should use Supabase Storage
            use_supabase = os.environ.get('STORAGE_BACKEND', 'local') == 'supabase'
            
            # Debug logging
            app.logger.info(f"Upload parameters - project_id: {project_id}, chapter_id: {chapter_id}, section_id: {section_id}")
            app.logger.info(f"Storage backend check - use_supabase: {use_supabase}, STORAGE_BACKEND: {os.environ.get('STORAGE_BACKEND', 'not set')}")
            
            if use_supabase and project_id and chapter_id and section_id:
                # Use new storage-aware method
                app.logger.info(f"Using Supabase Storage for upload: project={project_id}, chapter={chapter_id}, section={section_id}")
                
                # Get user ID based on mode
                if current_app.config.get('TESTING_MODE'):
                    # In testing mode, use a fixed user ID for simplicity
                    user_id = 'test-user-' + str(session.get('session_id', 'default'))
                else:
                    from flask import g
                    user_id = g.user_id
                
                result = get_audio_service().upload_audio_file_with_storage(
                    file, user_id, project_id, 
                    int(chapter_id), int(section_id)
                )
            else:
                # Use original method for backward compatibility
                app.logger.info("Using local storage for upload")
                result = get_audio_service().upload_audio_file(file)
            
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
            # CRITICAL FIX: Always get fresh credits for pre-action checks
            current_credits = supabase_service.get_user_credits(user['id'], use_cache=False)
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
    
    @app.route('/api/audio/url', methods=['GET'])
    def get_audio_url():
        """
        Get signed URL for audio file playback (Supabase Storage)
        """
        # Check authentication
        if current_app.config.get('TESTING_MODE'):
            if not session.get('temp_authenticated'):
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Please authenticate first'
                }), 401
        else:
            from flask import g
            from ..middleware.auth_middleware import extract_token_from_header
            from ..services.supabase_service import get_supabase_service
            
            token = extract_token_from_header()
            if not token:
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Authorization header required'
                }), 401
            
            supabase_service = get_supabase_service()
            user = supabase_service.get_user_from_token(token)
            if not user:
                return jsonify({
                    'error': 'Invalid token',
                    'message': 'Token is invalid or expired'
                }), 401
        
        try:
            audio_path = request.args.get('path')
            if not audio_path:
                return jsonify({
                    'error': 'Missing parameter',
                    'message': 'Audio path is required'
                }), 400
            
            # Get signed URL
            signed_url = get_audio_service().get_audio_url(audio_path)
            
            return jsonify({
                'success': True,
                'url': signed_url,
                'expires_in': 3600  # 1 hour
            })
            
        except Exception as e:
            app.logger.error(f'Error getting audio URL: {str(e)}')
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/audio/delete', methods=['POST', 'OPTIONS'])
    def delete_audio():
        """
        Delete audio file from Supabase Storage and database
        """
        # Handle CORS preflight
        if request.method == 'OPTIONS':
            response = current_app.make_default_options_response()
            headers = response.headers
            headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
            headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
            headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Temp-Auth'
            headers['Access-Control-Allow-Credentials'] = 'true'
            return response
        
        # Check authentication
        if current_app.config.get('TESTING_MODE'):
            if not session.get('temp_authenticated'):
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Please authenticate first'
                }), 401
        else:
            from flask import g
            from ..middleware.auth_middleware import extract_token_from_header
            from ..services.supabase_service import get_supabase_service
            
            token = extract_token_from_header()
            if not token:
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Authorization header required'
                }), 401
            
            supabase_service = get_supabase_service()
            user = supabase_service.get_user_from_token(token)
            if not user:
                return jsonify({
                    'error': 'Invalid token',
                    'message': 'Token is invalid or expired'
                }), 401
            
            g.user_id = user['id']
        
        try:
            data = request.get_json()
            if not data:
                return jsonify({
                    'error': 'Invalid request',
                    'message': 'Request body must be JSON'
                }), 400
            
            audio_path = data.get('audioPath')
            storage_backend = data.get('storageBackend', 'local')
            upload_id = data.get('uploadId')
            
            if not audio_path:
                return jsonify({
                    'error': 'Missing parameter',
                    'message': 'Audio path is required'
                }), 400
            
            app.logger.info(f"Deleting audio - path: {audio_path}, backend: {storage_backend}, uploadId: {upload_id}")
            
            # Only process Supabase Storage deletions
            if storage_backend == 'supabase':
                from ..services.supabase_storage_service import get_storage_service
                storage_service = get_storage_service()
                
                # Delete from storage bucket
                success, error = storage_service.delete_audio_file(audio_path)
                if not success:
                    app.logger.warning(f"Failed to delete from storage: {error}")
                    # Continue anyway to clean up database
                
                # Delete database record (will trigger storage usage update)
                if upload_id:
                    try:
                        # Get user ID for the deletion
                        user_id = g.user_id if not current_app.config.get('TESTING_MODE') else 'test-user'
                        
                        # Delete the file upload record
                        supabase = storage_service.supabase
                        result = supabase.table('file_uploads')\
                            .delete()\
                            .eq('id', upload_id)\
                            .eq('user_id', user_id)\
                            .execute()
                        
                        app.logger.info(f"✅ Deleted file upload record: {upload_id}")
                    except Exception as db_error:
                        app.logger.error(f"Failed to delete database record: {db_error}")
                        # Continue anyway
                
                return jsonify({
                    'success': True,
                    'message': 'Audio file deleted successfully'
                })
            else:
                # Local storage - just return success since we don't actually delete local files
                app.logger.info("Local storage file - no deletion needed")
                return jsonify({
                    'success': True,
                    'message': 'Local file reference cleared'
                })
            
        except Exception as e:
            app.logger.error(f'Error deleting audio: {str(e)}')
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
