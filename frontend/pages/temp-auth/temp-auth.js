// Temporary Authentication JavaScript
// Handles password entry for testing mode

class TempAuth {
    constructor() {
        this.form = null;
        this.passwordInput = null;
        this.submitBtn = null;
        this.errorMessage = null;
        this.loadingIndicator = null;
        
        this.init();
    }
    
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupForm());
        } else {
            this.setupForm();
        }
        
        // Also set up a MutationObserver as backup to detect when the form is added
        this.setupMutationObserver();
    }
    
    setupMutationObserver() {
        // Use MutationObserver to detect when the form is added to the DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const tempForm = document.getElementById('tempAuthForm');
                    if (tempForm && !this.form) {
                        // Temp auth form detected
                        observer.disconnect();
                        this.setupFormElements();
                    }
                }
            });
        });
        
        // Observe the entire document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Clean up observer after 10 seconds to prevent memory leaks
        setTimeout(() => {
            observer.disconnect();
        }, 10000);
    }
    
    setupFormElements() {
        // Separate method for setting up form elements once they're found
        // Attempting to find temp auth form elements
        
        // Debug: Check what's actually in the DOM
        // DOM state checked
        
        this.form = document.getElementById('tempAuthForm');
        this.passwordInput = document.getElementById('password');
        this.submitBtn = document.getElementById('submitBtn');
        this.errorMessage = document.getElementById('errorMessage');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        
        if (this.form) {
            // All temp auth form elements found
            
            // Add event listeners
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            this.passwordInput.addEventListener('input', () => this.clearError());
            this.passwordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSubmit(e);
                }
            });
            
            // Focus on password field
            this.passwordInput.focus();
            
            // Temp auth form initialized
            return true;
        } else {
            // Temp auth form not found
        }
        return false;
    }
    
    setupForm() {
        // Try to set up form elements immediately
        if (this.setupFormElements()) {
            return; // Success, we're done
        }
        
        // If immediate setup failed, use retry logic with retry limit
        let retryCount = 0;
        const maxRetries = 100; // Maximum 5 seconds of retrying (100 * 50ms)
        
        const waitForElements = () => {
            if (this.setupFormElements()) {
                return true; // Success
            }
            
            retryCount++;
            // Waiting for temp auth form
            
            if (retryCount >= maxRetries) {
                console.error('❌ Failed to find temp auth form after maximum retries');
                console.error('🔧 Debug info - DOM elements found:');
                console.error('  - appContainer:', document.getElementById('appContainer'));
                console.error('  - Document body innerHTML length:', document.body.innerHTML.length);
                console.error('  - Available forms:', document.querySelectorAll('form'));
                console.error('  - Elements with id containing "temp":', document.querySelectorAll('[id*="temp"]'));
                return false;
            }
            
            // Retry after a short delay
            setTimeout(() => waitForElements(), 50);
            return false;
        };
        
        waitForElements();
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        const password = this.passwordInput.value.trim();
        
        if (!password) {
            this.showError('Please enter the access password');
            return;
        }
        
        this.setLoading(true);
        this.clearError();
        
        try {
            // Clean environment detection without hardcoded config
            const hostname = window.location.hostname;
            
            let apiUrl;
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                // Local development - use relative path to Flask backend
                apiUrl = '/api/auth/temp-login';
            } else {
                // Production - use DigitalOcean backend
                //apiUrl = 'https://audiobook-organizer-test-vdhku.ondigitalocean.app/api/auth/temp-login';
                apiUrl = '/api/auth/temp-login'
            }
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Store authentication token if provided (for cross-domain requests)
                if (data.token) {
                    localStorage.setItem('temp_auth_token', data.token);
                }
                
                // Update tempAuthManager status
                if (window.tempAuthManager) {
                    window.tempAuthManager.setAuthenticated(true);
                }
                
                // Store auth status in localStorage as backup
                localStorage.setItem('temp_auth_backup', 'true');
                
                this.showSuccess();
                
                // Navigate to app
                setTimeout(() => {
                    if (window.router) {
                        window.router.navigate('/app');
                    } else {
                        window.location.href = '/app';
                    }
                }, 500);
            } else {
                this.showError(data.error || 'Authentication failed');
            }
        } catch (error) {
            this.showError('Connection error. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }
    
    showError(message) {
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.style.display = 'block';
        }
        
        // Clear password on error
        if (this.passwordInput) {
            this.passwordInput.value = '';
            this.passwordInput.focus();
        }
    }
    
    clearError() {
        if (this.errorMessage) {
            this.errorMessage.style.display = 'none';
        }
    }
    
    showSuccess() {
        if (this.submitBtn) {
            this.submitBtn.textContent = '✓ Access Granted';
            this.submitBtn.style.background = 'rgba(76, 175, 80, 0.3)';
            this.submitBtn.style.borderColor = 'rgba(76, 175, 80, 0.5)';
        }
    }
    
    setLoading(loading) {
        if (loading) {
            this.submitBtn.disabled = true;
            this.submitBtn.textContent = 'Verifying...';
            this.loadingIndicator.style.display = 'block';
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Access Application';
            this.loadingIndicator.style.display = 'none';
        }
    }
}

// Initialize when script loads
new TempAuth();

// Export for potential use by other modules
export { TempAuth }; 