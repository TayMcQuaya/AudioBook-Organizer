import { initAuthPage as initialize, cleanupAuthPage as cleanup } from './auth.js';
import { enableSecureLogging } from '/js/utils/logger.js';

// Enable secure logging for auth pages
enableSecureLogging();

// Auth main.js loaded

function init() {
    // Initializing auth page
    // Get the auth module from the global scope (provided by the router)
    const authModule = window.authModule;
    if (authModule) {
        // Using existing auth module from router
        initialize(authModule);
    } else {
        console.error('❌ Auth module not available!');
    }
}

// Router is now responsible for initialization.
// // Check if DOM is already loaded
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', init);
// } else {
//     // DOM is already loaded, initialize immediately
//     console.log('✅ DOM already loaded, initializing immediately...');
//     init();
// }

export { init as initAuthPage, cleanup as cleanupAuthPage }; 