from flask import Blueprint, send_from_directory, send_file, session, redirect, current_app, request
import os
from flask import jsonify

def create_static_routes(app):
    """
    Create static file serving routes.
    Preserves the exact logic from original server.py but adapted for modular frontend
    """
    
    @app.route('/')
    def serve_root():
        """Serve root route - redirect based on testing mode"""
        # Check if we're in testing mode
        if app.config.get('TESTING_MODE'):
            # Check if user is already authenticated
            if session.get('temp_authenticated'):
                return redirect('/app')
            else:
                return send_from_directory('../frontend/pages/temp-auth', 'temp-auth.html')
        else:
            # Normal mode - serve main index page
            return send_from_directory('../frontend', 'index.html')
    
    @app.route('/app')
    def serve_app():
        """Serve app route - check authentication in testing mode"""
        if app.config.get('TESTING_MODE'):
            # In testing mode, check temp authentication
            if not session.get('temp_authenticated'):
                return redirect('/')
        
        return send_from_directory('../frontend/pages/app', 'app.html')
    
    @app.route('/auth')
    @app.route('/profile')
    @app.route('/auth/reset-password')
    @app.route('/payment/success')
    @app.route('/payment/cancelled')
    @app.route('/payment/failed')
    @app.route('/privacy')
    @app.route('/terms')
    @app.route('/contact')
    def serve_auth_pages():
        """Serve auth-related pages - redirect to app in testing mode"""
        if app.config.get('TESTING_MODE'):
            # In testing mode, redirect these pages to root (except payment-related pages and legal pages)
            payment_paths = ['/payment/success', '/payment/cancelled', '/payment/failed']
            legal_paths = ['/privacy', '/terms', '/contact']
            if request.endpoint != 'serve_auth_pages' or (request.path not in payment_paths and request.path not in legal_paths):
                return redirect('/')
        
        return send_from_directory('../frontend', 'index.html')
    
    @app.route('/temp-auth')
    def serve_temp_auth():
        """Serve temporary authentication page"""
        if not app.config.get('TESTING_MODE'):
            return redirect('/')
        
        # If already authenticated, redirect to app
        if session.get('temp_authenticated'):
            return redirect('/app')
        
        return send_from_directory('../frontend/pages/temp-auth', 'temp-auth.html')

    @app.route('/test-auth-fix')
    def serve_test_auth_fix():
        """Serve auth fix test page"""
        return send_from_directory('../', 'test_auth_fix.html')

    @app.route('/favicon.ico')
    def serve_favicon():
        """Serve favicon"""
        return send_from_directory('../frontend/public/icons', 'favicon.ico')

    @app.route('/css/<path:filename>')
    def serve_css(filename):
        """Serve CSS files from frontend/css"""
        return send_from_directory('../frontend/css', filename)

    @app.route('/js/<path:filename>')
    def serve_js(filename):
        """Serve JavaScript files from frontend/js"""
        return send_from_directory('../frontend/js', filename)

    @app.route('/pages/<path:filename>')
    def serve_pages(filename):
        """Serve files from frontend/pages"""
        return send_from_directory('../frontend/pages', filename)

    @app.route('/pages/temp-auth/<path:filename>')
    def serve_temp_auth_files(filename):
        """Serve temp-auth page files"""
        return send_from_directory('../frontend/pages/temp-auth', filename)

    @app.route('/public/<path:filename>')
    def serve_public(filename):
        """Serve files from frontend/public"""
        return send_from_directory('../frontend/public', filename)

    @app.route('/uploads/<filename>', methods=['GET', 'OPTIONS'])
    def serve_upload(filename):
        """Serve uploaded files with proper CORS headers"""
        from flask import make_response, request
        
        # Handle CORS preflight request
        if request.method == 'OPTIONS':
            response = make_response()
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
            return response
        
        try:
            # **ENHANCED: Comprehensive diagnostic logging before attempting file serving**
            upload_folder = app.config.get('UPLOAD_FOLDER')
            file_path = os.path.join(upload_folder, filename) if upload_folder else None
            
            # Log detailed diagnostic information
            app.logger.info(f'🔍 FILE SERVE REQUEST: {filename}')
            app.logger.info(f'🔍 Upload folder config: {upload_folder}')
            app.logger.info(f'🔍 Full file path: {file_path}')
            app.logger.info(f'🔍 Upload folder exists: {os.path.exists(upload_folder) if upload_folder else "No upload folder configured"}')
            
            if upload_folder and os.path.exists(upload_folder):
                app.logger.info(f'🔍 Upload folder readable: {os.access(upload_folder, os.R_OK)}')
                app.logger.info(f'🔍 Upload folder contents count: {len(os.listdir(upload_folder)) if os.access(upload_folder, os.R_OK) else "Cannot read"}')
                
                if file_path:
                    app.logger.info(f'🔍 File exists: {os.path.exists(file_path)}')
                    if os.path.exists(file_path):
                        app.logger.info(f'🔍 File readable: {os.access(file_path, os.R_OK)}')
                        app.logger.info(f'🔍 File size: {os.path.getsize(file_path)} bytes')
            
            # Proceed with serving the file
            response = make_response(send_from_directory(upload_folder, filename))
            
            # Add CORS headers for cross-domain audio file access
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
            
            # Add caching headers for better performance
            response.headers['Cache-Control'] = 'public, max-age=3600'
            
            # Ensure proper MIME type for audio files
            if filename.lower().endswith(('.wav', '.mp3', '.m4a', '.ogg')):
                if filename.lower().endswith('.wav'):
                    response.headers['Content-Type'] = 'audio/wav'
                elif filename.lower().endswith('.mp3'):
                    response.headers['Content-Type'] = 'audio/mpeg'
                elif filename.lower().endswith('.m4a'):
                    response.headers['Content-Type'] = 'audio/mp4'
                elif filename.lower().endswith('.ogg'):
                    response.headers['Content-Type'] = 'audio/ogg'
            
            app.logger.info(f'✅ Successfully served file: {filename}')
            return response
            
        except FileNotFoundError as e:
            # **ENHANCED: Detailed file not found logging**
            app.logger.error(f'❌ FILE NOT FOUND: {filename}')
            app.logger.error(f'❌ Upload folder: {app.config.get("UPLOAD_FOLDER")}')
            app.logger.error(f'❌ Expected path: {os.path.join(app.config.get("UPLOAD_FOLDER", ""), filename)}')
            app.logger.error(f'❌ Upload folder exists: {os.path.exists(app.config.get("UPLOAD_FOLDER", ""))}')
            
            # List available files for debugging
            upload_folder = app.config.get('UPLOAD_FOLDER')
            if upload_folder and os.path.exists(upload_folder):
                try:
                    available_files = os.listdir(upload_folder)
                    app.logger.error(f'❌ Available files in upload folder: {available_files[:10]}')  # First 10 files
                    app.logger.error(f'❌ Total files in upload folder: {len(available_files)}')
                except Exception as list_error:
                    app.logger.error(f'❌ Could not list upload folder contents: {list_error}')
            
            return jsonify({'error': 'File not found', 'filename': filename}), 404
            
        except PermissionError as e:
            # **NEW: Handle permission errors specifically**
            app.logger.error(f'❌ PERMISSION ERROR serving {filename}: {str(e)}')
            app.logger.error(f'❌ Upload folder: {app.config.get("UPLOAD_FOLDER")}')
            app.logger.error(f'❌ File path: {os.path.join(app.config.get("UPLOAD_FOLDER", ""), filename)}')
            app.logger.error(f'❌ Process user: {os.getuid() if hasattr(os, "getuid") else "Unknown"}')
            return jsonify({'error': 'Permission denied', 'filename': filename}), 403
            
        except Exception as e:
            # **ENHANCED: Comprehensive error logging with system diagnostics**
            app.logger.error(f'❌ UNEXPECTED ERROR serving {filename}: {str(e)}')
            app.logger.error(f'❌ Error type: {type(e).__name__}')
            app.logger.error(f'❌ Upload folder config: {app.config.get("UPLOAD_FOLDER")}')
            app.logger.error(f'❌ Current working directory: {os.getcwd()}')
            app.logger.error(f'❌ App instance: {app}')
            
            # Check app configuration state
            app.logger.error(f'❌ App config keys: {list(app.config.keys())}')
            app.logger.error(f'❌ Flask app name: {app.name}')
            
            # System diagnostics
            try:
                import psutil
                memory_info = psutil.virtual_memory()
                app.logger.error(f'❌ System memory usage: {memory_info.percent}%')
                disk_info = psutil.disk_usage('/')
                app.logger.error(f'❌ Disk usage: {disk_info.percent}%')
            except ImportError:
                app.logger.error(f'❌ psutil not available for system diagnostics')
            except Exception as sys_error:
                app.logger.error(f'❌ System diagnostics failed: {sys_error}')
            
            return jsonify({
                'error': 'Internal server error', 
                'filename': filename,
                'error_type': type(e).__name__,
                'timestamp': str(e)
            }), 500

    @app.route('/exports/<export_id>/<filename>')
    def serve_export(export_id, filename):
        """Serve exported files"""
        export_path = os.path.join(app.config['EXPORT_FOLDER'], export_id)
        return send_from_directory(export_path, filename) 