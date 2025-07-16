/**
 * Password Reset Handler
 * Handles password reset token detection and redirection
 */

export class PasswordResetHandler {
    static init() {
        // Check if we're on the landing page with a password reset token
        if (window.location.pathname === '/' || window.location.pathname === '') {
            // Check for password reset token in the URL
            const hash = window.location.hash;
            const params = new URLSearchParams(window.location.search);
            
            // Check for recovery token in hash (Supabase implicit flow)
            if (hash && (hash.includes('type=recovery') || hash.includes('type=email_change'))) {
                console.log('🔑 Password reset token detected on landing page, redirecting...');
                // Preserve the hash and redirect to password reset page
                window.location.href = '/auth/reset-password' + hash + window.location.search;
                return true;
            }
            
            // Check for recovery token in query params (Supabase PKCE flow)
            if (params.get('type') === 'recovery' || params.get('type') === 'email_change') {
                console.log('🔑 Password reset token detected in query params, redirecting...');
                window.location.href = '/auth/reset-password' + window.location.search + hash;
                return true;
            }
        }
        
        return false;
    }
    
    // Call this method early in app initialization
    static handleEarlyRedirect() {
        // This runs before any other initialization
        if (this.init()) {
            // Stop further execution if we're redirecting
            throw new Error('Redirecting to password reset page');
        }
    }
}

// Auto-execute on module load for immediate detection
try {
    PasswordResetHandler.handleEarlyRedirect();
} catch (e) {
    if (e.message !== 'Redirecting to password reset page') {
        console.error('Password reset handler error:', e);
    }
}