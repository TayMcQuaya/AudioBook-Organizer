from flask import Flask, jsonify, send_from_directory, request, session
from flask_cors import CORS
import os
import logging
from datetime import datetime, timedelta
import re

from .config import config
from .utils.file_utils import ensure_directories_exist
from .routes.static_routes import create_static_routes
from .routes.upload_routes import create_upload_routes
from .routes.export_routes import create_export_routes
from .routes.auth_routes import create_auth_routes
from .routes.project_routes import project_bp
from .routes.docx_routes import docx_bp
from .routes.password_protection import create_password_protection_routes
from .services.supabase_service import init_supabase_service
from .services.security_service import init_security_service

def create_app(config_name=None):
    """
    Create and configure Flask application.
    Preserves all functionality from original server.py
    """
    # Auto-detect environment if not specified
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
        if config_name not in config:
            config_name = 'production' if os.environ.get('FLASK_ENV') == 'production' else 'development'
    
    # Initialize Flask app - exact settings preserved
    app = Flask(__name__, static_url_path='', static_folder='../frontend')
    app.config.from_object(config[config_name])
    
    # Configure CORS for cross-domain support in production
    # Session cookies are now properly configured via config.py - no override needed
    app.logger.info(f"Session configuration: Lifetime={app.config['PERMANENT_SESSION_LIFETIME']}, "
                   f"Secure={app.config['SESSION_COOKIE_SECURE']}, "
                   f"SameSite={app.config['SESSION_COOKIE_SAMESITE']}, "
                   f"Testing Mode={app.config.get('TESTING_MODE', False)}")
    
    # Define allowed origins for CORS.
    # This allows the main Vercel app URL and any of its preview deployments.
    # We compile the regex for performance and correctness.
    allowed_origins_regex = re.compile(r"https://audio-book-organizer(-[a-z0-9\-]+)?\.vercel\.app")

    # Add debug logging for CORS configuration
    app.logger.info(f"🌐 CORS Configuration:")
    app.logger.info(f"   - Main Vercel URL: https://audio-book-organizer.vercel.app")
    app.logger.info(f"   - Regex pattern: {allowed_origins_regex.pattern}")
    app.logger.info(f"   - Testing mode: {app.config.get('TESTING_MODE', False)}")

    CORS(
        app,
        origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5000",
            "http://127.0.0.1:5000",
            "https://audio-book-organizer.vercel.app", # Explicitly add main production URL
            r"https://audio-book-organizer.*\.vercel\.app", # More permissive regex for preview branches
            allowed_origins_regex  # Add the compiled regex
        ],
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token", "X-Temp-Auth"],
        expose_headers=["Content-Disposition", "X-Auth-Status", "X-Session-Status"]  # Add debugging headers
    )
    
    # Configure logging based on environment
    if config_name == 'production':
        app.logger.setLevel(logging.INFO)
        app.logger.info(f"🚀 Starting AudioBook Organizer in PRODUCTION mode")
    else:
        app.logger.setLevel(logging.DEBUG)
        app.logger.info(f"🔧 Starting AudioBook Organizer in DEVELOPMENT mode")
    
    # DEBUG: Log critical environment variables at startup
    app.logger.info(f"🔧 Environment Variables at Startup:")
    app.logger.info(f"   - TESTING_MODE: {os.environ.get('TESTING_MODE', 'NOT_SET')} → Parsed: {app.config.get('TESTING_MODE', 'NOT_SET')}")
    app.logger.info(f"   - TEMPORARY_PASSWORD: {'CONFIGURED' if os.environ.get('TEMPORARY_PASSWORD') else 'NOT_SET'}")
    app.logger.info(f"   - FLASK_ENV: {os.environ.get('FLASK_ENV', 'NOT_SET')}")
    app.logger.info(f"   - Config Class: {config_name} → {type(app.config).__name__}")
    
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
    
    # Register password protection routes
    create_password_protection_routes(app)
    
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
    
    # Auth test endpoint (requires authentication)
    @app.route('/api/test-auth', methods=['GET', 'POST'])
    def test_auth():
        from .routes.password_protection import require_temp_auth
        
        @require_temp_auth
        def authenticated_test():
            return jsonify({
                'success': True,
                'message': 'Authentication working correctly',
                'session_auth': session.get('temp_authenticated', False),
                'testing_mode': app.config.get('TESTING_MODE', False),
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            })
        
        return authenticated_test()
    
    # Simple debug route for environment variables (no auth required)
    @app.route('/api/debug-env', methods=['GET'])
    def debug_env():
        return jsonify({
            'testing_mode_raw': os.environ.get('TESTING_MODE', 'NOT_SET'),
            'testing_mode_parsed': app.config.get('TESTING_MODE', False),
            'temporary_password_configured': bool(app.config.get('TEMPORARY_PASSWORD')),
            'flask_env': os.environ.get('FLASK_ENV', 'NOT_SET'),
            'backend_url_raw': os.environ.get('BACKEND_URL', 'NOT_SET'),
            'config_class': type(app.config).__name__,
            'session_config': {
                'secure': app.config.get('SESSION_COOKIE_SECURE', 'NOT_SET'),
                'samesite': app.config.get('SESSION_COOKIE_SAMESITE', 'NOT_SET'),
                'httponly': app.config.get('SESSION_COOKIE_HTTPONLY', 'NOT_SET')
            },
            'timestamp': datetime.utcnow().isoformat() + 'Z'
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
    
    # Debug endpoint for testing mode configuration
    @app.route('/debug/config', methods=['GET'])
    def debug_config():
        """Enhanced debug endpoint for environment configuration"""
        
        # Detect server type
        server_name = request.environ.get('SERVER_SOFTWARE', 'unknown')
        is_gunicorn = 'gunicorn' in server_name.lower()
        is_flask_dev = 'werkzeug' in server_name.lower() or not is_gunicorn
        
        server_type = 'gunicorn-prod' if is_gunicorn else 'flask-dev'
        
        return jsonify({
            'testing_mode': app.config.get('TESTING_MODE', False),
            'temporary_password_configured': bool(app.config.get('TEMPORARY_PASSWORD')),
            'environment': os.environ.get('FLASK_ENV', 'development'),
            'server_type': server_type,
            'server_software': server_name,
            'debug_mode': app.config.get('DEBUG', False),
            'host': app.config.get('HOST', 'unknown'),
            'port': app.config.get('PORT', 'unknown'),
            'config_class': type(app.config).__name__ if hasattr(app.config, '__class__') else 'unknown',
            'session_config': {
                'lifetime_hours': app.config.get('PERMANENT_SESSION_LIFETIME', timedelta(hours=1)).total_seconds() / 3600,
                'cookie_secure': app.config.get('SESSION_COOKIE_SECURE', False),
                'cookie_samesite': app.config.get('SESSION_COOKIE_SAMESITE', 'Lax')
            },
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'available_env_vars': {
                'TESTING_MODE': os.environ.get('TESTING_MODE', 'NOT_SET'),
                'TEMPORARY_PASSWORD': 'CONFIGURED' if os.environ.get('TEMPORARY_PASSWORD') else 'NOT_SET',
                'FLASK_ENV': os.environ.get('FLASK_ENV', 'NOT_SET'),
                'SESSION_COOKIE_SECURE': os.environ.get('SESSION_COOKIE_SECURE', 'NOT_SET')
            }
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