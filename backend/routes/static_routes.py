from flask import Blueprint, send_from_directory
import os

def create_static_routes(app):
    """
    Create static file serving routes.
    Preserves the exact logic from original server.py but adapted for modular frontend
    """
    
    @app.route('/')
    def serve_index():
        """Serve main HTML file - from frontend/public"""
        return send_from_directory('../frontend/public', 'index.html')

    @app.route('/css/<path:filename>')
    def serve_css(filename):
        """Serve CSS files from frontend/css"""
        return send_from_directory('../frontend/css', filename)

    @app.route('/js/<path:filename>')
    def serve_js(filename):
        """Serve JavaScript files from frontend/js"""
        return send_from_directory('../frontend/js', filename)

    @app.route('/public/<path:filename>')
    def serve_public(filename):
        """Serve files from frontend/public"""
        return send_from_directory('../frontend/public', filename)

    @app.route('/pages/app/<path:filename>')
    def serve_app_pages(filename):
        """Serve files from frontend/pages/app"""
        return send_from_directory('../frontend/pages/app', filename)

    @app.route('/<path:filename>')
    def serve_static_files(filename):
        """Serve other static files from frontend root"""
        return send_from_directory('../frontend', filename)

    @app.route('/uploads/<filename>')
    def serve_upload(filename):
        """Serve uploaded files - exact logic preserved"""
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    @app.route('/exports/<export_id>/<filename>')
    def serve_export(export_id, filename):
        """Serve exported files - exact logic preserved"""
        export_path = os.path.join(app.config['EXPORT_FOLDER'], export_id)
        return send_from_directory(export_path, filename) 