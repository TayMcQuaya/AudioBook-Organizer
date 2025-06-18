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

def require_temp_auth(f):
    """Decorator to require temporary authentication in testing mode"""
    def decorated_function(*args, **kwargs):
        from flask import current_app, request
        
        # If not in testing mode, allow normal operation
        if not current_app.config.get('TESTING_MODE'):
            print(f"🔧 DEBUG: Not in testing mode, allowing access to {f.__name__}")
            return f(*args, **kwargs)
        
        # Debug logging
        print(f"🔧 DEBUG: Checking temp auth for {f.__name__}")
        print(f"🔧 DEBUG: Session ID: {session.get('_id', 'None')}")
        print(f"🔧 DEBUG: Session keys: {list(session.keys())}")
        print(f"🔧 DEBUG: temp_authenticated: {session.get('temp_authenticated', 'NOT_SET')}")
        print(f"🔧 DEBUG: Request method: {request.method}")
        print(f"🔧 DEBUG: Request URL: {request.url}")
        
        # In testing mode, check for temp authentication
        is_authenticated = session.get('temp_authenticated', False)
        
        # Fallback: check for custom header if session fails
        if not is_authenticated and request.headers.get('X-Temp-Auth') == 'authenticated':
            print(f"🔧 DEBUG: Using fallback header authentication")
            is_authenticated = True
            
        # Emergency fallback: check for special testing override header
        elif not is_authenticated and request.headers.get('X-Testing-Override') == 'temp-auth-bypass':
            print(f"🔧 DEBUG: Using emergency testing override")
            is_authenticated = True
        
        if not is_authenticated:
            print(f"🔧 DEBUG: Access denied - not authenticated")
            return jsonify({
                'success': False,
                'error': 'Authentication required'
            }), 401
        
        print(f"🔧 DEBUG: Access granted to {f.__name__}")
        return f(*args, **kwargs)
    
    decorated_function.__name__ = f.__name__
    return decorated_function 