/**
 * Google reCAPTCHA v3 Integration Module
 * Handles reCAPTCHA token generation and verification
 */

import { showError, showInfo } from './notifications.js';
import { apiFetch } from './api.js';

class RecaptchaService {
    constructor() {
        this.siteKey = null;
        this.isEnabled = false;
        this.isLoaded = false;
        this.pendingCallbacks = [];
    }

    /**
     * Initialize reCAPTCHA service
     */
    async init() {
        try {
            // Get security configuration from backend
            const response = await apiFetch('/api/auth/security-status');
            const data = await response.json();
            
            if (data.success && data.security_status) {
                this.isEnabled = data.security_status.recaptcha_enabled;
                this.siteKey = data.security_status.recaptcha_site_key;
                
                if (this.isEnabled && this.siteKey) {
                    await this.loadRecaptchaScript();
                    console.log('✅ reCAPTCHA service initialized');
                } else {
                    console.log('ℹ️ reCAPTCHA is disabled');
                }
            }
        } catch (error) {
            console.error('❌ Failed to initialize reCAPTCHA:', error);
            this.isEnabled = false;
        }
    }

    /**
     * Load Google reCAPTCHA script dynamically
     */
    async loadRecaptchaScript() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.grecaptcha && window.grecaptcha.ready) {
                this.isLoaded = true;
                this.executeReadyCallbacks();
                resolve();
                return;
            }

            // Check if script is already being loaded
            const existingScript = document.querySelector('script[src*="recaptcha"]');
            if (existingScript) {
                // Wait for it to load
                existingScript.onload = () => {
                    this.waitForRecaptcha().then(resolve).catch(reject);
                };
                existingScript.onerror = reject;
                return;
            }

            // Create and load script
            const script = document.createElement('script');
            script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`;
            script.async = true;
            script.defer = true;

            script.onload = () => {
                this.waitForRecaptcha().then(resolve).catch(reject);
            };

            script.onerror = () => {
                reject(new Error('Failed to load reCAPTCHA script'));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Wait for reCAPTCHA to be ready
     */
    async waitForRecaptcha() {
        return new Promise((resolve) => {
            if (window.grecaptcha && window.grecaptcha.ready) {
                window.grecaptcha.ready(() => {
                    this.isLoaded = true;
                    this.executeReadyCallbacks();
                    resolve();
                });
            } else {
                // Retry after a short delay
                setTimeout(() => this.waitForRecaptcha().then(resolve), 100);
            }
        });
    }

    /**
     * Execute pending ready callbacks
     */
    executeReadyCallbacks() {
        while (this.pendingCallbacks.length > 0) {
            const callback = this.pendingCallbacks.shift();
            callback();
        }
    }

    /**
     * Execute reCAPTCHA when ready
     */
    ready(callback) {
        if (this.isLoaded) {
            callback();
        } else {
            this.pendingCallbacks.push(callback);
        }
    }

    /**
     * Execute reCAPTCHA for a specific action
     */
    async execute(action = 'submit') {
        if (!this.isEnabled) {
            console.log('ℹ️ reCAPTCHA disabled, returning dummy token');
            return 'disabled';
        }

        if (!this.siteKey) {
            throw new Error('reCAPTCHA site key not configured');
        }

        return new Promise((resolve, reject) => {
            this.ready(() => {
                try {
                    window.grecaptcha.execute(this.siteKey, { action })
                        .then(token => {
                            console.log(`✅ reCAPTCHA token generated for action: ${action}`);
                            resolve(token);
                        })
                        .catch(error => {
                            console.error('❌ reCAPTCHA execution failed:', error);
                            reject(error);
                        });
                } catch (error) {
                    console.error('❌ reCAPTCHA execute error:', error);
                    reject(error);
                }
            });
        });
    }

    /**
     * Get reCAPTCHA token for login
     */
    async getLoginToken() {
        try {
            return await this.execute('login');
        } catch (error) {
            console.error('Failed to get login reCAPTCHA token:', error);
            showError('Security verification failed. Please try again.');
            throw error;
        }
    }

    /**
     * Get reCAPTCHA token for signup
     */
    async getSignupToken() {
        try {
            return await this.execute('signup');
        } catch (error) {
            console.error('Failed to get signup reCAPTCHA token:', error);
            showError('Security verification failed. Please try again.');
            throw error;
        }
    }

    /**
     * Get reCAPTCHA token for password reset
     */
    async getForgotPasswordToken() {
        try {
            return await this.execute('forgot_password');
        } catch (error) {
            console.error('Failed to get forgot password reCAPTCHA token:', error);
            showError('Security verification failed. Please try again.');
            throw error;
        }
    }

    /**
     * Set reCAPTCHA token in a hidden form field
     */
    async setTokenInField(fieldId, action) {
        try {
            const token = await this.execute(action);
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = token;
                return token;
            }
            throw new Error(`Field ${fieldId} not found`);
        } catch (error) {
            console.error(`Failed to set reCAPTCHA token in field ${fieldId}:`, error);
            throw error;
        }
    }

    /**
     * Validate reCAPTCHA response on the frontend (basic check)
     */
    validateToken(token) {
        if (!this.isEnabled) return true;
        return token && token.length > 0 && token !== 'disabled';
    }

    /**
     * Show security indicator
     */
    showSecurityIndicator() {
        const indicator = document.getElementById('securityIndicator');
        if (indicator) {
            if (this.isEnabled) {
                indicator.style.display = 'flex';
                indicator.querySelector('.security-text').textContent = 'Protected by reCAPTCHA';
                indicator.querySelector('.security-icon').textContent = '🔒';
            } else {
                indicator.style.display = 'none';
            }
        }
    }

    /**
     * Update security status display
     */
    updateSecurityStatus(isProcessing = false) {
        const indicator = document.getElementById('securityIndicator');
        if (!indicator) return;

        if (isProcessing) {
            indicator.querySelector('.security-text').textContent = 'Verifying security...';
            indicator.querySelector('.security-icon').textContent = '⏳';
        } else {
            indicator.querySelector('.security-text').textContent = 'Protected by reCAPTCHA';
            indicator.querySelector('.security-icon').textContent = '🔒';
        }
    }

    /**
     * Reset reCAPTCHA (for error recovery)
     */
    reset() {
        if (this.isLoaded && window.grecaptcha && window.grecaptcha.reset) {
            window.grecaptcha.reset();
        }
    }

    /**
     * Check if reCAPTCHA is enabled
     */
    isRecaptchaEnabled() {
        return this.isEnabled;
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return {
            enabled: this.isEnabled,
            siteKey: this.siteKey,
            loaded: this.isLoaded
        };
    }
}

// Create singleton instance
const recaptcha = new RecaptchaService();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    recaptcha.init();
});

export { recaptcha }; 