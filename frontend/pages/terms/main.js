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
    
    // Fix mobile scrolling issue on initial load
    if (window.innerWidth <= 768) {
        // Instead of scroll hack, ensure proper height calculation
        requestAnimationFrame(() => {
            // Force layout recalculation
            document.body.style.minHeight = '100vh';
            
            // Ensure footer is visible by scrolling to top
            window.scrollTo(0, 0);
            
            // Force a repaint to ensure proper rendering
            document.body.offsetHeight;
        });
        
        // Handle orientation changes
        orientationHandler = () => {
            setTimeout(() => {
                // Recalculate on orientation change
                document.body.style.minHeight = '100vh';
                document.body.offsetHeight;
            }, 100);
        };
        window.addEventListener('orientationchange', orientationHandler);
    }
}

// Store orientation handler reference
let orientationHandler = null;

// 2. CLEANUP FUNCTION
function cleanup() {
    console.log('🧹 Cleaning up Terms of Service page');
    
    // Remove event listeners
    document.removeEventListener('click', handleNavigationClick);
    
    // Remove orientation handler if it exists
    if (orientationHandler && window.innerWidth <= 768) {
        window.removeEventListener('orientationchange', orientationHandler);
        orientationHandler = null;
    }
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