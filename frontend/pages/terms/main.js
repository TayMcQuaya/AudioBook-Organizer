// Terms of Service Page - Main JavaScript File
// Follows PAGE_LIFECYCLE_GUIDE.md patterns

// Handle navigation clicks
function handleNavigationClick(event) {
    const target = event.target.closest('[data-action="navigate"]');
    if (!target) return;
    
    event.preventDefault();
    const route = target.dataset.route;
    
    if (window.router) {
        window.router.navigate(route);
    } else {
        // Fallback to direct navigation if router not available
        window.location.href = route;
    }
}

// 1. INIT FUNCTION
function init() {
    console.log('🚀 Initializing Terms of Service page');
    
    // Check authentication state from multiple sources
    const isAuth = checkMultipleAuthSources();
    updateAuthUI(isAuth);
    
    // Add event listeners
    document.addEventListener('click', handleNavigationClick);
    
    // Initialize theme if available
    if (window.themeManager) {
        window.themeManager.init();
    }
}

// 2. CLEANUP FUNCTION
function cleanup() {
    console.log('🧹 Cleaning up Terms of Service page');
    
    // Remove event listeners
    document.removeEventListener('click', handleNavigationClick);
}

// 3. AUTH HELPER FUNCTIONS
function checkMultipleAuthSources() {
    return window.sessionManager?.isAuthenticated || 
           window.authModule?.isAuthenticated ||
           localStorage.getItem('supabase.auth.token') ||
           sessionStorage.getItem('access_token');
}

function updateAuthUI(isAuthenticated) {
    // Update navigation based on auth state
    const authButton = document.querySelector('.nav-links .btn-primary');
    if (authButton && isAuthenticated) {
        authButton.textContent = 'Open App';
        authButton.dataset.route = '/app';
    }
}

// 4. EXPORT
export { init as initTermsPage, cleanup as cleanupTermsPage };