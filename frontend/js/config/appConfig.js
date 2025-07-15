// AudioBook Organizer - Application Configuration
// Centralized configuration for consistent behavior across environments

/**
 * Default application configuration
 */
const defaultConfig = {
    // Module loading settings
    moduleLoadTimeout: 8000,
    moduleRetryAttempts: 3,
    moduleRetryDelay: 1000,
    
    // Initialization timing - OPTIMIZED for better UX
    initializationDelay: 200,        // Reduced from 800ms
    cssApplicationDelay: 50,         // Reduced from 200ms
    domReadyDelay: 100,              // Reduced from 300ms
    
    // UI timing
    notificationDuration: 3000,
    animationDuration: 300,
    transitionDelay: 150,
    
    // Authentication
    authTimeout: 10000,
    sessionCheckInterval: 30000,
    
    // Testing mode
    testingModeDelay: 500,
    testingModeRetries: 5,
    
    // Layout and CSS - OPTIMIZED for immediate application
    layoutStabilizationDelay: 100,   // Reduced from 400ms
    cssLoadWaitTime: 50,             // Reduced from 500ms - CSS should apply immediately
    
    // Debug settings
    enableDetailedLogging: false,
    logModuleLoadTimes: false
};

/**
 * Environment-specific configuration overrides
 */
const environmentConfigs = {
    'flask-dev': {
        // **OPTIMIZED: Further reduced delays for development**
        moduleLoadTimeout: 12000,
        initializationDelay: 100,      // Reduced from 300ms
        cssApplicationDelay: 25,       // Reduced from 100ms  
        domReadyDelay: 50,             // Reduced from 100ms
        layoutStabilizationDelay: 50,  // Reduced from 200ms
        cssLoadWaitTime: 25,           // Reduced from 300ms
        enableDetailedLogging: true,
        logModuleLoadTimes: true
    },
    
    'gunicorn-prod': {
        // **OPTIMIZED: Production optimizations for immediate CSS**
        moduleLoadTimeout: 6000,
        initializationDelay: 150,      // Reduced from 300ms
        cssApplicationDelay: 25,       // Reduced from 50ms
        domReadyDelay: 50,             // Reduced from 100ms
        layoutStabilizationDelay: 50,  // Reduced from 150ms
        cssLoadWaitTime: 25,           // Reduced from 200ms - immediate CSS
        enableDetailedLogging: false,
        logModuleLoadTimes: false
    }
};

/**
 * Testing mode specific overrides
 */
const testingModeConfig = {
    // **OPTIMIZED: Reduced timing for testing mode**
    initializationDelay: 100,         // Reduced from 400ms
    testingModeDelay: 100,            // Reduced from 200ms
    cssApplicationDelay: 25,          // Reduced from 150ms
    layoutStabilizationDelay: 50      // Reduced from 250ms
};

/**
 * Fast refresh mode for page refresh scenarios
 */
const fastRefreshConfig = {
    // **OPTIMIZED: Minimal delays for immediate response**
    initializationDelay: 25,          // Reduced from 50ms
    cssApplicationDelay: 10,          // Reduced from 25ms
    domReadyDelay: 10,                // Reduced from 25ms
    layoutStabilizationDelay: 25,     // Reduced from 50ms
    cssLoadWaitTime: 10               // Reduced from 100ms
};

/**
 * App Configuration Manager
 */
class AppConfig {
    constructor() {
        this.config = { ...defaultConfig };
        this.isInitialized = false;
    }

    /**
     * Initialize configuration based on environment
     */
    init(serverType = 'flask-dev', isTestingMode = false) {
        console.log(`🔧 Initializing app config for ${serverType} (testing: ${isTestingMode})`);
        
        // Start with default config
        this.config = { ...defaultConfig };
        
        // Apply environment-specific overrides
        if (environmentConfigs[serverType]) {
            this.config = { 
                ...this.config, 
                ...environmentConfigs[serverType] 
            };
        }
        
        // Apply testing mode overrides
        if (isTestingMode) {
            this.config = { 
                ...this.config, 
                ...testingModeConfig 
            };
        }
        
        this.isInitialized = true;
        
        if (this.config.enableDetailedLogging) {
            // **SECURITY FIX: Removed config object to prevent configuration details exposure**
            console.log('📋 App configuration loaded successfully');
        }
        
        return this.config;
    }

    /**
     * Get configuration value
     */
    get(key) {
        if (!this.isInitialized) {
            console.warn('⚠️ AppConfig not initialized, using default value');
            return defaultConfig[key];
        }
        return this.config[key];
    }

    /**
     * Set configuration value
     */
    set(key, value) {
        this.config[key] = value;
    }

    /**
     * Get all configuration
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * Create a delay promise based on config
     */
    delay(configKey, customMs = null) {
        const ms = customMs || this.get(configKey) || 0;
        if (this.config.enableDetailedLogging && ms > 0) {
            console.log(`⏱️ Applying ${configKey} delay: ${ms}ms`);
        }
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Log timing information
     */
    logTiming(operation, startTime) {
        if (this.config.logModuleLoadTimes) {
            const duration = Date.now() - startTime;
            console.log(`⏱️ ${operation} completed in ${duration}ms`);
        }
    }

    /**
     * Check if detailed logging is enabled
     */
    shouldLog() {
        return this.config.enableDetailedLogging;
    }

    /**
     * Enable fast refresh mode for page refresh scenarios
     */
    enableFastRefresh() {
        console.log('🚀 Enabling fast refresh mode for optimal performance');
        this.config = { 
            ...this.config, 
            ...fastRefreshConfig 
        };
        return this.config;
    }

    /**
     * Check if we should use fast refresh based on conditions
     */
    shouldUseFastRefresh() {
        // Use fast refresh if:
        // 1. CSS is already loaded
        // 2. App container exists 
        // 3. Body has app-body class (indicating page refresh scenario)
        const hasAppBody = document.body.classList.contains('app-body');
        const hasMainContainer = document.querySelector('.main-container');
        const cssLoaded = document.querySelector('link[href*="main.css"]');
        
        return hasAppBody && hasMainContainer && cssLoaded;
    }
}

// Create singleton instance
const appConfig = new AppConfig();

// Make it globally available
window.appConfig = appConfig;

// Add version for cache busting
export const APP_VERSION = Date.now(); // Use timestamp for development
// export const APP_VERSION = '1.0.0'; // Use semantic versioning for production

// Cache busting helper
export function addCacheBuster(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${APP_VERSION}`;
}

export default appConfig; 