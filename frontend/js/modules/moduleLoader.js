/**
 * Robust Module Loader for AudioBook Organizer
 * Handles dynamic imports consistently across Flask (local) and Gunicorn (production)
 */

class ModuleLoader {
    constructor() {
        this.baseUrl = this._detectBaseUrl();
        this.loadedModules = new Map();
        this.failedAttempts = new Map();
    }

    /**
     * Detect the correct base URL for module loading
     */
    _detectBaseUrl() {
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
        
        if (isLocal) {
            // Local development - use relative paths from root
            return '';
        } else {
            // Production - use absolute path from domain root
            return window.location.origin;
        }
    }

    /**
     * Build possible paths for a module
     */
    _buildModulePaths(modulePath) {
        // Normalize module path - remove leading slash if present
        const normalizedPath = modulePath.startsWith('/') ? modulePath.slice(1) : modulePath;
        
        return [
            `${this.baseUrl}/${normalizedPath}`,
            `/${normalizedPath}`,
            `./${normalizedPath}`,
            `../${normalizedPath}`,
            normalizedPath
        ];
    }

    /**
     * Load a module with robust fallback mechanism
     */
    async loadModule(modulePath, options = {}) {
        const {
            cache = true,
            timeout = 10000,
            retries = 3
        } = options;

        // Check cache first
        if (cache && this.loadedModules.has(modulePath)) {
            return this.loadedModules.get(modulePath);
        }

        // Check if we've failed too many times
        const failures = this.failedAttempts.get(modulePath) || 0;
        if (failures >= retries) {
            throw new Error(`Module ${modulePath} failed to load after ${retries} attempts`);
        }

        const paths = this._buildModulePaths(modulePath);
        let lastError = null;

        for (const path of paths) {
            try {
                console.log(`🔧 Attempting to load module: ${path}`);
                
                const module = await this._loadWithTimeout(path, timeout);
                
                // Cache successful load
                if (cache) {
                    this.loadedModules.set(modulePath, module);
                }
                
                // Reset failure count on success
                this.failedAttempts.delete(modulePath);
                
                console.log(`✅ Successfully loaded module: ${path}`);
                return module;
                
            } catch (error) {
                // **SECURITY FIX: Removed error message to prevent path/details exposure**
            console.warn(`⚠️ Failed to load module: ${path}`);
                lastError = error;
                continue;
            }
        }

        // All paths failed, increment failure count
        this.failedAttempts.set(modulePath, failures + 1);
        
        throw new Error(`Failed to load module ${modulePath} from any path. Last error: ${lastError?.message}`);
    }

    /**
     * Load module with timeout
     */
    async _loadWithTimeout(path, timeout) {
        return Promise.race([
            import(path),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Import timeout')), timeout)
            )
        ]);
    }

    /**
     * Load module as script tag (fallback for global functions)
     */
    async loadAsScript(modulePath, options = {}) {
        const {
            type = 'module',
            timeout = 10000,
            globalCheck = null
        } = options;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = type;
            
            // Remove existing script with same src
            const existing = document.querySelector(`script[src="${modulePath}"]`);
            if (existing) {
                existing.remove();
            }

            const timer = setTimeout(() => {
                script.remove();
                reject(new Error(`Script load timeout: ${modulePath}`));
            }, timeout);

            script.onload = () => {
                clearTimeout(timer);
                
                // Check if global functions are available
                if (globalCheck && typeof globalCheck === 'function') {
                    if (globalCheck()) {
                        resolve(script);
                    } else {
                        reject(new Error(`Global functions not available after loading ${modulePath}`));
                    }
                } else {
                    resolve(script);
                }
            };

            script.onerror = () => {
                clearTimeout(timer);
                script.remove();
                reject(new Error(`Script load failed: ${modulePath}`));
            };

            script.src = this._buildModulePaths(modulePath)[0]; // Use first path for script loading
            document.head.appendChild(script);
        });
    }

    /**
     * Load main app module with comprehensive fallback
     */
    async loadMainApp() {
        try {
            // Try ES6 module import first
            const module = await this.loadModule('js/main.js', { retries: 2 });
            
            if (module.initialize && module.cleanup) {
                return {
                    initialize: module.initialize,
                    cleanup: module.cleanup,
                    loadMethod: 'es6-import'
                };
            } else {
                throw new Error('Module loaded but functions not found');
            }
            
        } catch (importError) {
            console.warn('❌ ES6 import failed, trying script tag fallback:', importError.message);
            
            try {
                // Fallback to script tag
                await this.loadAsScript('js/main.js', {
                    globalCheck: () => window.initialize && window.cleanup
                });
                
                return {
                    initialize: window.initialize,
                    cleanup: window.cleanup,
                    loadMethod: 'script-tag'
                };
                
            } catch (scriptError) {
                throw new Error(`All loading methods failed. Import: ${importError.message}, Script: ${scriptError.message}`);
            }
        }
    }

    /**
     * Clear caches and reset state
     */
    reset() {
        this.loadedModules.clear();
        this.failedAttempts.clear();
    }

    /**
     * Get loading statistics
     */
    getStats() {
        return {
            loadedModules: this.loadedModules.size,
            failedAttempts: Object.fromEntries(this.failedAttempts),
            baseUrl: this.baseUrl
        };
    }
}

// Export singleton instance
export const moduleLoader = new ModuleLoader();
export default moduleLoader; 