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
    def serve_auth_pages():
        """Serve auth-related pages - redirect to app in testing mode"""
        if app.config.get('TESTING_MODE'):
            # In testing mode, redirect these pages to root (except payment success)
            if request.endpoint != 'serve_auth_pages' or request.path != '/payment/success':
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
            response = make_response(send_from_directory(app.config['UPLOAD_FOLDER'], filename))
            
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
            
            return response
            
        except FileNotFoundError:
            app.logger.error(f'Audio file not found: {filename}')
            return jsonify({'error': 'File not found'}), 404
        except Exception as e:
            app.logger.error(f'Error serving audio file {filename}: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/exports/<export_id>/<filename>')
    def serve_export(export_id, filename):
        """Serve exported files"""
        export_path = os.path.join(app.config['EXPORT_FOLDER'], export_id)
        return send_from_directory(export_path, filename) 