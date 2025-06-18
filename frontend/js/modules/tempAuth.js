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

        TempAuthManager.instance = this;
    }

    /**
     * Initializes the temporary authentication manager. Checks the initial status from the server.
     * This function is now idempotent and will only run its main logic once.
     */
    async init() {
        if (this._isInitialized) {
            return true; // **FIX 1: Prevents re-initialization and returns true**
        }
        
        console.log('🔐 Initializing temporary authentication manager...');
        
        try {
            const response = await apiFetch('/api/auth/temp-status');

            if (response.ok) {
                const data = await response.json();
                this._isTestingMode = data.testing_mode;
                this._isAuthenticated = data.authenticated;
                this._isInitialized = true; // Mark as initialized after successful check

                console.log(`Initial auth state: Testing mode: ${this._isTestingMode}, Authenticated: ${this._isAuthenticated}`);

                if (this._isTestingMode) {
                    this.startAuthCheck();
                }
                return true; // **FIX 2: Return true on success**
            }
            return false; // Return false if response not OK
        } catch (error) {
            console.error('Error checking initial temp auth status. Assuming not in testing mode.', error);
            this._isTestingMode = false;
            this._isAuthenticated = false;
            return false; // Return false on error
        }
    }

    /**
     * Periodically checks the session status with the server.
     * This now includes a fix to prevent refresh loops.
     */
    startAuthCheck() {
        if (this.checkInterval) clearInterval(this.checkInterval);

        this.checkInterval = setInterval(async () => {
            try {
                const response = await apiFetch('/api/auth/temp-status');
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (this._isAuthenticated && !data.authenticated) {
                        console.log('Server session expired. Forcing logout.');
                        this.setAuthenticated(false);
                        
                        // **FIX 2: Only redirect if not already on the login page.**
                        if (window.location.pathname !== '/temp-auth') {
                            window.router.navigateTo('/temp-auth');
                        }
                    } else {
                         // Sync local state with server state just in case
                        this._isAuthenticated = data.authenticated;
                    }
                }
            } catch (error) {
                console.error('Error during periodic temp auth check:', error);
            }
        }, 30000); // Check every 30 seconds
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
            await apiFetch('/api/auth/temp-logout', { method: 'POST' });
        } catch (error) {
            console.error('Error on temp logout API call, logging out client-side anyway.', error);
        } finally {
            this.setAuthenticated(false);
            window.router.navigateTo('/temp-auth');
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
        console.log(`🔧 TempAuth status updated to: ${this._isAuthenticated}`);
        
        if (isAuth) {
            this.startAuthCheck();
        } else {
            this.cleanup();
        }
    }
     
    // These helpers are used by the router to make decisions
    shouldBypassAuth() {
        return this._isTestingMode && this._isAuthenticated;
    }
     
    shouldBlockAuthPages() {
        return this._isTestingMode;
    }
}
 
export const tempAuthManager = new TempAuthManager();