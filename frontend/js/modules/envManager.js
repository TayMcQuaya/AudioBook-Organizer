// AudioBook Organizer - Environment Manager
// Centralizes environment detection and configuration for consistent behavior

import { apiFetch } from './api.js';

class EnvironmentManager {
    constructor() {
        this.config = null;
        this.isInitialized = false;
        this.initPromise = null;
    }

    /**
     * Initialize environment manager - this should be called first in app initialization
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._loadConfiguration();
        return this.initPromise;
    }

    /**
     * Load configuration from backend with retry logic
     */
    async _loadConfiguration() {
        const maxRetries = 2; // Reduced from 3 for faster fallback
        const retryDelay = 500; // Reduced from 1000ms

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔧 Loading environment configuration (attempt ${attempt}/${maxRetries})...`);
                
                const response = await apiFetch('/debug/config', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    // If it's a 404, the route doesn't exist - fail fast
                    if (response.status === 404) {
                        console.warn('⚠️ /debug/config route not available, using fallback immediately');
                        break;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                this.config = {
                    testing_mode: data.testing_mode || false,
                    environment: data.environment || 'production',
                    temporary_password_configured: data.temporary_password_configured || false,
                    server_type: this._detectServerType(),
                    timestamp: Date.now()
                };

                // **SECURITY FIX: Removed config object to prevent server details exposure**
                console.log('✅ Environment configuration loaded successfully');
                this.isInitialized = true;
                return this.config;

            } catch (error) {
                console.warn(`⚠️ Environment config load attempt ${attempt} failed:`, error.message || error);
                
                if (attempt === maxRetries) {
                    console.warn('❌ Failed to load environment config, using fallback');
                    this.config = this._getFallbackConfig();
                    this.isInitialized = true;
                    return this.config;
                }

                // Wait before retry (but shorter delay)
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        
        // If we reach here, use fallback
        console.warn('🔄 Using fallback configuration due to repeated failures');
        this.config = this._getFallbackConfig();
        this.isInitialized = true;
        return this.config;
    }

    /**
     * Detect server type based on response headers and timing
     */
    _detectServerType() {
        // Simple heuristic - can be enhanced
        const userAgent = navigator.userAgent;
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
        
        return isDevelopment ? 'flask-dev' : 'gunicorn-prod';
    }

    /**
     * Fallback configuration when backend is unreachable
     */
    _getFallbackConfig() {
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
        
        console.warn('🔄 Using fallback environment configuration');
        
        // **SECURITY FIX: Removed debug information that exposes server infrastructure**
        const currentHostname = window.location.hostname;
        
        const isProduction = currentHostname.includes('ondigitalocean.app');
        const isVercel = currentHostname.includes('vercel.app');
        const shouldUseTesting = isProduction || isVercel || isDevelopment;
        
        return {
            testing_mode: shouldUseTesting, // Allow testing mode for localhost too
            environment: isDevelopment ? 'development' : 'production',
            temporary_password_configured: true, // Assume password is configured
            server_type: isDevelopment ? 'flask-dev' : 'gunicorn-prod',
            timestamp: Date.now(),
            fallback: true,
            debug_override: shouldUseTesting ? 'FORCED_TESTING_MODE' : 'NORMAL_FALLBACK',
            detected_hostname: currentHostname
        };
    }

    /**
     * Get current environment configuration
     */
    getConfig() {
        if (!this.isInitialized) {
            console.warn('⚠️ Environment manager not initialized, returning fallback');
            return this._getFallbackConfig();
        }
        return this.config;
    }

    /**
     * Check if testing mode is enabled
     */
    isTestingMode() {
        return this.getConfig().testing_mode === true;
    }

    /**
     * Check if in development environment
     */
    isDevelopment() {
        return this.getConfig().environment === 'development';
    }

    /**
     * Check if in production environment
     */
    isProduction() {
        return this.getConfig().environment === 'production';
    }

    /**
     * Get server type
     */
    getServerType() {
        return this.getConfig().server_type;
    }

    /**
     * Apply environment-specific settings
     */
    applyEnvironmentSettings() {
        const config = this.getConfig();
        
        // Apply server-specific optimizations
        if (config.server_type === 'flask-dev') {
            // Flask development server optimizations
            this._applyDevelopmentOptimizations();
        } else {
            // Gunicorn production optimizations
            this._applyProductionOptimizations();
        }

        // Apply testing mode settings
        if (config.testing_mode) {
            this._applyTestingModeSettings();
        }

        // **SECURITY FIX: Removed server infrastructure logging to prevent exposure**
        console.log('🎯 Environment settings applied successfully');
    }

    /**
     * Development-specific optimizations
     */
    _applyDevelopmentOptimizations() {
        // Longer timeouts for development
        if (window.appConfig) {
            window.appConfig.moduleLoadTimeout = 10000;
            window.appConfig.initializationDelay = 1000;
        }
    }

    /**
     * Production-specific optimizations
     */
    _applyProductionOptimizations() {
        // Shorter timeouts for production
        if (window.appConfig) {
            window.appConfig.moduleLoadTimeout = 5000;
            window.appConfig.initializationDelay = 500;
        }
    }

    /**
     * Testing mode specific settings
     */
    _applyTestingModeSettings() {
        // Apply body class immediately
        document.body.classList.add('testing-mode');
        
        // Set global testing mode flag
        window.TESTING_MODE = true;
        
        console.log('🧪 Testing mode settings applied');
    }

    /**
     * Wait for environment to be ready
     */
    async waitForReady(timeout = 10000) {
        const startTime = Date.now();
        
        while (!this.isInitialized && (Date.now() - startTime) < timeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!this.isInitialized) {
            throw new Error('Environment manager initialization timeout');
        }
        
        return this.config;
    }
}

// Create singleton instance
const envManager = new EnvironmentManager();

export default envManager; 