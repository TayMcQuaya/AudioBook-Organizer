"""
Contact Routes - Handle contact form submissions
"""

from flask import Blueprint, request, jsonify
import logging
from backend.services.email_service import get_email_service
from backend.services.security_service import get_security_service
from backend.utils.validation import validate_email

logger = logging.getLogger(__name__)

contact_bp = Blueprint('contact', __name__)

@contact_bp.route('/api/contact', methods=['POST'])
def submit_contact_form():
    """Handle contact form submissions"""
    try:
        # Get security service for rate limiting
        security_service = get_security_service()
        
        # Rate limiting check (5 submissions per hour)
        client_ip = security_service._get_client_ip()
        rate_limit_result = security_service.check_rate_limit(
            client_ip, 
            'contact'  # Use standard rate limit type
        )
        
        if not rate_limit_result['allowed']:
            return jsonify({
                'error': 'Rate limit exceeded',
                'message': 'Too many contact form submissions. Please try again later.'
            }), 429
        
        # Record the attempt
        security_service.record_attempt(client_ip, 'contact')
        
        # Get form data
        data = request.get_json()
        if not data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['name', 'email', 'subject', 'message']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return jsonify({
                'error': 'Missing required fields',
                'message': f'Missing: {", ".join(missing_fields)}'
            }), 400
        
        # Validate email format
        if not validate_email(data['email']):
            return jsonify({
                'error': 'Invalid email',
                'message': 'Please provide a valid email address'
            }), 400
        
        # Validate field lengths
        if len(data['name']) > 100:
            return jsonify({
                'error': 'Invalid input',
                'message': 'Name is too long (max 100 characters)'
            }), 400
        
        if len(data['subject']) > 200:
            return jsonify({
                'error': 'Invalid input',
                'message': 'Subject is too long (max 200 characters)'
            }), 400
            
        if len(data['message']) > 2000:
            return jsonify({
                'error': 'Invalid input',
                'message': 'Message is too long (max 2000 characters)'
            }), 400
        
        # Check for spam patterns (basic check)
        spam_keywords = ['viagra', 'casino', 'lottery', 'winner', 'click here', 'urgent']
        message_lower = data['message'].lower()
        if any(keyword in message_lower for keyword in spam_keywords):
            logger.warning(f"Potential spam contact form submission from {request.remote_addr}")
            return jsonify({
                'error': 'Message rejected',
                'message': 'Your message appears to contain spam content'
            }), 400
        
        # Get email service
        email_service = get_email_service()
        
        if not email_service.is_configured():
            logger.error("Email service not configured for contact form")
            return jsonify({
                'error': 'Service unavailable',
                'message': 'Contact form is temporarily unavailable. Please try again later.'
            }), 503
        
        # Send notification email to admin
        notification_result = email_service.send_contact_form_notification(data)
        
        # Send confirmation email to user (optional - don't fail if this fails)
        confirmation_result = email_service.send_contact_form_confirmation(
            data['email'], 
            data['name'],
            data  # Pass the full form data for template
        )
        
        if notification_result['success']:
            logger.info(f"Contact form submission successful from {data['email']}")
            
            # Return success even if confirmation email failed
            response_data = {
                'success': True,
                'message': 'Thank you for your message! We\'ll get back to you soon.'
            }
            
            if not confirmation_result['success']:
                logger.warning(f"Failed to send confirmation email: {confirmation_result.get('error')}")
                # Don't expose internal error to user
            
            return jsonify(response_data), 200
        else:
            logger.error(f"Failed to send contact form notification: {notification_result.get('error')}")
            return jsonify({
                'error': 'Submission failed',
                'message': 'Failed to send your message. Please try again later.'
            }), 500
    
    except Exception as e:
        logger.error(f"Contact form submission error: {e}")
        return jsonify({
            'error': 'Internal error',
            'message': 'An unexpected error occurred. Please try again later.'
        }), 500

@contact_bp.route('/api/contact/test', methods=['GET'])
def test_contact_service():
    """Test endpoint to check if contact service is working"""
    try:
        email_service = get_email_service()
        
        return jsonify({
            'email_service_configured': email_service.is_configured(),
            'smtp_server': email_service.smtp_server if email_service.is_configured() else 'Not configured',
            'from_email': email_service.from_email if email_service.is_configured() else 'Not configured',
            'contact_email': email_service.contact_email if email_service.is_configured() else 'Not configured'
        }), 200
        
    except Exception as e:
        logger.error(f"Contact service test error: {e}")
        return jsonify({
            'error': 'Test failed',
            'message': str(e)
        }), 500