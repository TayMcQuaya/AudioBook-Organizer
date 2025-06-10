// AudioBook Organizer - Landing Page JavaScript

// Import utility functions and modules
import { showSuccess, showError, showInfo } from '../../js/modules/notifications.js';
import appUI from '../../js/modules/appUI.js';

// Landing page state - auth modal removed, using /auth page redirect
let selectedPlan = null;

// DOM elements
const loadingOverlay = document.getElementById('loadingOverlay');
const mobileMenu = document.getElementById('mobileMenu');

// Initialize landing page functionality
// Check if DOM is already loaded, otherwise wait for it
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLandingPage);
} else {
    // DOM is already loaded, initialize immediately
    initializeLandingPage();
}

async function initializeLandingPage() {
    console.log('🚀 Landing page initialized');
    
    // Setup all interactive components
    setupScrollAnimations();
    setupSmoothScrolling();
    setupMobileMenu();
    setupFormValidation();
    setupScrollEffects();
    setupAppWindowTilt();
    
    // Initialize appUI manager
    if (window.appUI) {
        await window.appUI.init();
    }
    
    // Ensure session manager is properly initialized and restored
    if (window.sessionManager) {
        if (!window.sessionManager.isInitialized) {
            await window.sessionManager.init();
        }
        
        // Wait a bit to ensure session is fully restored
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check auth status again to make sure it's current
        await window.sessionManager.checkAuthStatus();
    }
    
    // Check authentication state and update UI
    await checkAuthenticationState();
    
    // Listen for auth state changes
    window.addEventListener('auth-state-changed', handleAuthStateChange);
    
    // Add click outside handler for user dropdown
    document.addEventListener('click', handleOutsideClick);
}

/**
 * Check authentication state and update navigation accordingly
 */
async function checkAuthenticationState() {
    // Wait for session manager to be ready
    if (!window.sessionManager) {
        console.log('Session manager not available');
        return;
    }
    
    // Add auth state change listener for real-time updates
    window.addEventListener('auth-state-changed', handleAuthStateChange);
    
    // Wait for session manager to be initialized
    let attempts = 0;
    while (!window.sessionManager.isInitialized && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    // Also check for auth token directly for faster response
    const hasToken = localStorage.getItem('auth_token');
    const isAuthenticated = window.sessionManager.isAuthenticated || (hasToken && window.authModule?.isAuthenticated());
    
    if (isAuthenticated) {
        console.log('User is authenticated on landing page');
        const user = window.sessionManager.user || window.authModule?.getCurrentUser();
        // Trigger UI update for authenticated user
        updateLandingPageForAuthenticatedUser(user);
    } else {
        console.log('User is not authenticated on landing page');
        // Trigger UI update for unauthenticated user
        updateLandingPageForUnauthenticatedUser();
    }
}

/**
 * Handle authentication state changes
 */
function handleAuthStateChange(event) {
    const { isAuthenticated, user } = event.detail;
    console.log('Landing page received auth state change:', isAuthenticated);
    
    if (isAuthenticated) {
        // Update any landing page specific elements
        updateLandingPageForAuthenticatedUser(user);
    } else {
        updateLandingPageForUnauthenticatedUser();
    }
}

/**
 * Update landing page elements for authenticated users
 */
function updateLandingPageForAuthenticatedUser(user) {
    console.log('🔄 Updating landing page for authenticated user:', user?.email || 'Unknown user');
    
    // Create user navigation dropdown (this was the missing piece!)
    if (window.appUI && user) {
        console.log('📝 Creating user navigation with appUI');
        window.appUI.createUserNavigation(user);
    } else if (!window.appUI) {
        console.warn('⚠️ appUI not available, cannot create user navigation');
    }
    
    // Only show one "Open App" button - convert the primary "Get Started" button
    const getStartedButtons = document.querySelectorAll('a[href="/auth?mode=signup"]');
    console.log('📝 Found Get Started buttons:', getStartedButtons.length);
    getStartedButtons.forEach((btn, index) => {
        console.log(`📝 Converting button ${index} to Open App`);
        btn.href = '/app';
        btn.innerHTML = '<span class="btn-icon">🚀</span>Open App';
        btn.classList.add('btn-primary'); // Ensure consistent styling
    });
    
    // Hide ALL demo/try buttons when authenticated
    const tryDemoButtons = document.querySelectorAll('[onclick*="tryAppDemo"], [onclick*="tryDemo"], .demo-btn');
    console.log('📝 Found Try Demo buttons:', tryDemoButtons.length);
    tryDemoButtons.forEach((btn, index) => {
        console.log(`📝 Hiding demo button ${index}`);
        btn.style.display = 'none';
    });
    
    // Hide the static "Sign In" button (but don't hide user navigation)
    const signInButtons = document.querySelectorAll('a[href="/auth"]:not(.user-btn)');
    console.log('📝 Found Sign In buttons to hide:', signInButtons.length);
    signInButtons.forEach(btn => {
        if (!btn.closest('.user-nav') && !btn.closest('.mobile-user-nav')) {
            console.log('📝 Hiding Sign In button:', btn.textContent);
            btn.style.display = 'none';
        }
    });
}

/**
 * Update landing page elements for unauthenticated users
 */
function updateLandingPageForUnauthenticatedUser() {
    console.log('🔄 Updating landing page for unauthenticated user');
    
    // Remove user navigation dropdown
    if (window.appUI) {
        window.appUI.removeUserNavigation();
    }
    
    // Show try demo buttons again
    const tryDemoButtons = document.querySelectorAll('[onclick*="tryAppDemo"], [onclick*="navigateToApp"], .demo-btn');
    console.log('📝 Found Try Demo buttons to restore:', tryDemoButtons.length);
    tryDemoButtons.forEach((btn, index) => {
        console.log(`📝 Restoring demo button ${index}`);
        btn.style.display = '';
        btn.innerHTML = '<span class="btn-icon">📚</span>Try Demo Now';
        btn.setAttribute('onclick', 'tryAppDemo()');
    });
    
    // Reset "Get Started" buttons
    const appButtons = document.querySelectorAll('a[href="/app"]');
    console.log('📝 Found App buttons to reset:', appButtons.length);
    appButtons.forEach((btn, index) => {
        console.log(`📝 Resetting app button ${index} to Get Started`);
        btn.href = '/auth?mode=signup';
        btn.innerHTML = '<span class="btn-icon">🚀</span>Get Started Free';
    });
    
    // Show auth signup links again
    const signInButtons = document.querySelectorAll('a[href="/auth"]');
    signInButtons.forEach(btn => {
        btn.style.display = '';
    });
}

/**
 * Handle clicks outside user dropdown to close it
 */
function handleOutsideClick(event) {
    const userDropdown = document.getElementById('userDropdown');
    const userBtn = document.querySelector('.user-btn');
    
    if (userDropdown && userDropdown.classList.contains('show')) {
        if (!userBtn?.contains(event.target) && !userDropdown.contains(event.target)) {
            userDropdown.classList.remove('show');
        }
    }
}

// Navigation and Interaction Functions
function toggleMobileMenu() {
    mobileMenu.classList.toggle('show');
}

function scrollToDemo() {
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
}

function playDemo() {
    showInfo('Interactive demo coming soon! 🎬');
}

function contactSales() {
    showInfo('Sales contact form coming soon! 📞');
}

// Navigation to app (for demo/try buttons)
function navigateToApp() {
    // Check if user is already authenticated
    if (window.sessionManager && window.sessionManager.isAuthenticated) {
        // User is authenticated, navigate to app
        if (window.router) {
            window.router.navigate('/app');
        } else {
            window.location.href = '/app';
        }
    } else {
        // Redirect to auth page
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        if (window.router) {
            window.router.navigate(`/auth?return=${returnUrl}&mode=login`);
        } else {
            window.location.href = `/auth?return=${returnUrl}&mode=login`;
        }
    }
}

function tryAppDemo() {
    // Check if user is authenticated
    if (window.sessionManager && window.sessionManager.isAuthenticated) {
        // User is authenticated, navigate to app
        if (window.router) {
            window.router.navigate('/app');
        } else {
            // Fallback: direct navigation
            window.location.href = '/app';
        }
        console.log('🚀 Navigating to authenticated app...');
    } else {
        // Redirect to auth page with return URL for better UX
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        if (window.router) {
            window.router.navigate(`/auth?return=${returnUrl}&mode=signup`);
        } else {
            window.location.href = `/auth?return=${returnUrl}&mode=signup`;
        }
        console.log('🔐 Redirecting to auth page for demo access...');
    }
}

// Setup Functions
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    // Observe elements that should animate on scroll
    const animateElements = document.querySelectorAll('.feature-card, .step, .pricing-card');
    animateElements.forEach(el => {
        el.classList.add('fade-in-up');
        observer.observe(el);
    });
}

function setupSmoothScrolling() {
    const navLinks = document.querySelectorAll('.nav-link, .mobile-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                    // Close mobile menu if open
                    const mobileMenu = document.getElementById('mobileMenu');
                    if (mobileMenu) {
                        mobileMenu.classList.remove('show');
                    }
                }
            }
        });
    });
}

function setupMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (!mobileMenu) return;
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-mobile') && !e.target.closest('.mobile-menu')) {
            mobileMenu.classList.remove('show');
        }
    });
    
    // Close mobile menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            mobileMenu.classList.remove('show');
        }
    });
}

function setupFormValidation() {
    // Real-time form validation will be added here
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('form-input')) {
            validateInput(e.target);
        }
    });
}

function validateInput(input) {
    const value = input.value;
    const type = input.type;
    const name = input.name;
    
    // Remove previous validation classes
    input.classList.remove('valid', 'invalid');
    
    let isValid = true;
    
    switch (type) {
        case 'email':
            isValid = isValidEmail(value);
            break;
        case 'password':
            isValid = value.length >= 8;
            break;
        default:
            isValid = value.trim().length > 0;
    }
    
    // Add validation class
    input.classList.add(isValid ? 'valid' : 'invalid');
    
    // Handle confirm password validation
    if (name === 'confirmPassword') {
        const passwordInput = document.getElementById('password');
        const passwordsMatch = passwordInput && value === passwordInput.value;
        input.classList.toggle('invalid', !passwordsMatch);
        input.classList.toggle('valid', passwordsMatch);
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function setupScrollEffects() {
    const nav = document.querySelector('.landing-nav');
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        // Keep navigation always visible - just update background opacity
        if (currentScrollY > 50) {
            nav.style.background = 'rgba(255, 255, 255, 0.95)';
            nav.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        } else {
            nav.style.background = 'rgba(255, 255, 255, 0.9)';
            nav.style.boxShadow = 'none';
        }
    });
}

// App Window Tilt Effect
function setupAppWindowTilt() {
    const appWindow = document.querySelector('.app-window');
    if (!appWindow) {
        console.warn('⚠️ App window element not found for tilt effect');
        // Try again after a short delay in case DOM is still loading
        setTimeout(() => {
            setupAppWindowTilt();
        }, 100);
        return;
    }
    
    let isHovering = false;
    let animationId = null;
    let currentRotateX = 10;  // Base rotation
    let currentRotateY = -15; // Base rotation
    let targetRotateX = 10;
    let targetRotateY = -15;
    
    // Smooth animation using requestAnimationFrame
    function animate() {
        if (!isHovering) return;
        
        // Lerp (linear interpolation) for smooth movement
        const lerpFactor = 0.15; // Adjust this for responsiveness (0.1 = slower, 0.2 = faster)
        currentRotateX += (targetRotateX - currentRotateX) * lerpFactor;
        currentRotateY += (targetRotateY - currentRotateY) * lerpFactor;
        
        // Apply the smooth transform
        appWindow.style.transform = `
            translate3d(0, 0, 0)
            rotateY(${currentRotateY}deg) 
            rotateX(${currentRotateX}deg)
            scale3d(1.02, 1.02, 1.02)
        `;
        
        animationId = requestAnimationFrame(animate);
    }
    
    appWindow.addEventListener('mouseenter', () => {
        isHovering = true;
        if (animationId) cancelAnimationFrame(animationId);
        animate();
    });
    
    appWindow.addEventListener('mouseleave', () => {
        isHovering = false;
        if (animationId) cancelAnimationFrame(animationId);
        
        // Return to base position
        appWindow.style.transform = `
            translate3d(0, 0, 0)
            rotateY(-15deg) 
            rotateX(10deg)
            scale3d(1, 1, 1)
        `;
    });
    
    appWindow.addEventListener('mousemove', (e) => {
        if (!isHovering) return;
        
        const rect = appWindow.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = (e.clientX - centerX) / (rect.width / 2);
        const deltaY = (e.clientY - centerY) / (rect.height / 2);
        
        // Limit rotation range
        const maxRotation = 15;
        const rotateX = deltaY * maxRotation;
        const rotateY = deltaX * maxRotation;
        
        // Base rotation + mouse influence
        const baseRotateX = 10;
        const baseRotateY = -15;
        const finalRotateX = Math.max(-maxRotation, Math.min(maxRotation, rotateX));
        const finalRotateY = Math.max(-maxRotation, Math.min(maxRotation, rotateY));
        
        targetRotateX = baseRotateX + finalRotateX;
        targetRotateY = baseRotateY + finalRotateY;
    });
    
    console.log('✨ App window tilt effect initialized with smooth animation');
}

// Make functions globally available for HTML onclick handlers
window.toggleMobileMenu = toggleMobileMenu;
window.scrollToDemo = scrollToDemo;
window.playDemo = playDemo;
window.contactSales = contactSales;
window.navigateToApp = navigateToApp;
window.tryAppDemo = tryAppDemo;

// Export for module use
export {
    toggleMobileMenu,
    scrollToDemo,
    playDemo,
    contactSales,
    navigateToApp,
    tryAppDemo
}; 