from flask import Blueprint, send_from_directory, send_file
import os

def create_static_routes(app):
    """
    Create static file serving routes.
    Preserves the exact logic from original server.py but adapted for modular frontend
    """
    
    @app.route('/')
    @app.route('/app')
    @app.route('/auth')
    @app.route('/profile')
    def serve_spa():
        """Serve main HTML file for all SPA routes"""
        return send_from_directory('../frontend/public', 'index.html')

    @app.route('/favicon.ico')
    def serve_favicon():
        """Serve favicon"""
        return send_from_directory('../frontend/public', 'favicon.ico')

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

    @app.route('/public/<path:filename>')
    def serve_public(filename):
        """Serve files from frontend/public"""
        return send_from_directory('../frontend/public', filename)

    @app.route('/uploads/<filename>')
    def serve_upload(filename):
        """Serve uploaded files"""
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    @app.route('/exports/<export_id>/<filename>')
    def serve_export(export_id, filename):
        """Serve exported files"""
        export_path = os.path.join(app.config['EXPORT_FOLDER'], export_id)
        return send_from_directory(export_path, filename) 