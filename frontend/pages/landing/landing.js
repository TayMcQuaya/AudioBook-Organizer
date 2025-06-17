// AudioBook Organizer - Landing Page JavaScript

// Import utility functions and modules
import { showSuccess, showError, showInfo } from '../../js/modules/notifications.js';
import appUI from '../../js/modules/appUI.js';

// Landing page state - auth modal removed, using /auth page redirect
let selectedPlan = null;

// DOM elements
const loadingOverlay = document.getElementById('loadingOverlay');
const mobileMenu = document.getElementById('mobileMenu');

// Store the listener functions to be able to remove them later
const authStateChangeListener = (event) => handleAuthStateChange(event.detail);
const outsideClickListener = (event) => handleOutsideClick(event);

// Initialize landing page functionality
function init() {
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
        window.appUI.init().then(() => {
            // Initial check of authentication state
            checkAuthenticationState();
        });
    } else {
        // Fallback if appUI is not ready
        checkAuthenticationState();
    }
    
    // Listen for auth state changes
    window.addEventListener('auth-state-changed', authStateChangeListener);
    
    // Add click outside handler for user dropdown
    document.addEventListener('click', outsideClickListener);
}

function cleanup() {
    console.log('🧹 Cleaning up landing page listeners');
    window.removeEventListener('auth-state-changed', authStateChangeListener);
    document.removeEventListener('click', outsideClickListener);
}

// The router is now responsible for calling init
// // Check if DOM is already loaded, otherwise wait for it
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', init);
// } else {
//     // DOM is already loaded, initialize immediately
//     init();
// }

/**
 * Check authentication state and update navigation accordingly
 */
function checkAuthenticationState() {
    // Rely on the session manager as the single source of truth
    const isAuthenticated = window.sessionManager?.isAuthenticated;
    const user = window.sessionManager?.user;
    
    console.log(`Initial auth check on landing page. Authenticated: ${isAuthenticated}`);

    if (isAuthenticated && user) {
        updateLandingPageForAuthenticatedUser(user);
    } else {
        updateLandingPageForUnauthenticatedUser();
    }
}

/**
 * Handle authentication state changes
 */
function handleAuthStateChange({ isAuthenticated, user }) {
    console.log('Landing page received auth state change:', isAuthenticated);
    
    if (isAuthenticated) {
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
    
    // Create user navigation dropdown
    if (window.appUI && user) {
        window.appUI.createUserNavigation(user);
    } else if (!window.appUI) {
        console.warn('⚠️ appUI not available, cannot create user navigation');
    }
    
    // Convert all primary action buttons to "Open App"
    const getStartedButtons = document.querySelectorAll('a[href="/auth?mode=signup"], .btn-primary.get-started');
    getStartedButtons.forEach(btn => {
        btn.href = '/app';
        btn.innerHTML = '<span class="btn-icon">🚀</span>Open App';
        // Ensure it doesn't get hidden by other rules
        btn.style.display = 'inline-flex'; 
    });
    
    // Hide ALL demo/try buttons when authenticated
    const tryDemoButtons = document.querySelectorAll('[onclick*="tryAppDemo"], [onclick*="tryDemo"], .demo-btn');
    tryDemoButtons.forEach(btn => {
        btn.style.display = 'none';
    });
    
    // Hide the static "Sign In" button (but don't hide user navigation)
    const signInButtons = document.querySelectorAll('a[href="/auth"]:not(.user-btn)');
    signInButtons.forEach(btn => {
        if (!btn.closest('.user-nav') && !btn.closest('.mobile-user-nav')) {
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
    
    // Restore primary action buttons to "Get Started"
    const appButtons = document.querySelectorAll('a[href="/app"]');
    appButtons.forEach(btn => {
        btn.href = '/auth?mode=signup';
        btn.innerHTML = '<span class="btn-icon">🚀</span>Get Started Free';
        btn.style.display = 'inline-flex';
    });
    
    // Show try demo buttons again and ensure correct text/action
    const tryDemoButtons = document.querySelectorAll('.demo-btn');
    tryDemoButtons.forEach(btn => {
        btn.style.display = 'inline-flex';
        btn.innerHTML = '<span class="btn-icon">📚</span>Try Demo Now';
        btn.setAttribute('onclick', 'tryAppDemo()');
    });
    
    // Show auth signup links again
    const signInButtons = document.querySelectorAll('a[href="/auth"]:not(.user-btn)');
    signInButtons.forEach(btn => {
        btn.style.display = 'inline-flex';
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
        // Only try a few times, then give up
        if (!setupAppWindowTilt.retryCount) {
            setupAppWindowTilt.retryCount = 0;
        }
        setupAppWindowTilt.retryCount++;
        
        if (setupAppWindowTilt.retryCount <= 10) {
            console.warn('⚠️ App window element not found for tilt effect (attempt ' + setupAppWindowTilt.retryCount + '/10)');
            setTimeout(() => {
                setupAppWindowTilt();
            }, 100);
        } else {
            console.warn('⚠️ App window element not found after 10 attempts - skipping tilt effect');
        }
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
    init as initLandingPage,
    cleanup as cleanupLandingPage
}; 