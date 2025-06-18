from flask import Blueprint, request, jsonify, session, send_from_directory
import os

def create_password_protection_routes(app):
    """
    Create password protection routes for testing mode.
    This provides a simple password gate without full authentication.
    """
    
    @app.route('/api/auth/temp-login', methods=['POST'])
    def temp_login():
        """Handle temporary password authentication"""
        try:
            print(f"🔧 DEBUG: temp-login route called")
            print(f"🔧 DEBUG: Request method: {request.method}")
            print(f"🔧 DEBUG: Request content type: {request.content_type}")
            print(f"🔧 DEBUG: TESTING_MODE config: {app.config.get('TESTING_MODE')}")
            print(f"🔧 DEBUG: TEMPORARY_PASSWORD config: {bool(app.config.get('TEMPORARY_PASSWORD'))}")
            
            data = request.get_json()
            print(f"🔧 DEBUG: Request data: {data}")
            
            password = data.get('password', '') if data else ''
            print(f"🔧 DEBUG: Password received (length): {len(password)}")
            
            # Check if we're in testing mode
            if not app.config.get('TESTING_MODE'):
                print(f"🔧 DEBUG: Testing mode not enabled")
                return jsonify({
                    'success': False,
                    'error': 'Testing mode not enabled'
                }), 400
            
            # Verify password
            correct_password = app.config.get('TEMPORARY_PASSWORD')
            print(f"🔧 DEBUG: Correct password configured: {bool(correct_password)}")
            
            if not correct_password:
                print(f"🔧 DEBUG: Temporary password not configured")
                return jsonify({
                    'success': False,
                    'error': 'Temporary password not configured'
                }), 500
            
            print(f"🔧 DEBUG: Password match: {password == correct_password}")
            
            if password == correct_password:
                # Set session flag for authenticated access
                session.permanent = True  # Make session persistent
                session['temp_authenticated'] = True
                print(f"🔧 DEBUG: Authentication successful, session set")
                print(f"🔧 DEBUG: Session permanent: {session.permanent}")
                print(f"🔧 DEBUG: Session ID: {session.get('_id', 'None')}")
                return jsonify({
                    'success': True,
                    'message': 'Authentication successful'
                })
            else:
                print(f"🔧 DEBUG: Password mismatch")
                return jsonify({
                    'success': False,
                    'error': 'Invalid password'
                }), 401
                
        except Exception as e:
            print(f"Error in temp login: {e}")
            import traceback
            print(f"🔧 DEBUG: Full traceback: {traceback.format_exc()}")
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
        
        # Debug logging to understand session issues
        print(f"🔧 DEBUG: temp-status check")
        print(f"🔧 DEBUG: Session ID: {session.get('_id', 'None')}")
        print(f"🔧 DEBUG: Session keys: {list(session.keys())}")
        print(f"🔧 DEBUG: temp_authenticated: {session.get('temp_authenticated', 'NOT_SET')}")
        print(f"🔧 DEBUG: Session permanent: {session.permanent}")
        print(f"🔧 DEBUG: Request headers: {dict(request.headers)}")
        
        return jsonify({
            'authenticated': is_authenticated,
            'testing_mode': app.config.get('TESTING_MODE', False)
        })

    @app.route('/api/auth/debug-session', methods=['GET'])
    def debug_session():
        """Detailed session debug information"""
        import datetime
        
        session_data = {
            'session_id': session.get('_id', 'None'),
            'session_keys': list(session.keys()),
            'temp_authenticated': session.get('temp_authenticated', 'NOT_SET'),
            'session_permanent': session.permanent,
            'testing_mode': app.config.get('TESTING_MODE', False),
            'permanent_session_lifetime': str(app.config.get('PERMANENT_SESSION_LIFETIME', 'NOT_SET')),
            'session_cookie_secure': app.config.get('SESSION_COOKIE_SECURE', 'NOT_SET'),
            'session_cookie_samesite': app.config.get('SESSION_COOKIE_SAMESITE', 'NOT_SET'),
            'request_headers': dict(request.headers),
            'cookies_received': dict(request.cookies),
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
        
        # In testing mode, check for temp authentication
        is_authenticated = session.get('temp_authenticated', False)
        
        # Emergency fallback: check for special testing override header (for development only)
        if not is_authenticated and request.headers.get('X-Testing-Override') == 'temp-auth-bypass':
            print(f"🔧 DEBUG: Using emergency testing override for {f.__name__}")
            is_authenticated = True
        
        if not is_authenticated:
            return jsonify({
                'success': False,
                'error': 'Please authenticate with the temporary password first'
            }), 401
        
        return f(*args, **kwargs)
    
    decorated_function.__name__ = f.__name__
    return decorated_function 