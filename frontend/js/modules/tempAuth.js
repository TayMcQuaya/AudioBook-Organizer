import { apiFetch } from './api.js';

class TempAuthManager {
    constructor() {
        if (TempAuthManager.instance) {
            return TempAuthManager.instance;
        }

        this._isAuthenticated = false;
        this._isTestingMode = false;
        this._isInitialized = false;
        this.checkInterval = null;
        this._skipNextCheck = false; // Flag to skip session check temporarily
        this.lastActivityTime = Date.now(); // Track last user activity

        TempAuthManager.instance = this;
    }

    /**
     * Initializes the temporary authentication manager. Checks the initial status from the server.
     * This function is now idempotent and will only run its main logic once.
     * @param {Object} envConfig - Environment configuration from environment manager
     */
    async init(envConfig = null) {
        if (this._isInitialized) {
            return true;
        }
        
        try {
            // Use environment config to determine testing mode if provided
            if (envConfig && envConfig.hasOwnProperty('testing_mode')) {
                console.log('🔧 TempAuth: Using environment config for testing mode:', envConfig.testing_mode);
                this._isTestingMode = envConfig.testing_mode;
                
                if (this._isTestingMode) {
                    // Only check server status if we're actually in testing mode
                    const response = await apiFetch('/auth/temp-status');
                    if (response.ok) {
                        const data = await response.json();
                        this._isAuthenticated = data.authenticated;
                    } else {
                        this._isAuthenticated = false;
                    }
                    
                    this.startAuthCheck();
                    this.setupActivityTracking();
                } else {
                    // In production mode, temp auth is not used
                    this._isAuthenticated = false;
                }
                
                this._isInitialized = true;
                return true;
            }
            
            // Fallback: Check server for testing mode (old behavior)
            console.log('🔧 TempAuth: No env config provided, checking server for testing mode');
            const response = await apiFetch('/auth/temp-status');

            if (response.ok) {
                const data = await response.json();
                this._isTestingMode = data.testing_mode;
                this._isAuthenticated = data.authenticated;
                this._isInitialized = true;

                if (this._isTestingMode) {
                    this.startAuthCheck();
                    this.setupActivityTracking();
                }
                return true;
            }
            
            // Server error fallback
            return false;
        } catch (error) {
            console.warn('🔧 TempAuth: Server unavailable, using fallback detection');
            
            // For local development, assume testing mode if backend not available
            const hostname = window.location.hostname;
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                this._isTestingMode = true;
                this._isAuthenticated = false;
                this._isInitialized = true;
                return true;
            }
            
            this._isTestingMode = false;
            this._isAuthenticated = false;
            this._isInitialized = true;
            return false;
        }
    }

    /**
     * Periodically checks the session status with the server.
     */
    startAuthCheck() {
        if (this.checkInterval) clearInterval(this.checkInterval);

        this.checkInterval = setInterval(async () => {
            if (this._skipNextCheck) {
                this._skipNextCheck = false;
                return;
            }
            
            try {
                // Check if user has been active in the last 10 minutes
                const timeSinceActivity = Date.now() - this.lastActivityTime;
                const isRecentlyActive = timeSinceActivity < 600000; // 10 minutes

                // If user has been active, refresh the session first
                if (this._isAuthenticated && isRecentlyActive) {
                    try {
                        await apiFetch('/auth/temp-refresh', {
                            method: 'POST'
                        });
                    } catch (refreshError) {
                        // Silent error handling
                    }
                }

                const response = await apiFetch('/auth/temp-status');
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (this._isAuthenticated && !data.authenticated) {
                        this.setAuthenticated(false);
                        
                        if (window.location.pathname !== '/temp-auth') {
                            this._safeNavigate('/temp-auth');
                        }
                    } else {
                        this._isAuthenticated = data.authenticated;
                    }
                }
            } catch (error) {
                // Silent error handling
            }
        }, 300000); // Check every 5 minutes
    }
     
    /**
     * Stops the periodic check.
     */
    cleanup() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
     
    /**
     * Logs the user out of the temporary session.
     */
    async logout() {
        if (!this._isTestingMode) return;
         
        try {
            await apiFetch('/auth/temp-logout', { method: 'POST' });
        } catch (error) {
            // Silent error handling
        } finally {
            this.setAuthenticated(false);
            // Clean up all authentication data
            localStorage.removeItem('temp_auth_backup');
            localStorage.removeItem('temp_auth_token');
            
            // Safe navigation - check if router is available
            this._safeNavigate('/temp-auth');
        }
    }
    
    /**
     * Safely navigate using router if available, fallback to location.href
     */
    _safeNavigate(path) {
        if (window.router && typeof window.router.navigate === 'function') {
            window.router.navigate(path);
        } else {
            // Fallback for when router is not yet initialized
            console.warn('Router not available, using fallback navigation');
            window.location.href = path;
        }
    }
     
    get isAuthenticated() {
        return this._isAuthenticated;
    }

    get isTestingMode() {
        return this._isTestingMode;
    }

    /**
     * Manually sets the authentication status and manages the session check interval.
     * @param {boolean} isAuth - The new authentication status.
     */
    setAuthenticated(isAuth) {
        if (this._isAuthenticated === isAuth) return;

        this._isAuthenticated = isAuth;
        
        if (isAuth) {
            this.startAuthCheck();
        } else {
            this.cleanup();
            // Clean up all authentication data on logout
            localStorage.removeItem('temp_auth_backup');
            localStorage.removeItem('temp_auth_token');
        }
    }
     
    // These helpers are used by the router to make decisions
    shouldBypassAuth() {
        return this._isTestingMode && this._isAuthenticated;
    }
     
    shouldBlockAuthPages() {
        return this._isTestingMode;
    }
    
    /**
     * Temporarily pause the next session check (useful during critical operations)
     */
    pauseNextSessionCheck() {
        this._skipNextCheck = true;
    }

    /**
     * Record user activity to track when to refresh sessions
     */
    recordActivity() {
        this.lastActivityTime = Date.now();
    }

    /**
     * Setup activity listeners to track user engagement
     */
    setupActivityTracking() {
        const events = ['click', 'keypress', 'scroll', 'mousemove'];
        const throttledActivity = this.throttle(() => this.recordActivity(), 60000); // Max once per minute

        events.forEach(event => {
            document.addEventListener(event, throttledActivity, { passive: true });
        });
    }

    /**
     * Throttle function to limit the frequency of calls
     */
    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }
}
 
export const tempAuthManager = new TempAuthManager();