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
                        console.log('🔧 Temp auth form detected via MutationObserver');
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
        console.log('🔧 Attempting to find temp auth form elements...');
        
        // Debug: Check what's actually in the DOM
        console.log('🔧 Current DOM state:');
        console.log('  - Document ready state:', document.readyState);
        console.log('  - appContainer exists:', !!document.getElementById('appContainer'));
        console.log('  - appContainer innerHTML length:', document.getElementById('appContainer')?.innerHTML?.length || 0);
        console.log('  - All forms in document:', document.querySelectorAll('form').length);
        console.log('  - Form with tempAuthForm ID:', !!document.getElementById('tempAuthForm'));
        
        this.form = document.getElementById('tempAuthForm');
        this.passwordInput = document.getElementById('password');
        this.submitBtn = document.getElementById('submitBtn');
        this.errorMessage = document.getElementById('errorMessage');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        
        if (this.form) {
            console.log('✅ All temp auth form elements found successfully');
            
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
            
            console.log('✅ Temp auth form initialized successfully');
            return true;
        } else {
            console.log('❌ Temp auth form not found. Elements found:');
            console.log('  - form (tempAuthForm):', !!this.form);
            console.log('  - passwordInput (password):', !!this.passwordInput);
            console.log('  - submitBtn (submitBtn):', !!this.submitBtn);
            console.log('  - errorMessage (errorMessage):', !!this.errorMessage);
            console.log('  - loadingIndicator (loadingIndicator):', !!this.loadingIndicator);
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
            console.log(`🔧 Waiting for temp auth form to be available... (attempt ${retryCount}/${maxRetries})`);
            
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
            // Get backend URL from environment config
            const backendUrl = window.ENVIRONMENT_CONFIG?.BACKEND_URL || window.BACKEND_URL || '';
            const apiUrl = backendUrl ? `${backendUrl}/api/auth/temp-login` : '/api/auth/temp-login';
            
            console.log('🔧 Making API call to:', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Changed from 'same-origin' to 'include' for cross-origin
                body: JSON.stringify({ password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Success! Update authentication status
                console.log('Temporary authentication successful');
                
                // Update tempAuthManager status
                if (window.tempAuthManager) {
                    window.tempAuthManager.isAuthenticated = true;
                    console.log('🔧 Updated tempAuthManager.isAuthenticated to true');
                }
                
                this.showSuccess();
                
                // Small delay to show success, then navigate via router
                setTimeout(() => {
                    // Use router navigation instead of hard redirect to maintain SPA state
                    if (window.router) {
                        window.router.navigate('/app');
                    } else {
                        window.location.href = '/app';
                    }
                }, 1000);
            } else {
                this.showError(data.error || 'Authentication failed');
            }
        } catch (error) {
            console.error('Authentication error:', error);
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