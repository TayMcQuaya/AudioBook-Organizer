"""
CSRF Protection Middleware
Provides CSRF protection for state-changing operations without breaking existing API flow
"""

import os
import logging
from flask import request, jsonify, session
from functools import wraps
import secrets

logger = logging.getLogger(__name__)

class CSRFProtection:
    def __init__(self, app=None):
        self.app = app
        self.secret_key = None
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize CSRF protection with Flask app"""
        self.secret_key = app.config.get('SECRET_KEY', 'dev-secret-key')
        app.csrf = self
        
    def generate_csrf_token(self):
        """Generate a CSRF token for the current session"""
        if 'csrf_token' not in session:
            session['csrf_token'] = secrets.token_urlsafe(32)
        return session['csrf_token']
    
    def validate_csrf_token(self, token):
        """Validate CSRF token against session"""
        if not token:
            return False
        
        session_token = session.get('csrf_token')
        if not session_token:
            return False
            
        # Use secure comparison to prevent timing attacks
        return secrets.compare_digest(str(session_token), str(token))

# Global CSRF instance
csrf = CSRFProtection()

def csrf_protect(f):
    """
    Decorator to protect routes with CSRF validation
    Only applies to POST, PUT, PATCH, DELETE methods
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Only protect state-changing methods
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            # Get CSRF token from header or form data
            csrf_token = (
                request.headers.get('X-CSRFToken') or
                request.headers.get('X-CSRF-Token') or
                request.form.get('csrf_token') or
                (request.get_json().get('csrf_token') if request.is_json else None)
            )
            
            if not csrf.validate_csrf_token(csrf_token):
                logger.warning(f"CSRF validation failed for {request.endpoint} from {request.remote_addr}")
                return jsonify({
                    'success': False,
                    'error': 'CSRF token validation failed',
                    'code': 'CSRF_INVALID'
                }), 403
        
        return f(*args, **kwargs)
    return decorated_function

def get_csrf_token():
    """Helper function to get CSRF token for frontend"""
    return csrf.generate_csrf_token() 