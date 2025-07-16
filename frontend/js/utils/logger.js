/**
 * Secure Logging Utility
 * Sanitizes sensitive information from logs in production
 */

class SecureLogger {
    constructor() {
        this.isProduction = false; // Default to development for safety
        this.isInitialized = false;
        this.sensitivePatterns = [
            // Supabase URLs
            { pattern: /https:\/\/[a-zA-Z0-9]+\.supabase\.co/g, replacement: '[SUPABASE_URL]' },
            // API Keys
            { pattern: /eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g, replacement: '[JWT_TOKEN]' },
            // Email addresses
            { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
            // Access tokens in URLs
            { pattern: /access_token=[^&\s#]+/g, replacement: 'access_token=[REDACTED]' },
            // Refresh tokens in URLs
            { pattern: /refresh_token=[^&\s#]+/g, replacement: 'refresh_token=[REDACTED]' },
            // File paths (Windows)
            { pattern: /C:\\Users\\[^\\]+\\/g, replacement: 'C:\\Users\\[USER]\\' },
            // File paths (Unix)
            { pattern: /\/home\/[^\/]+\//g, replacement: '/home/[USER]/' },
            // IP addresses (but keep localhost)
            { pattern: /\b(?!127\.0\.0\.1|localhost)\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[IP]' },
            // Port numbers (except common ones)
            { pattern: /:\d{4,5}(?![0-9])/g, replacement: ':[PORT]' },
            // reCAPTCHA keys
            { pattern: /6L[a-zA-Z0-9]{38}/g, replacement: '[RECAPTCHA_KEY]' }
        ];
        
        // Initialize async
        this.initializeAsync();
    }

    /**
     * Initialize the logger asynchronously
     */
    async initializeAsync() {
        try {
            this.isProduction = await this.detectProductionEnvironment();
            this.isInitialized = true;
        } catch (error) {
            console.warn('🔍 Failed to detect environment, defaulting to development');
            this.isProduction = false;
            this.isInitialized = true;
        }
    }

    /**
     * Detect if we're in a production environment using FLASK_ENV as primary method
     */
    async detectProductionEnvironment() {
        try {
            // PRIMARY METHOD: Check FLASK_ENV from backend
            const response = await fetch('/debug/config');
            if (response.ok) {
                const config = response.json ? await response.json() : {};
                const flaskEnv = config.flask_env || config.environment;
                
                if (flaskEnv === 'production') {
                    return true;
                } else if (flaskEnv === 'development') {
                    return false;
                }
            }
        } catch (error) {
            // If backend is unreachable, fall back to frontend detection
            console.warn('🔍 Backend config unavailable, using frontend detection');
        }

        // FALLBACK METHODS: When backend is unreachable
        const hostname = window.location.hostname;
        
        // Clear development indicators
        const isDevelopment = (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.includes('localhost') ||
            window.location.port === '3000' ||
            window.location.port === '8000' ||
            window.location.port === '5000'
        );

        // Development flags
        const hasDevFlags = (
            window.location.search.includes('debug=true') ||
            window.location.search.includes('dev=true') ||
            localStorage.getItem('development_mode') === 'true'
        );

        // Production domain check
        const productionDomains = [
            'audiobookorganizer.com',
            'www.audiobookorganizer.com'
        ];
        const isProductionDomain = productionDomains.some(domain => hostname.includes(domain));

        // Use HTTPS as indicator for production (with exceptions)
        const isHTTPS = window.location.protocol === 'https:';

        // Decision logic (simplified):
        // 1. If it's a known production domain -> PRODUCTION
        // 2. If development indicators are present -> DEVELOPMENT  
        // 3. If HTTPS and no dev flags -> PRODUCTION
        // 4. Default to DEVELOPMENT for safety
        const finalDecision = (
            isProductionDomain ||
            (isHTTPS && !isDevelopment && !hasDevFlags)
        );

        // Log the decision for debugging (only in development)
        if (!finalDecision) {
            console.log('🔍 Environment Detection (Fallback):', {
                hostname,
                isDevelopment,
                isHTTPS,
                isProductionDomain,
                hasDevFlags,
                decision: finalDecision ? 'PRODUCTION' : 'DEVELOPMENT'
            });
        }

        return finalDecision;
    }

    /**
     * Sanitize a string by removing sensitive information
     */
    sanitize(input) {
        if (!this.isProduction || typeof input !== 'string') {
            return input;
        }

        let sanitized = input;
        for (const { pattern, replacement } of this.sensitivePatterns) {
            sanitized = sanitized.replace(pattern, replacement);
        }
        return sanitized;
    }

    /**
     * Safe console.log that sanitizes in production
     */
    log(...args) {
        // If not initialized yet, default to development behavior
        if (!this.isInitialized || !this.isProduction) {
            console.log(...args);
            return;
        }
        
        const sanitizedArgs = args.map(arg => {
            if (typeof arg === 'string') {
                return this.sanitize(arg);
            } else if (typeof arg === 'object' && arg !== null) {
                // Deep sanitize objects
                return this.sanitizeObject(arg);
            }
            return arg;
        });
        console.log(...sanitizedArgs);
    }

    /**
     * Safe console.error that sanitizes in production
     */
    error(...args) {
        // If not initialized yet, default to development behavior
        if (!this.isInitialized || !this.isProduction) {
            console.error(...args);
            return;
        }
        
        const sanitizedArgs = args.map(arg => {
            if (typeof arg === 'string') {
                return this.sanitize(arg);
            } else if (typeof arg === 'object' && arg !== null) {
                return this.sanitizeObject(arg);
            }
            return arg;
        });
        console.error(...sanitizedArgs);
    }

    /**
     * Safe console.warn that sanitizes in production
     */
    warn(...args) {
        // If not initialized yet, default to development behavior
        if (!this.isInitialized || !this.isProduction) {
            console.warn(...args);
            return;
        }
        
        const sanitizedArgs = args.map(arg => {
            if (typeof arg === 'string') {
                return this.sanitize(arg);
            } else if (typeof arg === 'object' && arg !== null) {
                return this.sanitizeObject(arg);
            }
            return arg;
        });
        console.warn(...sanitizedArgs);
    }

    /**
     * Recursively sanitize object properties
     */
    sanitizeObject(obj) {
        if (Array.isArray(obj)) {
            return obj.map(item => {
                if (typeof item === 'string') {
                    return this.sanitize(item);
                } else if (typeof item === 'object' && item !== null) {
                    return this.sanitizeObject(item);
                }
                return item;
            });
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            // Sanitize the key itself
            const sanitizedKey = this.sanitize(key);
            
            // Sanitize the value
            if (typeof value === 'string') {
                sanitized[sanitizedKey] = this.sanitize(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[sanitizedKey] = this.sanitizeObject(value);
            } else {
                sanitized[sanitizedKey] = value;
            }
        }
        return sanitized;
    }

    /**
     * Check if we're in production
     */
    isProductionEnv() {
        return this.isProduction;
    }

    /**
     * Manually set the environment (useful for testing or explicit control)
     */
    setEnvironment(isProduction) {
        this.isProduction = isProduction;
        console.log(`🔧 Environment manually set to: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    }

    /**
     * Force re-detection of environment
     */
    redetectEnvironment() {
        this.isProduction = this.detectProductionEnvironment();
        return this.isProduction;
    }
}

// Create singleton instance
const logger = new SecureLogger();

// Export for use in other modules
export default logger;

// Export additional utilities
export const setLoggerEnvironment = (isProduction) => logger.setEnvironment(isProduction);
export const redetectEnvironment = () => logger.redetectEnvironment();
export const isProductionEnvironment = () => logger.isProductionEnv();

// Also export a function to override console methods globally
export function enableSecureLogging() {
    // Store original console methods
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn
    };

    // Override console methods immediately (they handle production detection internally)
    console.log = (...args) => logger.log(...args);
    console.error = (...args) => logger.error(...args);
    console.warn = (...args) => logger.warn(...args);

    // Provide a way to restore original console if needed
    console.restoreOriginal = () => {
        console.log = originalConsole.log;
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;
    };

    // Wait for initialization to show confirmation message
    setTimeout(() => {
        if (logger.isProductionEnv()) {
            console.log('🔒 Secure logging enabled for production environment');
        } else {
            console.log('🔧 Secure logging initialized (development mode - no sanitization)');
        }
    }, 100);
}