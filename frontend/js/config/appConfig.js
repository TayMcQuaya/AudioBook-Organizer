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
    
    // Initialization timing
    initializationDelay: 800,
    cssApplicationDelay: 200,
    domReadyDelay: 300,
    
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
    
    // Layout and CSS
    layoutStabilizationDelay: 400,
    cssLoadWaitTime: 500,
    
    // Debug settings
    enableDetailedLogging: false,
    logModuleLoadTimes: false
};

/**
 * Environment-specific configuration overrides
 */
const environmentConfigs = {
    'flask-dev': {
        // **OPTIMIZED: Reduced delays for better performance**
        moduleLoadTimeout: 12000,
        initializationDelay: 300,  // Reduced from 1200ms
        cssApplicationDelay: 100,  // Reduced from 400ms  
        domReadyDelay: 100,        // Reduced from 500ms
        layoutStabilizationDelay: 200, // Reduced from 600ms
        cssLoadWaitTime: 300,      // Reduced from 800ms
        enableDetailedLogging: true,
        logModuleLoadTimes: true
    },
    
    'gunicorn-prod': {
        // Gunicorn is faster but more consistent
        moduleLoadTimeout: 6000,
        initializationDelay: 300,  // Reduced from 600ms
        cssApplicationDelay: 50,   // Reduced from 150ms
        domReadyDelay: 100,        // Reduced from 200ms
        layoutStabilizationDelay: 150, // Reduced from 300ms
        cssLoadWaitTime: 200,      // Reduced from 400ms
        enableDetailedLogging: false,
        logModuleLoadTimes: false
    }
};

/**
 * Testing mode specific overrides
 */
const testingModeConfig = {
    // More conservative timing for testing mode
    initializationDelay: 400,     // Reduced from 1000ms
    testingModeDelay: 200,        // Reduced from 300ms
    cssApplicationDelay: 150,     // Reduced from 300ms
    layoutStabilizationDelay: 250 // Reduced from 500ms
};

/**
 * Fast refresh mode for page refresh scenarios
 */
const fastRefreshConfig = {
    // Minimal delays when app is already loaded
    initializationDelay: 50,
    cssApplicationDelay: 25,
    domReadyDelay: 25,
    layoutStabilizationDelay: 50,
    cssLoadWaitTime: 100
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

export default appConfig; 