# AudioBook Organizer - DOCX Upload Routes

from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
import tempfile
import time
from backend.services.docx_service import DocxService
from backend.middleware.auth_middleware import require_auth
from backend.routes.password_protection import require_temp_auth
from backend.services.supabase_service import get_supabase_service

# Create blueprint
docx_bp = Blueprint('docx', __name__)

# Initialize service
docx_service = DocxService()

# Configuration
MAX_DOCX_SIZE = 25 * 1024 * 1024  # 25MB
ALLOWED_EXTENSIONS = {'.docx'}


def allowed_file(filename):
    """Check if file has allowed extension"""
    if not filename or '.' not in filename:
        return False
    
    # Get file extension (lowercase)
    file_ext = '.' + filename.rsplit('.', 1)[1].lower()
    
    # Check if it's in allowed extensions
    return file_ext in ALLOWED_EXTENSIONS


@docx_bp.route('/api/upload/docx', methods=['POST'])
def upload_docx():
    """
    Handle DOCX file upload with formatting extraction and proper auth/credit management
    
    Returns:
        JSON response with text and formatting data
    """
    start_time = time.time()
    
    try:
        # Check mode and apply appropriate authentication
        if current_app.config.get('TESTING_MODE'):
            # Testing mode: check temp authentication
            from flask import session
            if not session.get('temp_authenticated'):
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Please authenticate with the temporary password first'
                }), 401
        else:
            # Normal mode: use proper auth + credits
            from flask import g
            from backend.middleware.auth_middleware import extract_token_from_header
            from backend.services.supabase_service import get_supabase_service
            
            # Extract and verify token
            token = extract_token_from_header()
            if not token:
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Authorization header with Bearer token is required'
                }), 401
            
            supabase_service = get_supabase_service()
            user = supabase_service.get_user_from_token(token)
            if not user:
                return jsonify({
                    'error': 'Invalid token',
                    'message': 'The provided token is invalid or expired'
                }), 401
            
            # Store user in context
            g.current_user = user
            g.user_id = user['id']
            g.user_email = user['email']
            
            # Check credits (5 credits required for DOCX processing)
            current_credits = supabase_service.get_user_credits(user['id'])
            if current_credits < 5:
                return jsonify({
                    'error': 'Insufficient credits',
                    'message': f'This action requires 5 credits. You have {current_credits} credits.',
                    'current_credits': current_credits,
                    'required_credits': 5
                }), 402
        # Validate request
        if 'file' not in request.files:
            return jsonify({
                'success': False, 
                'error': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        # Validate file
        if not file or file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        current_app.logger.info(f'Validating file: {file.filename}')
        if not allowed_file(file.filename):
            current_app.logger.warning(f'File rejected - invalid extension: {file.filename}')
            return jsonify({
                'success': False,
                'error': 'Please upload a .docx file'
            }), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)  # Reset file pointer
        
        if file_size > MAX_DOCX_SIZE:
            return jsonify({
                'success': False,
                'error': f'File too large. Maximum size is {MAX_DOCX_SIZE // (1024*1024)}MB'
            }), 400
        
        if file_size == 0:
            return jsonify({
                'success': False,
                'error': 'File is empty'
            }), 400
        
        # Create secure filename
        filename = secure_filename(file.filename)
        
        # Process the file
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_file:
            try:
                # Save uploaded file to temporary location
                file.save(temp_file.name)
                temp_file.flush()
                
                current_app.logger.info(f'Processing DOCX file: {filename} ({file_size} bytes)')
                
                # Validate DOCX file before processing
                validation = docx_service.validate_docx_file(temp_file.name)
                if not validation['valid']:
                    return jsonify({
                        'success': False,
                        'error': f'Invalid DOCX file: {validation.get("error", "Unknown error")}',
                        'error_type': validation.get('error_type', 'ValidationError')
                    }), 400
                
                # Get processing information
                processing_info = docx_service.get_processing_info(temp_file.name)
                current_app.logger.info(f'DOCX processing info: {processing_info}')
                
                # Extract text content WITH formatting
                result = docx_service.extract_content_with_formatting(temp_file.name)
                
                # Debug logging to understand what's being processed
                current_app.logger.info(f'DOCX text length: {len(result["text"])}')
                current_app.logger.info(f'DOCX first 200 chars: {repr(result["text"][:200])}')
                current_app.logger.info(f'DOCX formatting ranges: {len(result["formatting_ranges"])}')
                if result["formatting_ranges"]:
                    current_app.logger.info(f'First few formatting ranges: {result["formatting_ranges"][:5]}')
                
                # Calculate processing time
                processing_time = time.time() - start_time
                
                # Prepare response
                response_data = {
                    'success': True,
                    'text': result['text'],
                    'formatting_data': {
                        'ranges': result['formatting_ranges'],
                        'comments': result['comments'],
                        'version': '1.0',
                        'source': 'docx_import'
                    },
                    'metadata': {
                        'filename': filename,
                        'file_size': file_size,
                        'processing_time': round(processing_time, 2),
                        'text_length': len(result['text']),
                        'formatting_ranges_count': len(result['formatting_ranges']),
                        'paragraphs_processed': result['metadata']['total_paragraphs'],
                        'processing_notes': result['metadata'].get('processing_notes', [])
                    }
                }
                
                # Consume credits and log successful processing (only in normal mode)
                if not current_app.config.get('TESTING_MODE'):
                    supabase_service = get_supabase_service()
                    if supabase_service and supabase_service.is_configured():
                        try:
                            # Get current user from auth middleware
                            from flask import g
                            user_id = getattr(g, 'user_id', None)
                            if user_id:
                            # Deduct credits for DOCX processing
                                credit_success = supabase_service.update_user_credits(user_id, -5)
                            if not credit_success:
                                current_app.logger.warning('Failed to deduct credits for DOCX processing')
                            
                            # Log usage
                            supabase_service.log_usage(
                                    user_id,
                                'docx_processed',
                                credits_used=5,
                                metadata={
                                    'filename': filename,
                                    'file_size': file_size,
                                    'text_length': len(result['text']),
                                    'formatting_ranges': len(result['formatting_ranges']),
                                    'processing_time': processing_time
                                }
                            )
                        except Exception as log_error:
                            current_app.logger.warning(f'Failed to log usage: {log_error}')
                else:
                    current_app.logger.info('✅ Testing mode - Skipping credit deduction and usage logging')
                
                current_app.logger.info(
                    f'DOCX processed successfully: {filename} -> '
                    f'{len(result["text"])} chars, {len(result["formatting_ranges"])} formatting ranges'
                )
                
                return jsonify(response_data), 200
                
            except Exception as processing_error:
                current_app.logger.error(f'DOCX processing error: {str(processing_error)}')
                
                # Return specific error messages for common issues
                error_message = str(processing_error)
                if 'not a zip file' in error_message.lower():
                    return jsonify({
                        'success': False,
                        'error': 'Invalid DOCX file format. Please ensure the file is a valid Word document.'
                    }), 400
                elif 'permission denied' in error_message.lower():
                    return jsonify({
                        'success': False,
                        'error': 'File access denied. Please try again.'
                    }), 403
                elif 'memory' in error_message.lower():
                    return jsonify({
                        'success': False,
                        'error': 'File too large to process. Please try a smaller document.'
                    }), 413
                else:
                    return jsonify({
                        'success': False,
                        'error': 'Failed to process DOCX file. Please ensure it\'s a valid Word document.',
                        'details': str(processing_error) if current_app.debug else None
                    }), 500
                    
            finally:
                # Clean up temporary file
                try:
                    if os.path.exists(temp_file.name):
                        os.unlink(temp_file.name)
                except Exception as cleanup_error:
                    current_app.logger.warning(f'Failed to cleanup temp file: {cleanup_error}')
    
    except Exception as e:
        current_app.logger.error(f'Unexpected error in DOCX upload: {str(e)}')
        return jsonify({
            'success': False,
            'error': 'An unexpected error occurred. Please try again.',
            'details': str(e) if current_app.debug else None
        }), 500


@docx_bp.route('/api/upload/docx/validate', methods=['POST'])
def validate_docx():
    """
    Validate DOCX file without processing (for preview/estimation)
    
    Returns:
        JSON response with file validation and processing estimates
    """
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        if not file or file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': 'Please upload a .docx file'
            }), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_DOCX_SIZE:
            return jsonify({
                'success': False,
                'error': f'File too large. Maximum size is {MAX_DOCX_SIZE // (1024*1024)}MB'
            }), 400
        
        # Quick validation
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_file:
            try:
                file.save(temp_file.name)
                temp_file.flush()
                
                # Get processing information
                processing_info = docx_service.get_processing_info(temp_file.name)
                
                if not processing_info['valid']:
                    return jsonify({
                        'success': False,
                        'error': f'Invalid DOCX file: {processing_info.get("error", "Unknown error")}'
                    }), 400
                
                return jsonify({
                    'success': True,
                    'validation': processing_info,
                    'file_info': {
                        'filename': secure_filename(file.filename),
                        'size': file_size,
                        'size_human': f'{file_size / (1024*1024):.1f}MB' if file_size > 1024*1024 else f'{file_size / 1024:.1f}KB'
                    },
                    'processing_estimate': {
                        'time': processing_info.get('estimated_processing_time', 'Unknown'),
                        'complexity': processing_info.get('estimated_size', 'Unknown'),
                        'credits_required': 5
                    }
                }), 200
                
            finally:
                # Clean up
                try:
                    if os.path.exists(temp_file.name):
                        os.unlink(temp_file.name)
                except Exception:
                    pass
    
    except Exception as e:
        current_app.logger.error(f'DOCX validation error: {str(e)}')
        return jsonify({
            'success': False,
            'error': 'Failed to validate DOCX file',
            'details': str(e) if current_app.debug else None
        }), 500


# Error handlers for the blueprint
@docx_bp.errorhandler(413)
def too_large(e):
    return jsonify({
        'success': False,
        'error': f'File too large. Maximum size is {MAX_DOCX_SIZE // (1024*1024)}MB'
    }), 413


@docx_bp.errorhandler(400)
def bad_request(e):
    return jsonify({
        'success': False,
        'error': 'Bad request'
    }), 400 