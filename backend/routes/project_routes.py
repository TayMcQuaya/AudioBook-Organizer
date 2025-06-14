"""
Project Routes - API endpoints for project persistence
Handles automatic saving and loading of user projects to/from database
"""

import logging
from flask import Blueprint, request, jsonify
from backend.middleware.auth_middleware import require_auth
from backend.services.supabase_service import get_supabase_service

logger = logging.getLogger(__name__)

# Create blueprint for project routes
project_bp = Blueprint('projects', __name__)

@project_bp.route('/save', methods=['POST'])
@require_auth
def save_project(current_user):
    """
    Save current project state to database
    
    Expected JSON payload:
    {
        "bookText": "...",
        "chapters": [...],
        "currentColorIndex": 1,
        "highlights": [...],
        "formattingData": {...},
        "projectMetadata": {...}
    }
    """
    try:
        project_data = request.get_json()
        
        if not project_data:
            return jsonify({'error': 'No project data provided'}), 400
        
        # Validate required fields
        if 'bookText' not in project_data:
            return jsonify({'error': 'Missing bookText in project data'}), 400
        
        # Get Supabase service
        supabase = get_supabase_service()
        if not supabase or not supabase.is_configured():
            return jsonify({'error': 'Database service not available'}), 503
        
        # Generate project title from bookText (first 50 characters or default)
        book_text = project_data.get('bookText', '')
        project_title = 'Auto-saved Project'
        if book_text and len(book_text.strip()) > 0:
            # Use first line or first 50 characters as title
            first_line = book_text.split('\n')[0].strip()
            if first_line:
                project_title = first_line[:50] + ('...' if len(first_line) > 50 else '')
        
        # Prepare data for database storage
        project_record = {
            'user_id': current_user['id'],
            'title': project_title,
            'description': f'Auto-saved project ({len(project_data.get("chapters", []))} chapters)',
            'status': 'draft',
            'settings': project_data,  # Store complete project data in settings field
            'chapters': project_data.get('chapters', [])  # Also store in dedicated field for queries
        }
        
        # Check if user already has a project
        existing_result = supabase.client.table('audiobook_projects')\
            .select('id')\
            .eq('user_id', current_user['id'])\
            .execute()
        
        if existing_result.data and len(existing_result.data) > 0:
            # Update existing project
            project_id = existing_result.data[0]['id']
            project_record['id'] = project_id
            result = supabase.client.table('audiobook_projects')\
                .update(project_record)\
                .eq('id', project_id)\
                .execute()
        else:
            # Insert new project
            result = supabase.client.table('audiobook_projects')\
                .insert(project_record)\
                .execute()
        
        if result.data:
            logger.info(f"✅ Project auto-saved for user {current_user['id']}")
            return jsonify({
                'success': True,
                'message': 'Project saved successfully',
                'project_id': result.data[0]['id'] if result.data else None
            })
        else:
            logger.error(f"❌ Failed to save project for user {current_user['id']}: No data returned")
            return jsonify({'error': 'Failed to save project'}), 500
            
    except Exception as e:
        logger.error(f"❌ Error saving project for user {current_user.get('id', 'unknown')}: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@project_bp.route('/latest', methods=['GET'])
@require_auth
def get_latest_project(current_user):
    """
    Get user's latest project from database
    
    Returns the complete project data structure that can be loaded
    using existing loadProjectDirectly() function
    """
    try:
        logger.info(f"🔍 Getting latest project for user: {current_user}")
        
        # Get Supabase service
        supabase = get_supabase_service()
        if not supabase or not supabase.is_configured():
            logger.error("❌ Supabase service not configured or not available")
            return jsonify({'error': 'Database service not available'}), 503
        
        # Query for user's latest project
        result = supabase.client.table('audiobook_projects')\
            .select('id, title, settings, updated_at')\
            .eq('user_id', current_user['id'])\
            .order('updated_at', desc=True)\
            .limit(1)\
            .execute()
        
        if result.data and len(result.data) > 0:
            project = result.data[0]
            project_data = project.get('settings', {})
            
            # Validate that we have meaningful project data
            if project_data and (
                project_data.get('bookText', '').strip() or 
                len(project_data.get('chapters', [])) > 0
            ):
                logger.info(f"✅ Latest project retrieved for user {current_user['id']}")
                return jsonify({
                    'success': True,
                    'project': project_data,
                    'metadata': {
                        'id': project['id'],
                        'title': project['title'],
                        'updated_at': project['updated_at']
                    }
                })
            else:
                # Project exists but has no meaningful content
                logger.info(f"📭 Empty project found for user {current_user['id']}")
                return jsonify({'success': False, 'message': 'No meaningful project data found'}), 404
        else:
            # No projects found for user
            logger.info(f"📭 No projects found for user {current_user['id']}")
            return jsonify({'success': False, 'message': 'No projects found'}), 404
            
    except Exception as e:
        logger.error(f"❌ Error retrieving latest project for user {current_user.get('id', 'unknown')}: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@project_bp.route('/status', methods=['GET'])
@require_auth
def get_project_status(current_user):
    """
    Get basic project status information for debugging
    """
    try:
        logger.info(f"🔍 Getting project status for user: {current_user}")
        
        supabase = get_supabase_service()
        if not supabase or not supabase.is_configured():
            logger.error("❌ Supabase service not configured for status check")
            return jsonify({'error': 'Database service not available'}), 503
        
        logger.info(f"✅ Supabase service is configured, checking projects for user: {current_user['id']}")
        
        # Get count of user's projects
        result = supabase.client.table('audiobook_projects')\
            .select('id, title, updated_at', count='exact')\
            .eq('user_id', current_user['id'])\
            .execute()
        
        logger.info(f"📊 Project query result: {result.data}")
        
        return jsonify({
            'success': True,
            'user_id': current_user['id'],
            'user_email': current_user.get('email', 'unknown'),
            'project_count': len(result.data) if result.data else 0,
            'projects': result.data if result.data else [],
            'supabase_configured': True
        })
        
    except Exception as e:
        logger.error(f"❌ Error getting project status for user {current_user.get('id', 'unknown')}: {e}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@project_bp.route('/debug', methods=['GET'])
def debug_service():
    """
    Debug endpoint to check service configuration (no auth required)
    """
    try:
        import os
        from dotenv import load_dotenv
        
        # Reload environment variables to make sure we have the latest
        load_dotenv()
        
        supabase = get_supabase_service()
        
        debug_info = {
            'timestamp': 'No timestamp available',
            'supabase_configured': supabase.is_configured() if supabase else False,
            'supabase_url': os.getenv('SUPABASE_URL', 'Not set'),
            'supabase_anon_key_present': bool(os.getenv('SUPABASE_ANON_KEY')),
            'jwt_secret_present': bool(os.getenv('JWT_SECRET_KEY')),
            'jwt_secret_length': len(os.getenv('JWT_SECRET_KEY', '')),
            'has_auth_header': bool(request.headers.get('Authorization')),
        }
        
        return jsonify(debug_info)
        
    except Exception as e:
        logger.error(f"Debug endpoint error: {e}")
        return jsonify({
            'error': 'Debug endpoint failed',
            'message': str(e)
        }), 500 