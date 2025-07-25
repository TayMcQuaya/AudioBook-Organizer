from flask import Flask, jsonify, send_from_directory, request, session
from flask_cors import CORS
import os
import logging
from datetime import datetime, timedelta
import re

from .config import config
from .utils.file_utils import ensure_directories_exist
from .utils.file_cleanup import cleanup_old_files, cleanup_temp_files
from .routes.static_routes import create_static_routes
from .routes.upload_routes import create_upload_routes
from .routes.export_routes import create_export_routes
from .routes.auth_routes import create_auth_routes
from .routes.project_routes import project_bp
from .routes.docx_routes import docx_bp
from .routes.password_protection import create_password_protection_routes
from .routes.stripe_routes import stripe_bp
from .routes.security_routes import security_bp
from .middleware.csrf_middleware import csrf
from .middleware.rate_limiter import create_limiter
from .middleware.security_headers import init_security_headers
from .middleware.domain_redirect import init_domain_redirect
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
    
    # Environment-aware CORS configuration
    # Development: Enable CORS for Docker testing
    # Production: No CORS needed (unified deployment = same origin)
    
    if os.environ.get('FLASK_ENV') == 'development':
        # Development: Minimal CORS for Docker testing
        allowed_origins_env = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:8000')
        allowed_origins = [origin.strip() for origin in allowed_origins_env.split(',')]
        
        # Add common development origins
        allowed_origins.extend([
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8000"
        ])
        
        app.logger.info(f"🌐 CORS Configuration (Development):")
        app.logger.info(f"   - Allowed origins: {allowed_origins}")
        app.logger.info(f"   - Testing mode: {app.config.get('TESTING_MODE', False)}")
        
        CORS(
            app,
            origins=allowed_origins,
            supports_credentials=True,
            methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token", "X-Temp-Auth"],
            expose_headers=["Content-Disposition", "X-Auth-Status", "X-Session-Status"]
        )
    else:
        # Production: No CORS needed for unified deployment
        app.logger.info(f"🌐 CORS Configuration (Production):")
        app.logger.info(f"   - CORS disabled (unified deployment - same origin)")
        app.logger.info(f"   - App domain: {os.environ.get('APP_DOMAIN', 'Not configured')}")
    
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
    
    # Clean up old files on startup for better resource management
    if config_name == 'production':
        cleanup_old_files(app.config['UPLOAD_FOLDER'])
        cleanup_temp_files(app.config['UPLOAD_FOLDER'])
    
    # Initialize Supabase service
    if app.config.get('SUPABASE_URL') and app.config.get('SUPABASE_KEY'):
        init_supabase_service(
            app.config['SUPABASE_URL'],
            app.config['SUPABASE_KEY'],
            app.config['SUPABASE_JWT_SECRET'],
            app.config.get('SUPABASE_SERVICE_KEY')  # Add service key for webhooks
        )
        app.logger.info("✅ Supabase service initialized")
    else:
        app.logger.warning("⚠️ Supabase configuration not found - authentication features will be disabled")
    
    # Initialize security service
    security_service = init_security_service()
    
    # Initialize domain redirect middleware (production only)
    init_domain_redirect(app)
    app.logger.info("✅ Domain redirect middleware initialized")
    
    # Initialize CSRF protection
    csrf.init_app(app)
    app.logger.info("✅ CSRF protection initialized")
    
    # Initialize rate limiter
    app.limiter = create_limiter(app)
    app.logger.info("✅ Rate limiting initialized")
    
    # Initialize security headers
    init_security_headers(app)
    
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
    
    # Register Stripe payment routes (Normal mode only)
    app.register_blueprint(stripe_bp)
    
    # Register security routes (CSRF tokens, etc.)
    app.register_blueprint(security_bp)
    
    # Register contact form routes
    from backend.routes.contact_routes import contact_bp
    app.register_blueprint(contact_bp)
    
    # Register password protection routes
    create_password_protection_routes(app)
    
    # Test API route - exact functionality preserved
    @app.route('/api/test', methods=['GET'])
    def test_api():
        return jsonify({
            'success': True,
            'message': 'API is working'
        })
    
    # Debug configuration endpoint for frontend
    @app.route('/debug/config', methods=['GET'])
    def debug_config():
        """Provide configuration information for frontend environment detection"""
        flask_env = os.environ.get('FLASK_ENV', 'development')
        return jsonify({
            'testing_mode': app.config.get('TESTING_MODE', False),
            'environment': 'development' if app.config.get('DEBUG') else 'production',
            'flask_env': flask_env,  # Add the actual FLASK_ENV value
            'temporary_password_configured': bool(app.config.get('TEMPORARY_PASSWORD')),
            'server_type': 'flask-dev' if app.config.get('DEBUG') else 'gunicorn-prod',
            'timestamp': datetime.now().isoformat()
        })
    
    return app

def run_app():
    """
    Run the application.
    Preserves the exact server startup logic from original server.py
    """
    app = create_app()
    
    # **SECURITY FIX: Removed system information logging to prevent infrastructure exposure**
    # Server starting with secured configuration
    
    app.run(
        host=app.config['HOST'], 
        port=app.config['PORT'], 
        debug=app.config['DEBUG']
    )

if __name__ == '__main__':
    run_app()