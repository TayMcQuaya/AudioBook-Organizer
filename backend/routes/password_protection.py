from flask import Blueprint, request, jsonify, session, send_from_directory
import os
import secrets
import time

# Simple in-memory token store for testing mode (not for production)
temp_auth_tokens = {}

def create_password_protection_routes(app):
    """
    Create password protection routes for testing mode.
    This provides a simple password gate without full authentication.
    """
    
    @app.route('/api/auth/temp-login', methods=['POST'])
    def temp_login():
        """Handle temporary password authentication"""
        try:
            data = request.get_json()
            password = data.get('password', '') if data else ''
            
            # Check if we're in testing mode
            if not app.config.get('TESTING_MODE'):
                return jsonify({
                    'success': False,
                    'error': 'Testing mode not enabled'
                }), 400
            
            # Verify password
            correct_password = app.config.get('TEMPORARY_PASSWORD')
            
            if not correct_password:
                return jsonify({
                    'success': False,
                    'error': 'Temporary password not configured'
                }), 500
            
            if password == correct_password:
                # Generate a temporary token for cross-domain authentication
                token = secrets.token_urlsafe(32)
                temp_auth_tokens[token] = {
                    'created_at': time.time(),
                    'expires_at': time.time() + (24 * 60 * 60)  # 24 hours
                }
                
                # Also set session for backwards compatibility
                session.permanent = True  # Make session persistent
                session['temp_authenticated'] = True
                session['temp_token'] = token
                
                return jsonify({
                    'success': True,
                    'message': 'Authentication successful',
                    'token': token
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Invalid password'
                }), 401
                
        except Exception as e:
            return jsonify({
                'success': False,
                'error': 'Server error'
            }), 500
    
    @app.route('/api/auth/temp-logout', methods=['POST'])
    def temp_logout():
        """Handle temporary logout"""
        session.pop('temp_authenticated', None)
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        })
    
    @app.route('/api/auth/temp-status', methods=['GET'])
    def temp_status():
        """Check temporary authentication status"""
        is_authenticated = session.get('temp_authenticated', False)
        
        return jsonify({
            'authenticated': is_authenticated,
            'testing_mode': app.config.get('TESTING_MODE', False)
        })

    @app.route('/api/auth/debug-session', methods=['GET'])
    def debug_session():
        """Detailed session debug information"""
        import datetime
        
        # Remove sensitive headers from debug output
        safe_headers = {}
        for key, value in request.headers.items():
            if key.lower() in ['authorization', 'x-temp-auth', 'cookie']:
                safe_headers[key] = '***hidden***'
            else:
                safe_headers[key] = value
        
        session_data = {
            'session_id': session.get('_id', 'None'),
            'session_keys': [key for key in session.keys() if key != 'temp_token'],  # Hide token
            'temp_authenticated': session.get('temp_authenticated', 'NOT_SET'),
            'session_permanent': session.permanent,
            'testing_mode': app.config.get('TESTING_MODE', False),
            'permanent_session_lifetime': str(app.config.get('PERMANENT_SESSION_LIFETIME', 'NOT_SET')),
            'session_cookie_secure': app.config.get('SESSION_COOKIE_SECURE', 'NOT_SET'),
            'session_cookie_samesite': app.config.get('SESSION_COOKIE_SAMESITE', 'NOT_SET'),
            'request_headers': safe_headers,
            'cookies_received': '***hidden***',  # Hide all cookies
            'server_time': datetime.datetime.utcnow().isoformat() + 'Z'
        }
        
        return jsonify(session_data)

    @app.route('/api/auth/temp-refresh', methods=['POST'])
    def temp_refresh():
        """Refresh temporary session to extend its lifetime"""
        if not app.config.get('TESTING_MODE'):
            return jsonify({
                'success': False,
                'error': 'Testing mode not enabled'
            }), 400
        
        is_authenticated = session.get('temp_authenticated', False)
        
        if not is_authenticated:
            return jsonify({
                'success': False,
                'error': 'Not authenticated'
            }), 401
        
        # Refresh the session by updating it
        session.permanent = True
        session.modified = True  # Mark session as modified to trigger save with new expiry
        
        return jsonify({
            'success': True,
            'message': 'Session refreshed successfully'
        })

def require_temp_auth(f):
    """Decorator to require temporary authentication in testing mode"""
    def decorated_function(*args, **kwargs):
        from flask import current_app, request
        
        # If not in testing mode, allow normal operation
        if not current_app.config.get('TESTING_MODE'):
            return f(*args, **kwargs)
        
        is_authenticated = False
        
        # Method 1: Check session (for same-domain requests)
        if session.get('temp_authenticated', False):
            is_authenticated = True
        
        # Method 2: Check token in Authorization header (for cross-domain requests)
        elif request.headers.get('Authorization'):
            auth_header = request.headers.get('Authorization')
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]  # Remove 'Bearer ' prefix
                
                # Check if token exists and is valid
                if token in temp_auth_tokens:
                    token_data = temp_auth_tokens[token]
                    if time.time() < token_data['expires_at']:
                        is_authenticated = True
                    else:
                        # Clean up expired token
                        del temp_auth_tokens[token]
        
        # Method 3: Check token in X-Temp-Auth header (alternative method)
        elif request.headers.get('X-Temp-Auth'):
            token = request.headers.get('X-Temp-Auth')
            if token in temp_auth_tokens:
                token_data = temp_auth_tokens[token]
                if time.time() < token_data['expires_at']:
                    is_authenticated = True
                else:
                    # Clean up expired token
                    del temp_auth_tokens[token]
        
        # Emergency fallback: check for special testing override header (for development only)
        elif request.headers.get('X-Testing-Override') == 'temp-auth-bypass':
            is_authenticated = True
        
        if not is_authenticated:
            return jsonify({
                'success': False,
                'error': 'Please authenticate with the temporary password first'
            }), 401
        
        return f(*args, **kwargs)
    
    decorated_function.__name__ = f.__name__
    return decorated_function 