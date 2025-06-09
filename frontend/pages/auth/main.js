import { initAuthPage } from './auth.js';

console.log('🚀 Auth main.js loaded');

function initializeAuth() {
    console.log('🔐 Initializing auth page...');
    
    // Use the global auth module that was already initialized by the router
    if (window.authModule) {
        console.log('✅ Using existing auth module from router');
        initAuthPage(window.authModule);
    } else {
        console.warn('⚠️ Global auth module not found, creating fallback');
        // Fallback: import and create new module (shouldn't normally happen)
        import('../../js/modules/auth.js').then(({ AuthModule }) => {
            const auth = new AuthModule();
            initAuthPage(auth);
        });
    }
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