// AudioBook Organizer - Landing Page JavaScript

// Import utility functions and modules
import { showSuccess, showError, showInfo } from '../../js/modules/notifications.js';

// Landing page state
let isAuthModalOpen = false;
let currentAuthMode = 'login'; // 'login' or 'signup'
let selectedPlan = null;

// DOM elements
const authModal = document.getElementById('authModal');
const authModalTitle = document.getElementById('authModalTitle');
const authForm = document.getElementById('authForm');
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

function initializeLandingPage() {
    console.log('🚀 Landing page initialized');
    
    // Setup all interactive components
    setupScrollAnimations();
    setupSmoothScrolling();
    setupMobileMenu();
    setupFormValidation();
    setupScrollEffects();
    setupAppWindowTilt();
    
    // Add any other setup functions here
}

// Authentication Modal Functions
function showAuthModal(mode = 'login', plan = null) {
    currentAuthMode = mode;
    selectedPlan = plan;
    
    authModalTitle.textContent = mode === 'login' ? 'Welcome Back' : 'Get Started';
    authModal.classList.add('show');
    isAuthModalOpen = true;
    
    renderAuthForm();
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function hideAuthModal() {
    authModal.classList.remove('show');
    isAuthModalOpen = false;
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Clear form
    authForm.innerHTML = '';
}

function renderAuthForm() {
    const isLogin = currentAuthMode === 'login';
    const planText = selectedPlan ? ` for ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan` : '';
    
    authForm.innerHTML = `
        <form class="auth-form" onsubmit="handleAuthSubmit(event)">
            ${!isLogin ? `
                <div class="form-group">
                    <label for="fullName" class="form-label">Full Name</label>
                    <input 
                        type="text" 
                        id="fullName" 
                        name="fullName" 
                        class="form-input" 
                        placeholder="Enter your full name"
                        required
                    >
                </div>
            ` : ''}
            
            <div class="form-group">
                <label for="email" class="form-label">Email Address</label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    class="form-input" 
                    placeholder="Enter your email address"
                    required
                >
            </div>
            
            <div class="form-group">
                <label for="password" class="form-label">Password</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    class="form-input" 
                    placeholder="Enter your password"
                    required
                    minlength="8"
                >
                <div class="form-hint">
                    ${isLogin ? 'Forgot your password?' : 'At least 8 characters required'}
                </div>
            </div>
            
            ${!isLogin ? `
                <div class="form-group">
                    <label for="confirmPassword" class="form-label">Confirm Password</label>
                    <input 
                        type="password" 
                        id="confirmPassword" 
                        name="confirmPassword" 
                        class="form-input" 
                        placeholder="Confirm your password"
                        required
                        minlength="8"
                    >
                </div>
            ` : ''}
            
            ${selectedPlan ? `
                <div class="plan-info">
                    <div class="plan-badge">Selected Plan: ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}</div>
                </div>
            ` : ''}
            
            <button type="submit" class="btn btn-primary auth-submit-btn" id="authSubmitBtn">
                <span class="btn-text">${isLogin ? 'Sign In' : `Create Account${planText}`}</span>
                <span class="btn-spinner" style="display: none;">
                    <div class="spinner-small"></div>
                </span>
            </button>
            
            <div class="auth-divider">
                <span>or</span>
            </div>
            
            <button type="button" class="btn btn-outline magic-link-btn" onclick="sendMagicLink()">
                <span class="btn-icon">✨</span>
                Sign ${isLogin ? 'in' : 'up'} with Magic Link
            </button>
            
            <div class="auth-footer">
                ${isLogin ? 
                    `Don't have an account? <a href="#" onclick="switchAuthMode('signup')" class="auth-link">Sign up</a>` :
                    `Already have an account? <a href="#" onclick="switchAuthMode('login')" class="auth-link">Sign in</a>`
                }
            </div>
            
            ${!isLogin ? `
                <div class="terms-agreement">
                    <label class="checkbox-label">
                        <input type="checkbox" name="agreeTerms" required>
                        <span class="checkmark"></span>
                        I agree to the <a href="/terms" target="_blank" class="terms-link">Terms of Service</a> 
                        and <a href="/privacy" target="_blank" class="terms-link">Privacy Policy</a>
                    </label>
                </div>
            ` : ''}
        </form>
        
        <style>
            .auth-form {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }
            
            .form-group {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .form-label {
                font-weight: 600;
                color: var(--text-primary);
                font-size: 0.9rem;
            }
            
            .form-input {
                padding: 0.875rem;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 1rem;
                transition: border-color 0.3s ease;
                background: white;
            }
            
            .form-input:focus {
                outline: none;
                border-color: var(--primary-color);
                box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
            }
            
            .form-input:invalid {
                border-color: #ff5252;
            }
            
            .form-hint {
                font-size: 0.8rem;
                color: var(--text-secondary);
            }
            
            .plan-info {
                text-align: center;
                margin: 1rem 0;
            }
            
            .plan-badge {
                background: linear-gradient(135deg, var(--primary-color), #45a049);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-size: 0.9rem;
                font-weight: 600;
                display: inline-block;
            }
            
            .auth-submit-btn {
                width: 100%;
                padding: 1rem;
                font-size: 1.1rem;
                font-weight: 600;
                position: relative;
            }
            
            .btn-spinner {
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
            }
            
            .spinner-small {
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            .auth-divider {
                text-align: center;
                position: relative;
                margin: 1rem 0;
            }
            
            .auth-divider::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 0;
                right: 0;
                height: 1px;
                background: #e0e0e0;
            }
            
            .auth-divider span {
                background: white;
                padding: 0 1rem;
                color: var(--text-secondary);
                font-size: 0.9rem;
            }
            
            .magic-link-btn {
                width: 100%;
                padding: 0.875rem;
                justify-content: center;
            }
            
            .auth-footer {
                text-align: center;
                margin-top: 1rem;
                color: var(--text-secondary);
                font-size: 0.9rem;
            }
            
            .auth-link {
                color: var(--primary-color);
                text-decoration: none;
                font-weight: 600;
            }
            
            .auth-link:hover {
                text-decoration: underline;
            }
            
            .terms-agreement {
                margin-top: 1rem;
            }
            
            .checkbox-label {
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                font-size: 0.9rem;
                color: var(--text-secondary);
                line-height: 1.4;
                cursor: pointer;
            }
            
            .checkbox-label input[type="checkbox"] {
                display: none;
            }
            
            .checkmark {
                width: 18px;
                height: 18px;
                border: 2px solid #e0e0e0;
                border-radius: 4px;
                position: relative;
                flex-shrink: 0;
                transition: all 0.3s ease;
            }
            
            .checkbox-label input[type="checkbox"]:checked + .checkmark {
                background: var(--primary-color);
                border-color: var(--primary-color);
            }
            
            .checkbox-label input[type="checkbox"]:checked + .checkmark::after {
                content: '✓';
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 12px;
                font-weight: bold;
            }
            
            .terms-link {
                color: var(--primary-color);
                text-decoration: none;
            }
            
            .terms-link:hover {
                text-decoration: underline;
            }
        </style>
    `;
}

function switchAuthMode(mode) {
    currentAuthMode = mode;
    authModalTitle.textContent = mode === 'login' ? 'Welcome Back' : 'Get Started';
    renderAuthForm();
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('authSubmitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    
    // Show loading state
    btnText.style.display = 'none';
    btnSpinner.style.display = 'block';
    submitBtn.disabled = true;
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    try {
        // Validate form data
        if (!validateAuthForm(data)) {
            throw new Error('Please check your input and try again');
        }
        
        // Simulate API call (replace with actual Supabase integration later)
        await simulateAuthRequest(data);
        
        showSuccess(`${currentAuthMode === 'login' ? 'Welcome back!' : 'Account created successfully!'}`);
        hideAuthModal();
        
        // Trigger auth state change event and navigate to app
        const authData = {
            isAuthenticated: true,
            user: { 
                email: data.email, 
                name: data.fullName || data.email.split('@')[0] 
            },
            session: { token: 'demo-token-123' }
        };
        
        // Dispatch custom event for the main app to handle
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
            detail: authData
        }));
        
        // Small delay for better UX
        setTimeout(() => {
            showInfo('Loading your AudioBook Organizer...');
        }, 1000);
        
    } catch (error) {
        showError(error.message);
    } finally {
        // Reset button state
        btnText.style.display = 'block';
        btnSpinner.style.display = 'none';
        submitBtn.disabled = false;
    }
}

async function sendMagicLink() {
    const emailInput = document.getElementById('email');
    const email = emailInput?.value;
    
    if (!email || !isValidEmail(email)) {
        showError('Please enter a valid email address');
        emailInput?.focus();
        return;
    }
    
    try {
        showInfo('Sending magic link to your email...');
        
        // Simulate API call (replace with actual Supabase integration later)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        showSuccess('Magic link sent! Check your email and click the link to sign in.');
        hideAuthModal();
        
    } catch (error) {
        showError('Failed to send magic link. Please try again.');
    }
}

function validateAuthForm(data) {
    const { email, password, confirmPassword, fullName } = data;
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return false;
    }
    
    if (password.length < 8) {
        showError('Password must be at least 8 characters long');
        return false;
    }
    
    if (currentAuthMode === 'signup') {
        if (!fullName || fullName.trim().length < 2) {
            showError('Please enter your full name');
            return false;
        }
        
        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return false;
        }
        
        if (!data.agreeTerms) {
            showError('Please agree to the Terms of Service and Privacy Policy');
            return false;
        }
    }
    
    return true;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function simulateAuthRequest(data) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate random failure for demo
    if (Math.random() < 0.1) {
        throw new Error('Authentication failed. Please try again.');
    }
    
    return { success: true, user: { email: data.email } };
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
    if (window.audioBookApp?.isAuthenticated()) {
        // User is authenticated, navigate directly
        window.audioBookApp.navigateToApp();
    } else {
        // Show sign-in modal for unauthenticated users
        showAuthModal('login');
        showInfo('Please sign in to access the full AudioBook Organizer app.');
    }
}

function tryAppDemo() {
    // Allow demo access without authentication
    const demoAuthData = {
        isAuthenticated: true,
        user: { 
            email: 'demo@audiobook.com', 
            name: 'Demo User' 
        },
        session: { token: 'demo-session', isDemo: true }
    };
    
    // Set authentication status in router to bypass auth guards
    if (window.router) {
        window.router.setAuthenticated(true);
    }
    
    // Dispatch auth event for app state
    window.dispatchEvent(new CustomEvent('auth-state-changed', {
        detail: demoAuthData
    }));
    
    // Navigate to the app page
    if (window.navigation) {
        window.navigation.toApp();
    } else if (window.router) {
        window.router.navigate('/app');
    } else {
        // Fallback: direct navigation
        window.location.href = '/app';
    }
    
    console.log('🚀 Navigating to demo app...');
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
            if (typeof isAuthModalOpen !== 'undefined' && isAuthModalOpen) {
                hideAuthModal();
            }
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

// Make functions globally available
window.rotateCarousel = undefined;
window.goToSlide = undefined;

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

// Make functions globally available for HTML onclick handlers
window.showAuthModal = showAuthModal;
window.hideAuthModal = hideAuthModal;
window.switchAuthMode = switchAuthMode;
window.handleAuthSubmit = handleAuthSubmit;
window.sendMagicLink = sendMagicLink;
window.toggleMobileMenu = toggleMobileMenu;
window.scrollToDemo = scrollToDemo;
window.playDemo = playDemo;
window.contactSales = contactSales;
window.navigateToApp = navigateToApp;
window.tryAppDemo = tryAppDemo;

// Export for module use
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
        
        // Continue animation if still hovering
        if (isHovering) {
            animationId = requestAnimationFrame(animate);
        }
    }
    
    appWindow.addEventListener('mouseenter', () => {
        isHovering = true;
        // Remove CSS transition for smooth RAF animation
        appWindow.style.transition = 'none';
        // Start the animation loop
        animationId = requestAnimationFrame(animate);
    });
    
    appWindow.addEventListener('mouseleave', () => {
        isHovering = false;
        
        // Cancel animation frame
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        // Return to original position with smooth CSS transition
        appWindow.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        appWindow.style.transform = 'translate3d(0, 0, 0) rotateY(-15deg) rotateX(10deg) scale3d(1, 1, 1)';
        
        // Reset targets to base values
        targetRotateX = 10;
        targetRotateY = -15;
        currentRotateX = 10;
        currentRotateY = -15;
    });
    
    // Throttle mousemove for better performance
    let lastTime = 0;
    appWindow.addEventListener('mousemove', (e) => {
        if (!isHovering) return;
        
        // Throttle to ~60fps
        const now = performance.now();
        if (now - lastTime < 16) return; // ~60fps = 16.67ms
        lastTime = now;
        
        const rect = appWindow.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate mouse position relative to center
        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;
        
        // Convert to percentages (-1 to 1)
        const rotateX = (mouseY / (rect.height / 2)) * -1;
        const rotateY = (mouseX / (rect.width / 2));
        
        // Limit rotation angles for natural effect
        const maxRotation = 12; // Reduced for more subtle effect
        const finalRotateX = Math.max(-maxRotation, Math.min(maxRotation, rotateX * maxRotation));
        const finalRotateY = Math.max(-maxRotation, Math.min(maxRotation, rotateY * maxRotation));
        
        // Update target values (will be smoothly animated to)
        const baseRotateY = -15; // Original Y rotation
        const baseRotateX = 10;   // Original X rotation
        
        targetRotateX = baseRotateX + finalRotateX;
        targetRotateY = baseRotateY + finalRotateY;
    });
    
    console.log('✨ App window tilt effect initialized with smooth animation');
}

export {
    showAuthModal,
    hideAuthModal,
    switchAuthMode,
    handleAuthSubmit,
    sendMagicLink,
    toggleMobileMenu,
    scrollToDemo,
    playDemo,
    contactSales,
    navigateToApp,
    tryAppDemo
}; 