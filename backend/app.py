from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import os
import logging
from datetime import datetime

from .config import config
from .utils.file_utils import ensure_directories_exist
from .routes.static_routes import create_static_routes
from .routes.upload_routes import create_upload_routes
from .routes.export_routes import create_export_routes
from .routes.auth_routes import create_auth_routes
from .routes.project_routes import project_bp
from .routes.docx_routes import docx_bp
from .services.supabase_service import init_supabase_service
from .services.security_service import init_security_service

def create_app(config_name='default'):
    """
    Create and configure Flask application.
    Preserves all functionality from original server.py
    """
    # Initialize Flask app - exact settings preserved
    app = Flask(__name__, static_url_path='', static_folder='../frontend')
    app.config.from_object(config[config_name])
    
    # Enable CORS for all routes - exact setting preserved
    CORS(app)
    
    # Debug logging - exact setting preserved
    app.logger.setLevel('DEBUG')
    
    # Ensure directories exist - exact logic preserved
    ensure_directories_exist(app.config['UPLOAD_FOLDER'], app.config['EXPORT_FOLDER'])
    
    # Initialize Supabase service
    if app.config.get('SUPABASE_URL') and app.config.get('SUPABASE_KEY'):
        init_supabase_service(
            app.config['SUPABASE_URL'],
            app.config['SUPABASE_KEY'],
            app.config['SUPABASE_JWT_SECRET']
        )
        app.logger.info("✅ Supabase service initialized")
    else:
        app.logger.warning("⚠️ Supabase configuration not found - authentication features will be disabled")
    
    # Initialize security service
    security_service = init_security_service()
    
    # Register routes - preserving exact functionality and adding auth
    create_static_routes(app)
    create_upload_routes(app, app.config['UPLOAD_FOLDER'])
    create_export_routes(app, app.config['UPLOAD_FOLDER'], app.config['EXPORT_FOLDER'])
    
    # Register authentication routes
    auth_routes = create_auth_routes()
    app.register_blueprint(auth_routes)
    
    # Register project persistence routes
    app.register_blueprint(project_bp, url_prefix='/api/projects')
    
    # Register DOCX processing routes
    app.register_blueprint(docx_bp)
    
    # Debug route to check all registered routes - exact functionality preserved
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
    
    # Test API route - exact functionality preserved
    @app.route('/api/test', methods=['GET'])
    def test_api():
        return jsonify({
            'success': True,
            'message': 'API is working'
        })
    
    # Debug endpoint for time checking
    @app.route('/debug/time', methods=['GET'])
    def debug_time():
        current_timestamp = datetime.utcnow().timestamp()
        return jsonify({
            'server_timestamp': current_timestamp,
            'server_time_readable': datetime.utcnow().isoformat() + 'Z',
            'server_timezone': str(datetime.now().astimezone().tzinfo)
        })
    
    return app

def run_app():
    """
    Run the application.
    Preserves the exact server startup logic from original server.py
    """
    app = create_app()
    
    print("\nServer starting...")
    print(f"Static folder: {app.static_folder}")
    print(f"Upload folder: {app.config['UPLOAD_FOLDER']}")
    print(f"Export folder: {app.config['EXPORT_FOLDER']}")
    print("\nRegistered routes:")
    for rule in app.url_map.iter_rules():
        print(f"{rule.endpoint}: {rule.methods} {rule}")
    print(f"\nStarting server on http://{app.config['HOST']}:{app.config['PORT']}")
    
    app.run(
        host=app.config['HOST'], 
        port=app.config['PORT'], 
        debug=app.config['DEBUG']
    )

if __name__ == '__main__':
    run_app()