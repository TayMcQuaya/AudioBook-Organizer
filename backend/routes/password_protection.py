from flask import Blueprint, request, jsonify, session, send_from_directory
import os
import secrets
import time

# Authentication store - tokens are temporarily stored in memory
# Note: In production, consider using Redis or database for persistence
temp_auth_tokens = {}

def create_password_protection_routes(app):
    """
    Create password protection routes for testing mode.
    This provides a simple password gate without full authentication.
    """
    
    # Create a cleanup function for expired tokens
    def cleanup_expired_tokens():
        """Remove expired tokens from memory"""
        current_time = time.time()
        expired_tokens = [token for token, data in temp_auth_tokens.items() 
                         if current_time >= data['expires_at']]
        for token in expired_tokens:
            del temp_auth_tokens[token]
        app.logger.debug(f"🧹 Cleaned up {len(expired_tokens)} expired tokens")
    
    @app.route('/api/auth/temp-login', methods=['POST'])
    def temp_login():
        """Handle temporary password authentication"""
        try:
            data = request.get_json()
            password = data.get('password', '') if data else ''
            
            # Check if we're in testing mode
            if not app.config.get('TESTING_MODE'):
                app.logger.warning(f"🚫 Temp login attempted but TESTING_MODE is disabled: {app.config.get('TESTING_MODE')}")
                return jsonify({
                    'success': False,
                    'error': 'Testing mode not enabled'
                }), 400
            
            # Debug logging for production
            app.logger.info(f"🔐 Temp login attempt in testing mode")
            app.logger.info(f"   - TESTING_MODE config: {app.config.get('TESTING_MODE')}")
            app.logger.info(f"   - Password provided: {'***' if password else 'NO_PASSWORD'}")
            
            correct_password = app.config.get('TEMPORARY_PASSWORD')
            
            if not correct_password:
                app.logger.error(f"❌ TEMPORARY_PASSWORD not configured in environment")
                return jsonify({
                    'success': False,
                    'error': 'Temporary password not configured'
                }), 500
            
            app.logger.info(f"   - Configured password: {'***' if correct_password else 'NOT_SET'}")
            
            if password == correct_password:
                # Clean up expired tokens first
                cleanup_expired_tokens()
                
                # Generate a temporary token for cross-domain authentication
                token = secrets.token_urlsafe(32)
                temp_auth_tokens[token] = {
                    'created_at': time.time(),
                    'expires_at': time.time() + (24 * 60 * 60),  # 24 hours
                    'user_agent': request.headers.get('User-Agent', 'unknown'),
                    'ip_address': request.remote_addr
                }
                
                # Set session as PRIMARY authentication method (survives server restarts better)
                session.permanent = True  # Make session persistent
                session['temp_authenticated'] = True
                session['temp_token'] = token
                session['auth_time'] = time.time()
                session['ip_address'] = request.remote_addr
                
                app.logger.info(f"✅ Temp authentication successful")
                app.logger.info(f"   - Token generated and stored (expires in 24h)")
                app.logger.info(f"   - Session configured as primary auth method")
                app.logger.info(f"   - Total active tokens: {len(temp_auth_tokens)}")
                
                return jsonify({
                    'success': True,
                    'message': 'Authentication successful',
                    'token': token
                })
            else:
                app.logger.warning(f"❌ Invalid password provided for temp authentication")
                return jsonify({
                    'success': False,
                    'error': 'Invalid password'
                }), 401
                
        except Exception as e:
            app.logger.error(f"❌ Temp login error: {str(e)}")
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
        auth_method = None
        
        # Debug logging for authentication attempts (enhanced for production debugging)
        current_app.logger.info(f"🔐 Auth check for {request.endpoint}")
        current_app.logger.info(f"   - Testing mode: {current_app.config.get('TESTING_MODE')}")
        current_app.logger.info(f"   - Session temp_authenticated: {session.get('temp_authenticated', False)}")
        current_app.logger.info(f"   - Authorization header: {'Present' if request.headers.get('Authorization') else 'Missing'}")
        current_app.logger.info(f"   - X-Temp-Auth header: {'Present' if request.headers.get('X-Temp-Auth') else 'Missing'}")
        current_app.logger.info(f"   - Session keys: {list(session.keys())}")
        current_app.logger.info(f"   - Token store size: {len(temp_auth_tokens)}")
        
        # PRIMARY METHOD: Check session first (most reliable for cross-deployment requests) - this is the only method that works for cross-domain requests
        if session.get('temp_authenticated', False):
            # Additional session validation
            auth_time = session.get('auth_time', 0)
            session_age = time.time() - auth_time
            
            # Sessions valid for 24 hours
            if session_age < (24 * 60 * 60):
                is_authenticated = True
                auth_method = "session"
                current_app.logger.debug(f"✅ Valid session found (age: {session_age/3600:.1f} hours)")
            else:
                current_app.logger.debug(f"❌ Session expired (age: {session_age/3600:.1f} hours)")
                # Clean up expired session
                session.pop('temp_authenticated', None)
                session.pop('temp_token', None)
                session.pop('auth_time', None)
        
        # SECONDARY METHOD: Check token in Authorization header (for cross-domain requests)
        elif request.headers.get('Authorization'):
            auth_header = request.headers.get('Authorization')
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]  # Remove 'Bearer ' prefix
                current_app.logger.info(f"🔍 Checking bearer token: {token[:20]}...")
                
                # Clean up expired tokens first
                current_time = time.time()
                expired_tokens = [t for t, data in temp_auth_tokens.items() 
                                if current_time >= data['expires_at']]
                for expired_token in expired_tokens:
                    del temp_auth_tokens[expired_token]
                
                current_app.logger.info(f"🔍 Token store contents: {list(temp_auth_tokens.keys())[:3]}..." if temp_auth_tokens else "Token store is empty")
                
                # Check if token exists and is valid
                if token in temp_auth_tokens:
                    token_data = temp_auth_tokens[token]
                    if current_time < token_data['expires_at']:
                        is_authenticated = True
                        auth_method = "bearer_token"
                        current_app.logger.info(f"✅ Valid bearer token found")
                        
                        # **WORKAROUND**: Set session for this request to maintain auth state
                        session['temp_authenticated'] = True
                        session['auth_time'] = current_time
                        session['temp_token'] = token
                        session.permanent = True
                        current_app.logger.info(f"✅ Session established from valid token")
                        
                    else:
                        current_app.logger.info(f"❌ Bearer token expired")
                        # Clean up expired token
                        del temp_auth_tokens[token]
                else:
                    current_app.logger.warning(f"❌ Bearer token not found in store (store size: {len(temp_auth_tokens)})")
                    current_app.logger.warning(f"❌ Available tokens: {list(temp_auth_tokens.keys())[:3]}...")
        
        # TERTIARY METHOD: Check token in X-Temp-Auth header (alternative method)
        elif request.headers.get('X-Temp-Auth'):
            token = request.headers.get('X-Temp-Auth')
            current_app.logger.info(f"🔍 Checking X-Temp-Auth token: {token[:20]}...")
            
            # Clean up expired tokens first
            current_time = time.time()
            expired_tokens = [t for t, data in temp_auth_tokens.items() 
                            if current_time >= data['expires_at']]
            for expired_token in expired_tokens:
                del temp_auth_tokens[expired_token]
            
            if token in temp_auth_tokens:
                token_data = temp_auth_tokens[token]
                if current_time < token_data['expires_at']:
                    is_authenticated = True
                    auth_method = "x_temp_auth"
                    current_app.logger.info(f"✅ Valid X-Temp-Auth token found")
                    
                    # **WORKAROUND**: Set session for this request to maintain auth state
                    session['temp_authenticated'] = True
                    session['auth_time'] = current_time
                    session['temp_token'] = token
                    session.permanent = True
                    current_app.logger.info(f"✅ Session established from valid X-Temp-Auth token")
                    
                else:
                    current_app.logger.info(f"❌ X-Temp-Auth token expired")
                    # Clean up expired token
                    del temp_auth_tokens[token]
            else:
                current_app.logger.warning(f"❌ X-Temp-Auth token not found in store (store size: {len(temp_auth_tokens)})")
        
        # EMERGENCY FALLBACK: Special testing override header (development only)
        elif request.headers.get('X-Testing-Override') == 'temp-auth-bypass':
            is_authenticated = True
            auth_method = "testing_override"
            current_app.logger.debug(f"⚠️ Using testing override for authentication")
        
        # Final authentication result logging
        if is_authenticated:
            current_app.logger.info(f"✅ Auth SUCCESS for {request.endpoint} (method: {auth_method})")
        else:
            current_app.logger.warning(f"❌ Auth FAILED for {request.endpoint}")
            current_app.logger.warning(f"   - Session auth: {session.get('temp_authenticated', False)}")
            current_app.logger.warning(f"   - Token store size: {len(temp_auth_tokens)}")
            current_app.logger.warning(f"   - Session keys: {list(session.keys())}")
            current_app.logger.warning(f"   - Request method: {request.method}")
            current_app.logger.warning(f"   - Request path: {request.path}")
            
            return jsonify({
                'success': False,
                'error': 'Please authenticate with the temporary password first'
            }), 401
        
        return f(*args, **kwargs)
    
    decorated_function.__name__ = f.__name__
    return decorated_function 