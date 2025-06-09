import { AuthModule } from '../../js/modules/auth.js';
import { initAuthPage } from './auth.js';

console.log('🚀 Auth main.js loaded');

function initializeAuth() {
    console.log('🔐 Initializing auth with new AuthModule...');
    const auth = new AuthModule();
    initAuthPage(auth);
}

// Check if DOM is already loaded (common when content is loaded dynamically)
if (document.readyState === 'loading') {
    console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    console.log('✅ DOM already loaded, initializing immediately...');
    // DOM is already loaded, initialize immediately
    initializeAuth();
} 