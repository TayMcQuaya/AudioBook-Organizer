"""
Security Routes
Provides security-related endpoints like CSRF tokens
"""

from flask import Blueprint, jsonify
from ..middleware.csrf_middleware import get_csrf_token

security_bp = Blueprint('security', __name__, url_prefix='/api/security')

@security_bp.route('/csrf-token', methods=['GET'])
def csrf_token():
    """Get CSRF token for the current session"""
    try:
        token = get_csrf_token()
        return jsonify({
            'success': True,
            'csrf_token': token
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to generate CSRF token'
        }), 500 