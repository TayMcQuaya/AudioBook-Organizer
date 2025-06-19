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
        // Flask development server is slower
        moduleLoadTimeout: 12000,
        initializationDelay: 1200,
        cssApplicationDelay: 400,
        domReadyDelay: 500,
        layoutStabilizationDelay: 600,
        cssLoadWaitTime: 800,
        enableDetailedLogging: true,
        logModuleLoadTimes: true
    },
    
    'gunicorn-prod': {
        // Gunicorn is faster but more consistent
        moduleLoadTimeout: 6000,
        initializationDelay: 600,
        cssApplicationDelay: 150,
        domReadyDelay: 200,
        layoutStabilizationDelay: 300,
        cssLoadWaitTime: 400,
        enableDetailedLogging: false,
        logModuleLoadTimes: false
    }
};

/**
 * Testing mode specific overrides
 */
const testingModeConfig = {
    // More conservative timing for testing mode
    initializationDelay: 1000,
    testingModeDelay: 300,
    cssApplicationDelay: 300,
    layoutStabilizationDelay: 500
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
            console.log('📋 App configuration loaded:', this.config);
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
}

// Create singleton instance
const appConfig = new AppConfig();

// Make it globally available
window.appConfig = appConfig;

export default appConfig; 