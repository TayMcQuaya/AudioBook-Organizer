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
    
    
    // Normal landing page initialization
    setupScrollAnimations();
    setupSmoothScrolling();
    setupMobileMenu();
    setupFormValidation();
    setupScrollEffects();
    setupAppWindowTilt();
    setupBrandNavigation();
    
    // Fetch and update pricing dynamically
    fetchAndUpdatePricing();
    
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
    
    // Add navigation handler for footer links
    document.addEventListener('click', handleNavigationClick);
    
    // Handle hash navigation on page load
    handleHashNavigation();
    
    // Check for account deletion success notification
    checkAccountDeletionSuccess();
}

/**
 * Handle navigation clicks for SPA routing
 */
function handleNavigationClick(event) {
    const target = event.target.closest('[data-action="navigate"]');
    if (!target) return;
    
    event.preventDefault();
    const route = target.dataset.route;
    
    // If navigating to home from legal pages, scroll to top for better UX
    if (route === '/' && (
        window.location.pathname === '/privacy' || 
        window.location.pathname === '/terms' || 
        window.location.pathname === '/contact'
    )) {
        // Navigate first, then scroll will be handled by router
        if (window.router) {
            window.router.navigate(route);
        } else {
            window.location.href = route;
        }
        return;
    }
    
    if (window.router) {
        window.router.navigate(route);
    } else {
        // Fallback to direct navigation if router not available
        window.location.href = route;
    }
}

/**
 * Fetch pricing from API and update the page
 */
async function fetchAndUpdatePricing() {
    try {
        // Get the backend URL
        const backendUrl = window.appConfig?.backendUrl || '';
        const response = await fetch(`${backendUrl}/api/stripe/public/pricing`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch pricing');
        }
        
        const data = await response.json();
        
        if (data.success && data.packages) {
            // Update each price element
            data.packages.forEach(pkg => {
                const priceElement = document.querySelector(`[data-package="${pkg.id}"]`);
                if (priceElement) {
                    priceElement.textContent = pkg.price_display;
                }
            });
            
            // Store pricing in localStorage for offline use
            localStorage.setItem('cached_pricing', JSON.stringify({
                timestamp: Date.now(),
                packages: data.packages
            }));
        }
    } catch (error) {
        console.error('Failed to fetch pricing:', error);
        
        // Try to use cached pricing if available
        const cached = localStorage.getItem('cached_pricing');
        if (cached) {
            try {
                const { packages } = JSON.parse(cached);
                packages.forEach(pkg => {
                    const priceElement = document.querySelector(`[data-package="${pkg.id}"]`);
                    if (priceElement) {
                        priceElement.textContent = pkg.price_display;
                    }
                });
            } catch (e) {
                console.error('Failed to use cached pricing:', e);
            }
        }
        
        // Prices will fall back to hardcoded values in HTML
    }
}

/**
 * Handle hash navigation to scroll to specific sections
 */
function handleHashNavigation() {
    const hash = window.location.hash;
    if (hash) {
        // Small delay to ensure page is fully loaded
        setTimeout(() => {
            const target = document.querySelector(hash);
            if (target) {
                console.log(`📍 Scrolling to section: ${hash}`);
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, 300);
    }
}

/**
 * Check for account deletion success notification
 */
function checkAccountDeletionSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const deleted = urlParams.get('deleted');
    
    if (deleted === 'true') {
        console.log('✅ Account deletion success detected');
        
        // Show success notification
        setTimeout(() => {
            showSuccess('Your account has been successfully deleted. Thank you for using AudioBook Organizer!', 8000);
        }, 1000); // Small delay to ensure page is fully loaded
        
        // Remove the query parameter from the URL to prevent showing the notification again
        if (window.history && window.history.replaceState) {
            const newUrl = window.location.origin + window.location.pathname;
            window.history.replaceState(null, null, newUrl);
        }
    }
}

function cleanup() {
    console.log('🧹 Cleaning up landing page listeners');
    window.removeEventListener('auth-state-changed', authStateChangeListener);
    document.removeEventListener('click', outsideClickListener);
    document.removeEventListener('click', handleNavigationClick);
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
    // Check both session manager and auth module for authentication state
    const sessionAuth = window.sessionManager?.isAuthenticated;
    const authModuleAuth = window.authModule?.isAuthenticated?.();
    const isAuthenticated = sessionAuth || authModuleAuth;
    
    const user = window.sessionManager?.user || window.authModule?.getCurrentUser?.();
    
    // Initial auth check performed silently

    if (isAuthenticated && user) {
        updateLandingPageForAuthenticatedUser(user);
    } else {
        // Try to refresh auth state from stored tokens
        if (window.authModule?.checkAuthStatus) {
            window.authModule.checkAuthStatus().then(authStatus => {
                if (authStatus.authenticated) {
                    console.log('✅ Auth state recovered from stored tokens');
                    updateLandingPageForAuthenticatedUser(authStatus.user);
                } else {
                    updateLandingPageForUnauthenticatedUser();
                }
            }).catch(() => {
                updateLandingPageForUnauthenticatedUser();
            });
        } else {
            updateLandingPageForUnauthenticatedUser();
        }
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
    // **SECURITY FIX: Removed email logging to prevent privacy exposure**
    console.log('🔄 Updating landing page for authenticated user');
    
    // Check if user navigation already exists to prevent unnecessary recreation
    const existingUserNav = document.querySelector('.user-navigation');
    const existingCredits = document.getElementById('creditsDisplay');
    
    if (existingUserNav && existingCredits) {
        console.log('✅ User navigation and credits already present, skipping recreation');
        return;
    }
    
    // Create user navigation dropdown and initialize credits in the right order
    if (window.appUI && user) {
        // First initialize credit display to ensure it's positioned correctly
        import('../../js/modules/appUI.js').then(module => {
            if (!existingCredits) {
                module.initializeCreditsDisplay();
                console.log('💎 Credit display initialized for authenticated user on landing page');
            }
            
            // Then create user navigation, which will position itself relative to credits
            if (!existingUserNav) {
                window.appUI.createUserNavigation(user);
                console.log('👤 User navigation created after credits display');
            }
        }).catch(error => {
            console.error('Failed to initialize credit display:', error);
            // Fallback: create user navigation anyway if not already present
            if (!existingUserNav && window.appUI) {
                window.appUI.createUserNavigation(user);
            }
        });
    } else if (!window.appUI) {
        console.warn('⚠️ appUI not available, cannot create user navigation');
    }
    
    // Convert all primary action buttons to "Open App"
    const getStartedButtons = document.querySelectorAll('a[href="/auth?mode=signup"], .btn-primary.get-started');
    getStartedButtons.forEach(btn => {
        // Remove href to prevent direct navigation and use click handler instead
        btn.removeAttribute('href');
        btn.innerHTML = '<span class="btn-icon">🚀</span>Open App';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToApp();
        });
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
    
    // Remove credit display for unauthenticated users
    const creditsDisplay = document.getElementById('creditsDisplay');
    if (creditsDisplay) {
        creditsDisplay.remove();
        console.log('💎 Credit display removed for unauthenticated user');
    }
    
    // Find all buttons that were converted to "Open App"
    const convertedButtons = document.querySelectorAll('.btn-primary.get-started, a.btn-primary[href="/auth?mode=signup"]');
    convertedButtons.forEach(btn => {
        // Remove any click listeners that were added
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        // Restore the original attributes and content
        if (newBtn.classList.contains('btn-large')) {
            // This is the hero button
            newBtn.href = '/auth?mode=signup';
            newBtn.innerHTML = '<span class="btn-icon">🚀</span>Get Started Free';
            newBtn.style.cursor = 'pointer';
            newBtn.style.display = 'inline-flex';
        }
    });
    
    // Also check for any buttons that had href removed and were using click handlers
    const openAppButtons = Array.from(document.querySelectorAll('.btn-primary')).filter(btn => 
        btn.innerHTML.includes('Open App')
    );
    openAppButtons.forEach(btn => {
        // Create a new anchor element to replace the button
        const link = document.createElement('a');
        link.href = '/auth?mode=signup';
        link.className = btn.className;
        link.innerHTML = '<span class="btn-icon">🚀</span>Get Started Free';
        link.style.display = 'inline-flex';
        btn.parentNode.replaceChild(link, btn);
    });
    
    // Show try demo buttons again and ensure correct text/action
    const tryDemoButtons = document.querySelectorAll('.btn-secondary.btn-large');
    tryDemoButtons.forEach(btn => {
        if (btn.innerHTML.includes('Demo')) {
            btn.style.display = 'inline-flex';
            btn.innerHTML = '<span class="btn-icon">📚</span>Try Demo Now';
            btn.setAttribute('onclick', 'tryAppDemo()');
        }
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
async function navigateToApp() {
    try {
        // Ensure router is available before navigation
        if (!window.router) {
            console.log('🔧 Router not found, initializing...');
            const { router } = await import('/js/modules/router.js');
            window.router = router;
            await router.init();
        }
        
        // Check if user is already authenticated (check both sessionManager and authModule)
        const sessionAuth = window.sessionManager?.isAuthenticated;
        const authModuleAuth = window.authModule?.isAuthenticated?.();
        const isAuthenticated = sessionAuth || authModuleAuth;
        
        console.log(`🔍 Navigation auth check: SessionManager: ${sessionAuth}, AuthModule: ${authModuleAuth}, Final: ${isAuthenticated}`);
        
        if (isAuthenticated) {
            // User is authenticated, navigate to app via router
            console.log('🚀 Navigating authenticated user to app via router...');
            await window.router.navigate('/app');
        } else {
            // Redirect to auth page
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            console.log('🔐 Redirecting to auth page...');
            await window.router.navigate(`/auth?return=${returnUrl}&mode=login`);
        }
    } catch (error) {
        console.error('❌ Navigation failed, using fallback:', error);
        // Only fall back to window.location as last resort
        const fallbackSessionAuth = window.sessionManager?.isAuthenticated;
        const fallbackAuthModuleAuth = window.authModule?.isAuthenticated?.();
        const fallbackIsAuthenticated = fallbackSessionAuth || fallbackAuthModuleAuth;
        
        if (fallbackIsAuthenticated) {
            window.location.href = '/app';
        } else {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/auth?return=${returnUrl}&mode=login`;
        }
    }
}

async function tryAppDemo() {
    try {
        // Ensure router is available before navigation
        if (!window.router) {
            console.log('🔧 Router not found, initializing...');
            const { router } = await import('/js/modules/router.js');
            window.router = router;
            await router.init();
        }
        
        // Check if user is authenticated (check both sessionManager and authModule)
        const sessionAuth = window.sessionManager?.isAuthenticated;
        const authModuleAuth = window.authModule?.isAuthenticated?.();
        const isAuthenticated = sessionAuth || authModuleAuth;
        
        console.log(`🔍 Demo auth check: SessionManager: ${sessionAuth}, AuthModule: ${authModuleAuth}, Final: ${isAuthenticated}`);
        
        if (isAuthenticated) {
            // User is authenticated, navigate to app
            console.log('🚀 Navigating authenticated user to app via router...');
            await window.router.navigate('/app');
        } else {
            // Redirect to auth page with return URL for better UX
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            console.log('🔐 Redirecting to auth page for demo access...');
            await window.router.navigate(`/auth?return=${returnUrl}&mode=signup`);
        }
    } catch (error) {
        console.error('❌ Demo navigation failed, using fallback:', error);
        // Only fall back to window.location as last resort
        const fallbackSessionAuth = window.sessionManager?.isAuthenticated;
        const fallbackAuthModuleAuth = window.authModule?.isAuthenticated?.();
        const fallbackIsAuthenticated = fallbackSessionAuth || fallbackAuthModuleAuth;
        
        if (fallbackIsAuthenticated) {
            window.location.href = '/app';
        } else {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/auth?return=${returnUrl}&mode=signup`;
        }
    }
}

// Setup Functions
function setupBrandNavigation() {
    // Add click handler to brand/logo for authenticated users
    const brandElement = document.querySelector('.nav-brand, .footer-brand');
    if (brandElement) {
        brandElement.style.cursor = 'pointer';
        brandElement.addEventListener('click', async (e) => {
            e.preventDefault();
            // Only navigate to app if user is authenticated
            if (window.sessionManager?.isAuthenticated || window.authModule?.isAuthenticated?.()) {
                console.log('🏠 Brand clicked - navigating to app...');
                await navigateToApp();
            } else {
                console.log('🏠 Brand clicked - redirecting to home page...');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
}

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
    const navLinks = document.querySelectorAll('.nav-link, .mobile-link, .footer-link');
    
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

/**
 * Direct credit purchase using Stripe (same as credit module)
 */
async function navigateToCredits(packageType = null) {
    console.log(`🛒 User clicked to purchase credits: ${packageType || 'unspecified'}`);
    
    try {
        // Check if user is authenticated first
        const sessionAuth = window.sessionManager?.isAuthenticated;
        const authModuleAuth = window.authModule?.isAuthenticated?.();
        const isAuthenticated = sessionAuth || authModuleAuth;
        
        if (!isAuthenticated) {
            console.log('🔒 User not authenticated, redirecting to signup');
            // Redirect to auth page with signup mode
            window.location.href = '/auth?mode=signup&from=pricing';
            return;
        }
        
        // User is authenticated, directly trigger Stripe payment
        console.log('✅ User authenticated, triggering direct Stripe payment');
        
        // Don't show loading overlay - Stripe will show its own loading state
        // if (loadingOverlay) {
        //     loadingOverlay.style.display = 'flex';
        // }
        
                // Import and initialize Stripe service
        const { default: stripeService } = await import('/js/modules/stripe.js');
        await stripeService.init();
        
        // Directly call Stripe purchase (same as credit module)
        const result = await stripeService.purchaseCredits(packageType);
        
        // No need to hide loading overlay since we're not showing it
        // if (loadingOverlay) {
        //     loadingOverlay.style.display = 'none';
        // }
        
        if (!result.success) {
            // **SECURITY FIX: Removed result.error to prevent API details exposure**
        console.error('❌ Purchase failed');
            // Show error notification
            showError(result.error || 'Payment failed. Please try again.');
        }
        // Note: If successful, Stripe will redirect to payment page, then back to success page
        
    } catch (error) {
        console.error('❌ Error processing payment:', error);
        
        // No need to hide loading since we're not showing it
        // if (loadingOverlay) {
        //     loadingOverlay.style.display = 'none';
        // }
        
        // Show error message
        showError('Payment system error. Please try again.');
    }
}

/**
 * Navigate to contact page with pre-selected subject
 */
function navigateToContact(reason = 'enterprise') {
    console.log(`📞 Navigating to contact page with subject: ${reason}`);
    window.location.href = `/contact?subject=${reason}`;
}

// Make functions globally available for HTML onclick handlers
window.toggleMobileMenu = toggleMobileMenu;
window.scrollToDemo = scrollToDemo;
window.playDemo = playDemo;
window.contactSales = contactSales;
window.navigateToApp = navigateToApp;
window.tryAppDemo = tryAppDemo;
window.navigateToCredits = navigateToCredits;
window.navigateToContact = navigateToContact;
window.handleHashNavigation = handleHashNavigation;

// Export for module use
export {
    init as initLandingPage,
    cleanup as cleanupLandingPage
}; 