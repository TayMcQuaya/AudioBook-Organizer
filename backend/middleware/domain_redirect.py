"""
Domain Redirect Middleware for AudioBook Organizer
Handles redirect from audiobookorganizer.com to www.audiobookorganizer.com
"""

from flask import request, redirect, url_for
from functools import wraps
import os


class DomainRedirectMiddleware:
    """Middleware to handle domain redirects from non-www to www version"""
    
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the middleware with Flask app"""
        app.before_request(self.redirect_to_www)
    
    def redirect_to_www(self):
        """Check if request is to non-www domain and redirect to www version"""
        # Only apply redirect in production
        if os.getenv('FLASK_ENV', 'development') == 'development':
            return None
        
        host = request.headers.get('Host', '').lower()
        
        # Check if request is to non-www audiobookorganizer.com
        if host == 'audiobookorganizer.com':
            # Construct the new URL with www
            new_url = request.url.replace('audiobookorganizer.com', 'www.audiobookorganizer.com', 1)
            return redirect(new_url, code=301)  # Permanent redirect
        
        return None


def init_domain_redirect(app):
    """Initialize domain redirect middleware"""
    DomainRedirectMiddleware(app)
    return app