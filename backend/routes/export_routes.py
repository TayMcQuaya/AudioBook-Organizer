from flask import Blueprint, request, jsonify, current_app, session
import os
from ..services.export_service import ExportService
from ..routes.password_protection import require_temp_auth
from ..middleware.auth_middleware import require_auth, require_credits, consume_credits

def create_export_routes(app, upload_folder, export_folder):
    """
    Create export routes for audiobook creation.
    """
    export_service = ExportService(upload_folder, export_folder)
    
    @app.route('/api/export', methods=['POST'])
    def export_audiobook():
        """
        Handle audiobook export with proper auth and credit management.
        Preserves the exact logic from original server.py export_audiobook() function
        """
        try:
            # Check mode and apply appropriate authentication
            if current_app.config.get('TESTING_MODE'):
                # Testing mode: check temp authentication
                if not session.get('temp_authenticated'):
                    return jsonify({
                        'error': 'Authentication required',
                        'message': 'Please authenticate with the temporary password first'
                    }), 401
            else:
                # Normal mode: use proper auth + credits
                from flask import g
                from ..middleware.auth_middleware import extract_token_from_header
                from ..services.supabase_service import get_supabase_service
                
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
            
            data = request.json
            
            # Handle credit checking and consumption based on export type
            # Determine credit cost based on export type
            export_audio = data.get('exportAudioFlag', False)
            merge_audio = data.get('mergeAudioFlag', False)
            export_metadata = data.get('exportMetadataFlag', False)
            export_book_content = data.get('exportBookContentFlag', False)
            
            # Credit costs based on complexity
            credit_cost = 0
            export_type = "basic export"
            
            if export_audio or merge_audio:
                credit_cost = current_app.config['CREDIT_COST_PREMIUM_EXPORT']  # Premium audio export (computational work)
                export_type = "premium audio export"
            else:
                credit_cost = 0   # Data exports are free (same as project save)
                export_type = "free data export"
            
            # Check credits for normal mode
            if not current_app.config.get('TESTING_MODE') and credit_cost > 0:
                from flask import g
                from ..services.supabase_service import get_supabase_service
                
                supabase_service = get_supabase_service()
                current_credits = supabase_service.get_user_credits(g.user_id)
                if current_credits < credit_cost:
                    return jsonify({
                        'error': 'Insufficient credits',
                        'message': f'This action requires {credit_cost} credits. You have {current_credits} credits.',
                        'current_credits': current_credits,
                        'required_credits': credit_cost
                    }), 402
            
            if current_app.config.get('TESTING_MODE'):
                app.logger.info(f"✅ Testing mode - Simulated consumption of {credit_cost} credits for {export_type}")
            else:
                app.logger.info(f"✅ Normal mode - Will consume {credit_cost} credits for {export_type}")
            
            # Use export service to handle export - preserves exact logic
            result = export_service.export_audiobook(data)
            
            # Consume credits after successful export (normal mode only)
            if not current_app.config.get('TESTING_MODE') and credit_cost > 0:
                from flask import g
                from ..services.supabase_service import get_supabase_service
                
                supabase_service = get_supabase_service()
                success = supabase_service.update_user_credits(g.user_id, -credit_cost)
                if success:
                    supabase_service.log_usage(
                        g.user_id, 
                        export_type.replace(' ', '_'), 
                        credit_cost,
                        {
                            'endpoint': request.endpoint, 
                            'method': request.method,
                            'export_audio': export_audio,
                            'merge_audio': merge_audio,
                            'export_metadata': export_metadata,
                            'export_book_content': export_book_content
                        }
                    )
                    app.logger.info(f"✅ Consumed {credit_cost} credits for {export_type} by user {g.user_id}")
                else:
                    app.logger.warning(f"⚠️ Failed to consume credits for user {g.user_id}")
            
            return jsonify(result)

        except Exception as e:
            app.logger.error(f'Export error: {str(e)}')
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500 

 