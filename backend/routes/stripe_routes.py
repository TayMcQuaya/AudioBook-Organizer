"""
Stripe Routes
API endpoints for Stripe payment processing
"""

import logging
from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import os

from ..middleware.auth_middleware import require_auth, get_current_user
from ..services.stripe_service import stripe_service

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint
stripe_bp = Blueprint('stripe', __name__, url_prefix='/api/stripe')

def require_normal_mode(f):
    """Decorator to ensure payments only work in Normal mode (not testing mode)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        testing_mode = os.environ.get('TESTING_MODE', 'false').lower() == 'true'
        if testing_mode:
            return jsonify({
                'success': False,
                'error': 'Payment functionality is not available in testing mode. Please switch to normal mode to purchase credits.'
            }), 403
        return f(*args, **kwargs)
    return decorated_function

def require_payments_enabled(f):
    """Decorator to ensure payments are enabled via environment variable"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not stripe_service.are_payments_enabled():
            return jsonify({
                'success': False,
                'error': 'Payment functionality is currently disabled. Please contact support if you need to purchase credits.',
                'payments_enabled': False
            }), 503
        return f(*args, **kwargs)
    return decorated_function

@stripe_bp.route('/packages', methods=['GET'])
@require_auth
@require_normal_mode
@require_payments_enabled
def get_credit_packages():
    """Get available credit packages"""
    try:
        packages = stripe_service.get_all_packages()
        
        # Format packages for frontend
        formatted_packages = []
        for package_id, package_info in packages.items():
            formatted_packages.append({
                'id': package_id,
                'name': package_info['name'],
                'credits': package_info['credits'],
                'price_cents': package_info['price_cents'],
                'price_display': f"${package_info['price_cents'] / 100:.2f}",
                'description': package_info['description'],
                'credits_per_dollar': round(package_info['credits'] / (package_info['price_cents'] / 100), 1)
            })
        
        return jsonify({
            'success': True,
            'packages': formatted_packages
        })
        
    except Exception as e:
        logger.error(f"Error getting credit packages: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve credit packages'
        }), 500

@stripe_bp.route('/create-checkout-session', methods=['POST'])
@require_auth
@require_normal_mode
@require_payments_enabled
def create_checkout_session():
    """Create a Stripe Checkout session for credit purchase"""
    try:
        # Get current user
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'error': 'Authentication required'
            }), 401
        
        user_id = current_user.get('id')
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Invalid user session'
            }), 401
        
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body required'
            }), 400
        
        package_type = data.get('package_type')
        if not package_type:
            return jsonify({
                'success': False,
                'error': 'Package type is required'
            }), 400
        
        # Validate package type
        package_info = stripe_service.get_package_info(package_type)
        if not package_info:
            return jsonify({
                'success': False,
                'error': f'Invalid package type: {package_type}'
            }), 400
        
        # Get success and cancel URLs from request or use defaults
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        success_url = data.get('success_url', f"{frontend_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}")
        cancel_url = data.get('cancel_url', f"{frontend_url}/payment/cancelled")
        
        # Create checkout session
        success, session_id, error = stripe_service.create_checkout_session(
            user_id=user_id,
            package_type=package_type,
            success_url=success_url,
            cancel_url=cancel_url
        )
        
        if success:
            logger.info(f"Checkout session created for user {user_id}: {session_id}")
            return jsonify({
                'success': True,
                'session_id': session_id,
                'package_info': package_info
            })
        else:
            logger.error(f"Failed to create checkout session for user {user_id}: {error}")
            return jsonify({
                'success': False,
                'error': error or 'Failed to create checkout session'
            }), 500
            
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        return jsonify({
            'success': False,
            'error': 'An unexpected error occurred'
        }), 500

@stripe_bp.route('/session/<session_id>', methods=['GET'])
@require_auth
@require_normal_mode
@require_payments_enabled
def get_checkout_session(session_id):
    """Get checkout session details"""
    try:
        # Get current user for security
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'error': 'Authentication required'
            }), 401
        
        # Retrieve session
        success, session_data, error = stripe_service.get_checkout_session(session_id)
        
        if success:
            # Verify session belongs to current user (security check)
            session_user_id = session_data.get('metadata', {}).get('user_id')
            if session_user_id != current_user.get('id'):
                return jsonify({
                    'success': False,
                    'error': 'Unauthorized access to session'
                }), 403
            
            return jsonify({
                'success': True,
                'session': session_data
            })
        else:
            return jsonify({
                'success': False,
                'error': error or 'Failed to retrieve session'
            }), 404
            
    except Exception as e:
        logger.error(f"Error retrieving checkout session: {e}")
        return jsonify({
            'success': False,
            'error': 'An unexpected error occurred'
        }), 500

@stripe_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events"""
    try:
        # Get raw payload and signature
        payload = request.get_data()
        signature = request.headers.get('Stripe-Signature')
        
        if not signature:
            logger.error("No Stripe signature found in webhook request")
            return jsonify({'error': 'No signature'}), 400
        
        # Verify webhook signature
        success, event_data, error = stripe_service.verify_webhook_signature(payload, signature)
        
        if not success:
            logger.error(f"Webhook signature verification failed: {error}")
            return jsonify({'error': error}), 400
        
        event_type = event_data.get('type')
        logger.info(f"Processing webhook event: {event_type}")
        
        # Handle different event types
        if event_type == 'checkout.session.completed':
            # Payment was successful
            success, error = stripe_service.process_payment_success(event_data)
            
            if success:
                logger.info(f"Payment processed successfully for event: {event_data.get('id')}")
                return jsonify({'success': True}), 200
            else:
                logger.error(f"Failed to process payment: {error}")
                return jsonify({'error': error}), 500
        
        elif event_type == 'payment_intent.payment_failed':
            # Payment failed - log for monitoring
            session = event_data.get('data', {}).get('object', {})
            user_id = session.get('metadata', {}).get('user_id', 'unknown')
            logger.warning(f"Payment failed for user {user_id}: {event_data.get('id')}")
            
            # Still return 200 to acknowledge receipt
            return jsonify({'success': True}), 200
        
        else:
            # Other events we don't process but acknowledge
            logger.info(f"Received unhandled webhook event: {event_type}")
            return jsonify({'success': True}), 200
            
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        return jsonify({'error': 'Webhook processing failed'}), 500

@stripe_bp.route('/transactions', methods=['GET'])
@require_auth
@require_normal_mode
@require_payments_enabled
def get_user_transactions():
    """Get user's transaction history"""
    try:
        # Get current user
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'error': 'Authentication required'
            }), 401
        
        user_id = current_user.get('id')
        
        # Get transactions
        success, transactions, error = stripe_service.get_user_transactions(user_id)
        
        if success:
            # Format transactions for frontend
            formatted_transactions = []
            for transaction in transactions:
                metadata = transaction.get('metadata', {})
                formatted_transactions.append({
                    'id': transaction['id'],
                    'credits_amount': transaction['credits_amount'],
                    'status': transaction['status'],
                    'created_at': transaction['created_at'],
                    'package_type': metadata.get('package_type'),
                    'amount_display': f"${(metadata.get('amount_cents', 0) / 100):.2f}" if metadata.get('amount_cents') else 'N/A',
                    'stripe_session_id': transaction.get('stripe_session_id')
                })
            
            return jsonify({
                'success': True,
                'transactions': formatted_transactions
            })
        else:
            return jsonify({
                'success': False,
                'error': error or 'Failed to retrieve transactions'
            }), 500
            
    except Exception as e:
        logger.error(f"Error getting user transactions: {e}")
        return jsonify({
            'success': False,
            'error': 'An unexpected error occurred'
        }), 500

@stripe_bp.route('/config', methods=['GET'])
@require_normal_mode
def get_stripe_config():
    """Get Stripe configuration for frontend"""
    try:
        payment_status = stripe_service.get_payment_status()
        
        config_data = {
            'success': True,
            'payment_status': payment_status
        }
        
        # Only include sensitive data if payments are enabled
        if payment_status['enabled']:
            config_data.update({
                'publishable_key': stripe_service.stripe_publishable_key,
                'packages': stripe_service.get_all_packages()
            })
        
        return jsonify(config_data)
        
    except Exception as e:
        logger.error(f"Error getting Stripe config: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get Stripe configuration'
        }), 500

# Error handlers for this blueprint
@stripe_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@stripe_bp.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'success': False,
        'error': 'Method not allowed'
    }), 405

@stripe_bp.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error in Stripe routes: {error}")
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500 