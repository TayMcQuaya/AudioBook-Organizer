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
    }
    
    setupForm() {
        // Get form elements
        this.form = document.getElementById('tempAuthForm');
        this.passwordInput = document.getElementById('password');
        this.submitBtn = document.getElementById('submitBtn');
        this.errorMessage = document.getElementById('errorMessage');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        
        if (!this.form) {
            console.error('Temp auth form not found');
            return;
        }
        
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
        
        console.log('Temp auth form initialized');
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
            const response = await fetch('/api/auth/temp-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin', // Include session cookies
                body: JSON.stringify({ password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Success! Redirect to app
                console.log('Temporary authentication successful');
                this.showSuccess();
                
                // Small delay to show success, then redirect
                setTimeout(() => {
                    window.location.href = '/app';
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