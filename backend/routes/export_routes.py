from flask import Blueprint, request, jsonify
from ..services.export_service import ExportService

def create_export_routes(app, upload_folder, export_folder):
    """
    Create export routes.
    Preserves the exact logic from original server.py
    """
    export_service = ExportService(upload_folder, export_folder)
    
    @app.route('/api/export', methods=['POST', 'OPTIONS'])
    def export_audiobook():
        """
        Handle audiobook export.
        Preserves the exact logic from original server.py export_audiobook() function
        """
        try:
            data = request.json
            
            # Use export service to handle export - preserves exact logic
            result = export_service.export_audiobook(data)
            
            return jsonify(result)

        except Exception as e:
            app.logger.error(f'Export error: {str(e)}')
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500 