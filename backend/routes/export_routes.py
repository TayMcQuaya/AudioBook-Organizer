from flask import Blueprint, request, jsonify, current_app
import os
from ..services.export_service import ExportService
from ..routes.password_protection import require_temp_auth
from ..middleware.auth_middleware import require_credits, consume_credits

def create_export_routes(app, upload_folder, export_folder):
    """
    Create export routes for audiobook creation.
    """
    export_service = ExportService(upload_folder, export_folder)
    
    @app.route('/api/export', methods=['POST'])
    @require_temp_auth
    def export_audiobook():
        """
        Handle audiobook export.
        Preserves the exact logic from original server.py export_audiobook() function
        """
        try:
            data = request.json
            
            # Handle credit checking and consumption for testing mode
            # Determine credit cost based on export type
            export_audio = data.get('exportAudioFlag', False)
            merge_audio = data.get('mergeAudioFlag', False)
            export_metadata = data.get('exportMetadataFlag', False)
            export_book_content = data.get('exportBookContentFlag', False)
            
            # Credit costs based on complexity
            credit_cost = 0
            export_type = "basic export"
            
            if export_audio or merge_audio:
                credit_cost = 15  # Premium audio export (computational work)
                export_type = "premium audio export"
            else:
                credit_cost = 0   # Data exports are free (same as project save)
                export_type = "free data export"
            
            if current_app.config.get('TESTING_MODE'):
                app.logger.info(f"✅ Testing mode - Simulated consumption of {credit_cost} credits for {export_type}")
            else:
                # In production mode, we would need proper credit verification here
                app.logger.info(f"Production mode - Would consume {credit_cost} credits for {export_type}")
            
            # Use export service to handle export - preserves exact logic
            result = export_service.export_audiobook(data)
            
            return jsonify(result)

        except Exception as e:
            app.logger.error(f'Export error: {str(e)}')
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500 

 