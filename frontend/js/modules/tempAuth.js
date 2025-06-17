// Temporary Authentication Module
// Handles authentication state in testing mode

import { apiFetch } from './api.js';

class TempAuthManager {
    constructor() {
        this.isTestingMode = false;
        this.isAuthenticated = false;
        this.checkInterval = null;
    }
    
    async init() {
        console.log('🔐 Initializing temporary authentication manager...');
        
        try {
            // Check server status to determine if we're in testing mode
            const response = await apiFetch('/api/auth/temp-status', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.isTestingMode = data.testing_mode;
                this.isAuthenticated = data.authenticated;
                
                console.log(`Testing mode: ${this.isTestingMode}, Authenticated: ${this.isAuthenticated}`);
                
                // If in testing mode and not authenticated, the router will handle showing the correct page.
                // The hard redirect is removed to prevent the refresh loop.
                // if (this.isTestingMode && !this.isAuthenticated) {
                //     window.location.href = '/';
                //     return false;
                // }
                
                // Start periodic authentication check if in testing mode
                if (this.isTestingMode) {
                    this.startAuthCheck();
                }
                
                return true;
            }
        } catch (error) {
            console.error('Error checking temp auth status:', error);
        }
        
        return true; // Allow normal operation if check fails
    }
    
    startAuthCheck() {
        // Check authentication status every 30 seconds
        this.checkInterval = setInterval(async () => {
            try {
                const response = await apiFetch('/api/auth/temp-status', {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // If no longer authenticated, redirect to password page
                    if (data.testing_mode && !data.authenticated) {
                        this.cleanup();
                        window.location.href = '/';
                    }
                }
            } catch (error) {
                console.error('Error checking auth status:', error);
            }
        }, 30000);
    }
    
    cleanup() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
    
    async logout() {
        if (!this.isTestingMode) return;
        
        try {
            await apiFetch('/api/auth/temp-logout', {
                method: 'POST',
                credentials: 'same-origin'
            });
            
            this.cleanup();
            window.location.href = '/';
        } catch (error) {
            console.error('Error logging out:', error);
        }
    }
    
    // Method to update authentication status
    setAuthenticated(isAuth) {
        this.isAuthenticated = isAuth;
        console.log(`🔧 TempAuth status updated to: ${isAuth}`);
        
        // Trigger any listeners that might be waiting for auth state changes
        if (isAuth) {
            window.dispatchEvent(new CustomEvent('temp-auth-success'));
        }
    }
    
    // Check if we should bypass normal authentication
    shouldBypassAuth() {
        return this.isTestingMode && this.isAuthenticated;
    }
    
    // Check if landing page should be accessible
    shouldBlockLandingPage() {
        // Landing page is now always accessible - we redirect to temp-auth instead
        return false;
    }
    
    // Check if auth pages should be accessible
    shouldBlockAuthPages() {
        return this.isTestingMode;
    }
}

// Create singleton instance
const tempAuthManager = new TempAuthManager();

export default tempAuthManager; 