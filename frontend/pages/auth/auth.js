/**
 * Authentication Page JavaScript
 * Handles login, signup, and password reset functionality
 */

// Import the reCAPTCHA service and notifications
import { recaptcha } from '../../js/modules/recaptcha.js';
import { showInfo, showError, showSuccess } from '../../js/modules/notifications.js';

// This script now works with the main AuthModule
let authModule = null;

// Page state
let currentForm = 'login'; // 'login', 'signup', 'forgot'
let isLoading = false;

// DOM elements
const elements = {
    // Cards
    loginCard: null,
    signupCard: null,
    forgotPasswordCard: null,
    successCard: null,
    
    // Forms
    loginForm: null,
    signupForm: null,
    forgotPasswordForm: null,
    
    // Buttons
    showSignupBtn: null,
    showLoginBtn: null,
    forgotPasswordBtn: null,
    backToLoginBtn: null,
    
    // Loading
    loadingOverlay: null
};

// To hold a reference to the bound auth state change handler
let authStateChangeHandler = null;

/**
 * Initialize the authentication page
 * @param {object} auth - The authentication module instance
 */
export async function initAuthPage(auth) {
    console.log('🔐 Initializing authentication page...');
    authModule = auth;

    try {
        // Initialize auth module
        if (authModule && typeof authModule.init === 'function') {
            await authModule.init();
        } else {
            console.error('Auth module not provided or init function is missing');
            return;
        }

        // Initialize reCAPTCHA service
        console.log('🔐 Initializing reCAPTCHA service...');
        await recaptcha.init();

        // Check if this is a Google OAuth callback
        const params = new URLSearchParams(window.location.search);
        if (params.get('from') === 'google') {
            console.log('📱 Detected Google OAuth callback');
            showInfo('Completing Google sign-in...');
            
            // Wait for Supabase to process the OAuth session
            let attempts = 0;
            const maxAttempts = 30; // 15 seconds max wait
            
            const waitForOAuthSession = async () => {
                while (attempts < maxAttempts) {
                    if (authModule.isAuthenticated()) {
                        console.log('✅ Google OAuth session established');
                        showSuccess('Google sign-in successful! Redirecting...');
                        
                        // Navigate to app after successful OAuth
                        setTimeout(() => {
                            if (window.router) {
                                window.router.navigate('/app');
                            } else {
                                window.location.href = '/app';
                            }
                        }, 1000);
                        return;
                    }
                    
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                // If we get here, OAuth failed
                console.error('❌ Google OAuth session not established after waiting');
                showError('Google sign-in failed. Please try again.');
                switchForm('login');
            };
            
            // Start waiting for OAuth session
            waitForOAuthSession();
            return;
        }

        // Check if user is already authenticated
        if (authModule.isAuthenticated && authModule.isAuthenticated()) {
            console.log('User already authenticated, redirecting to app...');
            const returnUrl = params.get('return') || '/app';
            window.location.href = returnUrl;
            return;
        }
        
        // Get DOM elements
        getDOMElements();
        
        // Set up event listeners
        setupEventListeners();
        
        // Set up form validation
        setupFormValidation();
        
        // Show initial form based on URL parameters
        handleInitialRoute();
        
        console.log('✅ Authentication page initialized');
        
    } catch (error) {
        console.error('❌ Failed to initialize auth page:', error);
    }
}

/**
 * Get all DOM elements
 */
function getDOMElements() {
    console.log('🔍 Getting DOM elements...');
    
    // Cards
    elements.loginCard = document.getElementById('loginCard');
    elements.signupCard = document.getElementById('signupCard');
    elements.forgotPasswordCard = document.getElementById('forgotPasswordCard');
    elements.successCard = document.getElementById('successCard');
    
    // Forms
    elements.loginForm = document.getElementById('loginForm');
    elements.signupForm = document.getElementById('signupForm');
    elements.forgotPasswordForm = document.getElementById('forgotPasswordForm');
    
    // Buttons
    elements.showSignupBtn = document.getElementById('showSignupBtn');
    elements.showLoginBtn = document.getElementById('showLoginBtn');
    elements.forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    elements.backToLoginBtn = document.getElementById('backToLoginBtn');
    
    // Loading
    elements.loadingOverlay = document.getElementById('authLoadingOverlay');
    
    // Debug: Check if critical elements were found
    const criticalElements = [
        'loginCard', 'signupCard', 'loginForm', 'signupForm', 
        'showSignupBtn', 'showLoginBtn', 'loadingOverlay'
    ];
    
    criticalElements.forEach(elementName => {
        if (!elements[elementName]) {
            console.error(`❌ Critical element not found: ${elementName}`);
        } else {
            console.log(`✅ Found element: ${elementName}`);
        }
    });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    console.log('🎯 Setting up event listeners...');
    
    // Form switching using event delegation for robustness
    const authContainer = document.querySelector('.auth-container');
    if (authContainer) {
        console.log('✅ Auth container found, setting up button event delegation');
        authContainer.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            let actionHandled = false;
            switch (button.id) {
                case 'showSignupBtn':
                    console.log('📝 Switching to signup form');
                    switchForm('signup');
                    actionHandled = true;
                    break;
                case 'showLoginBtn':
                case 'backToLoginBtn':
                    console.log('🔐 Switching to login form');
                    switchForm('login');
                    actionHandled = true;
                    break;
                case 'forgotPasswordBtn':
                    console.log('🔑 Switching to forgot password form');
                    switchForm('forgot');
                    actionHandled = true;
                    break;
            }
            if(actionHandled) {
                e.preventDefault();
            }
        });
    } else {
        console.error('❌ Auth container not found!');
    }
    
    // Form submissions (these are reliable as they are on form elements)
    if (elements.loginForm) {
        console.log('✅ Adding login form submit listener');
        elements.loginForm.addEventListener('submit', handleLoginSubmit);
    } else {
        console.error('❌ Login form not found!');
    }
    
    if (elements.signupForm) {
        console.log('✅ Adding signup form submit listener');
        elements.signupForm.addEventListener('submit', handleSignupSubmit);
    } else {
        console.error('❌ Signup form not found!');
    }
    
    if (elements.forgotPasswordForm) {
        console.log('✅ Adding forgot password form submit listener');
        elements.forgotPasswordForm.addEventListener('submit', handleForgotPasswordSubmit);
    } else {
        console.error('❌ Forgot password form not found!');
    }
    
    // Password toggles
    setupPasswordToggles();
    
    // Password strength checker
    setupPasswordStrength();
    
    // Social auth buttons
    setupSocialAuth();
    
    // Auth state listener (optional)
    if (authModule && typeof authModule.addAuthListener === 'function') {
        console.log('✅ Adding auth state listener');
        authStateChangeHandler = (event, session) => handleAuthStateChange(event, session);
        authModule.addAuthListener(authStateChangeHandler);
    } else {
        console.warn('⚠️ Auth module not available or addAuthListener not found');
    }
}

/**
 * Set up password toggle functionality
 */
function setupPasswordToggles() {
    const toggles = document.querySelectorAll('.password-toggle');
    
    toggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const input = toggle.parentElement.querySelector('.form-input');
            const icon = toggle.querySelector('.toggle-icon');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.textContent = '🙈';
            } else {
                input.type = 'password';
                icon.textContent = '👁️';
            }
        });
    });
}

/**
 * Set up password strength checker
 */
function setupPasswordStrength() {
    const passwordInput = document.getElementById('signupPassword');
    const strengthIndicator = document.getElementById('passwordStrength');
    
    if (passwordInput && strengthIndicator) {
        passwordInput.addEventListener('input', (e) => {
            const password = e.target.value;
            const strength = calculatePasswordStrength(password);
            updatePasswordStrength(strengthIndicator, strength);
        });
    }
}

/**
 * Calculate password strength
 */
function calculatePasswordStrength(password) {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 1) {
        return { level: 'weak', text: 'Weak' };
    } else if (score <= 2) {
        return { level: 'fair', text: 'Fair' };
    } else if (score <= 3) {
        return { level: 'good', text: 'Good' };
    } else {
        return { level: 'strong', text: 'Strong' };
    }
}

/**
 * Update password strength indicator
 */
function updatePasswordStrength(indicator, strength) {
    const fill = indicator.querySelector('.strength-fill');
    const text = indicator.querySelector('.strength-text');
    
    fill.className = `strength-fill ${strength.level}`;
    fill.style.width = `${(strength.score / 5) * 100}%`;
    text.textContent = strength.text;
}

/**
 * Set up social authentication
 */
function setupSocialAuth() {
    console.log('🌐 Setting up social auth buttons...');
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const googleSignUpBtn = document.getElementById('googleSignUpBtn');
    
    const handleGoogleAuth = async (action) => {
        console.log(`🔍 Google ${action} button clicked`);
        
        if (!authModule) {
            console.error('❌ Auth module not available');
            showError('Authentication system not ready. Please refresh the page.');
            return;
        }

        if (isLoading) {
            console.log('⏳ Already loading, ignoring Google auth request');
            return;
        }

        setLoading(true);

        try {
            console.log(`🔐 Starting Google ${action}...`);
            const result = await authModule.signInWithGoogle();
            
            if (result.success) {
                console.log(`✅ Google ${action} initiated successfully`);
                // The redirect will handle the rest
                showInfo('Redirecting to Google...');
            } else {
                throw new Error(result.error || `Google ${action} failed`);
            }
        } catch (error) {
            console.error(`❌ Google ${action} failed:`, error);
            showError(error.message || `Google ${action} failed. Please try again.`);
        } finally {
            setLoading(false);
        }
    };
    
    if (googleSignInBtn) {
        console.log('✅ Google Sign In button found');
        googleSignInBtn.addEventListener('click', () => handleGoogleAuth('sign in'));
    } else {
        console.warn('⚠️ Google Sign In button not found');
    }
    
    if (googleSignUpBtn) {
        console.log('✅ Google Sign Up button found');
        googleSignUpBtn.addEventListener('click', () => handleGoogleAuth('sign up'));
    } else {
        console.warn('⚠️ Google Sign Up button not found');
    }
}

/**
 * Setup form validation logic
 */
function setupFormValidation() {
    // This function can be expanded with real-time validation if needed
}

/**
 * Handle login form submission
 */
async function handleLoginSubmit(e) {
    console.log('🔐 Login form submitted');
    e.preventDefault();
    if (isLoading) {
        console.log('⏳ Already loading, ignoring submission');
        return;
    }

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const recaptchaTokenField = document.getElementById('loginRecaptchaToken');
    
    if (!emailInput || !passwordInput) {
        console.error('❌ Login form inputs not found');
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    console.log(`📧 Email: ${email}`);
    console.log(`🔒 Password length: ${password.length}`);

    if (!validateLoginForm(email, password)) {
        console.log('❌ Form validation failed');
        return;
    }

    if (!authModule) {
        console.error('❌ Auth module not available');
        alert('Authentication system not ready. Please refresh the page.');
        return;
    }

    setLoading(true);

    try {
        // Generate reCAPTCHA token just before submission
        console.log('🔐 Generating reCAPTCHA token...');
        const recaptchaToken = await recaptcha.getLoginToken();
        console.log('✅ reCAPTCHA token generated');

        const result = await authModule.signIn(email, password, recaptchaToken);

        if (result.success) {
            console.log('✅ Sign in successful');
            // The onAuthStateChange listener in auth.js will handle the rest,
            // including navigation. No need to call handleAuthSuccess directly.
        } else {
            // showError is called inside signIn, so just log here
            console.error('Sign in failed from form handler:', result.error);
        }
    } catch (error) {
        console.error('❌ Sign in failed:', error);
        const errorMessage = error.message || 'An unexpected error occurred.';
        
        if (errorMessage.includes('Invalid login credentials')) {
            showFieldError(emailInput, 'Invalid email or password.');
        } else if (errorMessage.includes('Email not confirmed')) {
            showFieldError(emailInput, 'Please confirm your email before signing in.');
        } else if (errorMessage.includes('reCAPTCHA')) {
            showFieldError(emailInput, 'Security check failed. Please try again.');
        } else {
            showFieldError(emailInput, 'An unknown error occurred during sign in.');
        }
    } finally {
        setLoading(false);
    }
}

/**
 * Handle signup form submission
 */
async function handleSignupSubmit(e) {
    e.preventDefault();
    if (isLoading) return;

    const fullNameInput = document.getElementById('signupFullName');
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const agreeTermsInput = document.getElementById('agreeTerms');
    const recaptchaTokenField = document.getElementById('signupRecaptchaToken');

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const agreeTerms = agreeTermsInput.checked;

    if (!validateSignupForm(fullName, email, password, confirmPassword, agreeTerms)) {
        return;
    }

    if (!authModule) {
        console.error('❌ Auth module not available');
        alert('Authentication system not ready. Please refresh the page.');
        return;
    }

    setLoading(true);

    try {
        // Generate reCAPTCHA token
        console.log('🔐 Generating reCAPTCHA token for signup...');
        const recaptchaToken = await recaptcha.getSignupToken();
        
        if (recaptchaTokenField) {
            recaptchaTokenField.value = recaptchaToken;
        }
        
        console.log('✅ reCAPTCHA token generated for signup');

        // Create signup data with reCAPTCHA token
        const signupData = {
            email: email,
            password: password,
            full_name: fullName,
            recaptcha_token: recaptchaToken
        };

        // Make the signup request to backend API
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(signupData)
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ Sign up successful');
            
            if (result.session && result.user) {
                // User is immediately signed in
                window.dispatchEvent(new CustomEvent('auth-state-changed', {
                    detail: {
                        isAuthenticated: true,
                        user: result.user,
                        session: result.session
                    }
                }));
                
                // Navigate to app
                if (window.router) {
                    window.router.navigate('/app');
                } else {
                    window.location.href = '/app';
                }
            } else {
                // Email confirmation required - show success card
                switchForm('success');
            }
        } else {
            throw new Error(result.message || 'Signup failed');
        }
        
    } catch (error) {
        console.error('❌ Sign up failed:', error);
        
        // Show user-friendly error messages
        const errorMessage = error.message || 'Sign up failed';
        
        if (errorMessage.includes('reCAPTCHA')) {
            showFieldError(emailInput, 'Security verification failed. Please try again.');
        } else if (errorMessage.includes('Rate limit')) {
            showFieldError(emailInput, 'Too many signup attempts. Please wait before trying again.');
        } else if (errorMessage.includes('email already exists') || errorMessage.includes('already registered')) {
            showFieldError(emailInput, 'An account with this email already exists. Please try signing in instead.');
        } else if (errorMessage.includes('not configured') || errorMessage.includes('not available')) {
            showFieldError(emailInput, 'Demo mode: Authentication service not configured. Please check console for setup instructions.');
        } else {
            showFieldError(emailInput, errorMessage);
        }
    } finally {
        setLoading(false);
    }
}

/**
 * Handle forgot password form submission
 */
async function handleForgotPasswordSubmit(e) {
    e.preventDefault();
    if (isLoading) return;

    const emailInput = document.getElementById('resetEmail');
    const recaptchaTokenField = document.getElementById('forgotRecaptchaToken');
    const email = emailInput.value.trim();

    if (!isValidEmail(email)) {
        showFieldError(emailInput, 'Please enter a valid email address.');
        return;
    } else {
        clearFieldError(emailInput);
    }

    setLoading(true);

    try {
        // Generate reCAPTCHA token
        console.log('🔐 Generating reCAPTCHA token for password reset...');
        const recaptchaToken = await recaptcha.getForgotPasswordToken();
        
        if (recaptchaTokenField) {
            recaptchaTokenField.value = recaptchaToken;
        }
        
        console.log('✅ reCAPTCHA token generated for password reset');

        await authModule.resetPassword(email);
        // Let the auth module show the success message
    } catch (error) {
        console.error('❌ Password reset failed:', error);
        
        // Show user-friendly error messages
        const errorMessage = error.message || 'Password reset failed';
        
        if (errorMessage.includes('reCAPTCHA')) {
            showFieldError(emailInput, 'Security verification failed. Please try again.');
        } else if (errorMessage.includes('Rate limit')) {
            showFieldError(emailInput, 'Too many reset attempts. Please wait before trying again.');
        } else {
            showFieldError(emailInput, errorMessage);
        }
    } finally {
        setLoading(false);
    }
}

/**
 * Validate the login form
 */
function validateLoginForm(email, password) {
    let isValid = true;
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');

    if (!isValidEmail(email)) {
        showFieldError(emailInput, 'Please enter a valid email address.');
        isValid = false;
    } else {
        clearFieldError(emailInput);
    }

    if (!password) {
        showFieldError(passwordInput, 'Password is required.');
        isValid = false;
    } else {
        clearFieldError(passwordInput);
    }

    return isValid;
}

/**
 * Validate the signup form
 */
function validateSignupForm(fullName, email, password, confirmPassword, agreeTerms) {
    let isValid = true;
    const fullNameInput = document.getElementById('signupFullName');
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const agreeTermsInput = document.getElementById('agreeTerms');

    if (!fullName) {
        showFieldError(fullNameInput, 'Full name is required.');
        isValid = false;
    } else {
        clearFieldError(fullNameInput);
    }

    if (!isValidEmail(email)) {
        showFieldError(emailInput, 'Please enter a valid email address.');
        isValid = false;
    } else {
        clearFieldError(emailInput);
    }

    if (password.length < 8) {
        showFieldError(passwordInput, 'Password must be at least 8 characters long.');
        isValid = false;
    } else {
        clearFieldError(passwordInput);
    }

    if (password !== confirmPassword) {
        showFieldError(confirmPasswordInput, 'Passwords do not match.');
        isValid = false;
    } else {
        clearFieldError(confirmPasswordInput);
    }

    if (!agreeTerms) {
        showFieldError(agreeTermsInput.parentElement, 'You must agree to the terms.');
        isValid = false;
    } else {
        clearFieldError(agreeTermsInput.parentElement);
    }

    return isValid;
}

/**
 * Check if email is valid
 */
function isValidEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

/**
 * Show a field validation error
 */
function showFieldError(input, message) {
    const formGroup = input.closest('.form-group');
    if (formGroup) {
        const errorDiv = formGroup.querySelector('.form-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
        input.classList.add('is-invalid');
    }
}

/**
 * Clear a field validation error
 */
function clearFieldError(input) {
    const formGroup = input.closest('.form-group');
    if (formGroup) {
        const errorDiv = formGroup.querySelector('.form-error');
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
        }
        input.classList.remove('is-invalid');
    }
}

/**
 * Handle initial routing based on URL
 */
function handleInitialRoute() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || 'login';
    switchForm(mode, false); // Don't update history on initial load
}

/**
 * Switch between login, signup, and forgot password forms
 */
function switchForm(formType, updateHistory = true) {
    currentForm = formType;
    
    // **FIX: Add null checks for DOM elements before accessing style**
    if (!elements.loginCard || !elements.signupCard || !elements.forgotPasswordCard || !elements.successCard) {
        console.warn('⚠️ DOM elements not ready for form switching');
        return;
    }
    
    // Hide all cards
    elements.loginCard.style.display = 'none';
    elements.signupCard.style.display = 'none';
    elements.forgotPasswordCard.style.display = 'none';
    elements.successCard.style.display = 'none';
    
    // Show the selected card
    if (formType === 'login') {
        elements.loginCard.style.display = 'block';
    } else if (formType === 'signup') {
        elements.signupCard.style.display = 'block';
    } else if (formType === 'forgot') {
        elements.forgotPasswordCard.style.display = 'block';
    } else if (formType === 'success') {
        elements.successCard.style.display = 'block';
    }

    // Update URL if needed
    if (updateHistory) {
        const newUrl = new URL(window.location);
        if (formType !== 'login') {
            newUrl.searchParams.set('mode', formType);
        } else {
            newUrl.searchParams.delete('mode');
        }
        window.history.pushState({ form: formType }, '', newUrl);
    }
}

/**
 * Handle authentication state changes from the auth module
 */
function handleAuthStateChange(event, session) {
    console.log('Auth page received auth state change:', event);
    
    // Get return URL from query parameters
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get('return') || '/app';
    
    if (event === 'SIGNED_IN' && session) {
        // If this was a Google OAuth callback, show success message
        if (params.get('from') === 'google') {
            showSuccess('Successfully signed in with Google!');
        }
        
        // Redirect to the return URL or app
        window.location.href = returnUrl;
    }
}

/**
 * Set loading state
 */
function setLoading(loading) {
    isLoading = loading;
    elements.loadingOverlay.style.display = loading ? 'flex' : 'none';
    updateFormButtons(loading);
}

/**
 * Update form buttons during loading
 */
function updateFormButtons(loading) {
    const buttons = document.querySelectorAll('button[type="submit"]');
    buttons.forEach(button => {
        const btnText = button.querySelector('.btn-text');
        const btnLoading = button.querySelector('.btn-loading');
        
        if (loading) {
            button.disabled = true;
            if(btnText) btnText.style.display = 'none';
            if(btnLoading) btnLoading.style.display = 'inline-block';
        } else {
            button.disabled = false;
            if(btnText) btnText.style.display = 'inline-block';
            if(btnLoading) btnLoading.style.display = 'none';
        }
    });
}

/**
 * NEW: Cleanup function to be called by the router
 */
export function cleanupAuthPage() {
    console.log('🧹 Cleaning up auth page event listeners...');
    if (authModule && authStateChangeHandler) {
        authModule.removeAuthListener(authStateChangeHandler);
        console.log('✅ Removed auth state listener');
    }
    
    // Remove form submission listeners to prevent duplicates
    if (elements.loginForm) {
        elements.loginForm.removeEventListener('submit', handleLoginSubmit);
    }
    if (elements.signupForm) {
        elements.signupForm.removeEventListener('submit', handleSignupSubmit);
    }
    if (elements.forgotPasswordForm) {
        elements.forgotPasswordForm.removeEventListener('submit', handleForgotPasswordSubmit);
    }
}

// Export for external use
window.authPage = {
    switchForm,
    isLoading: () => isLoading
};