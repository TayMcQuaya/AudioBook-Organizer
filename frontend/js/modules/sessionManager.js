/**
 * Session Manager Module
 * Handles authentication state across all pages and manages UI updates
 */

import { showSuccess, showError, showInfo } from './notifications.js';

class SessionManager {
    constructor() {
        this.user = null;
        this.isAuthenticated = false;
        this.isInitialized = false;
        this.listeners = new Set();
        this.isCheckingAuth = false;  // Prevent simultaneous auth checks
        this.listenersSetup = false;  // Prevent duplicate listeners
        this.lastAuthCheck = 0;       // Track last auth check timestamp
        this.creatingNavigation = false;  // Prevent multiple simultaneous navigation creations
    }

    /**
     * Initialize session manager
     */
    async init() {
        if (this.isInitialized) return;
        
        console.log('🔒 Initializing session manager...');
        
        // Clean up any invalid tokens first
        this.cleanupInvalidTokens();
        
        // Check for existing authentication
        await this.checkAuthStatus();
        
        // Listen for auth state changes
        this.setupAuthListeners();
        
        this.isInitialized = true;
        console.log('✅ Session manager initialized');
    }

    /**
     * Clean up invalid tokens from localStorage
     */
    cleanupInvalidTokens() {
        const authToken = localStorage.getItem('auth_token');
        if (authToken && !this.isValidJWT(authToken)) {
            console.log('🧹 Cleaning up invalid token from localStorage');
            localStorage.removeItem('auth_token');
        }
    }

    /**
     * Validate JWT token format
     */
    isValidJWT(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }
        
        // JWT should have exactly 3 parts separated by dots
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.warn('🚫 Invalid JWT format - not enough segments');
            return false;
        }
        
        // Each part should be base64-like (allow for padding)
        const base64Pattern = /^[A-Za-z0-9_-]+$/;
        for (const part of parts) {
            if (!base64Pattern.test(part)) {
                console.warn('🚫 Invalid JWT format - invalid characters');
                return false;
            }
        }
        
        return true;
    }

    /**
     * Check current authentication status
     */
    async checkAuthStatus() {
        // Prevent multiple simultaneous auth checks
        if (this.isCheckingAuth) {
            console.log('⏳ Auth check already in progress, skipping...');
            return;
        }
        
        // Add frequency limiting - minimum 5 seconds between checks
        const now = Date.now();
        if (this.lastAuthCheck && now - this.lastAuthCheck < 5000) {
            console.log('⏳ Auth check too frequent, skipping...');
            return;
        }
        
        this.isCheckingAuth = true;
        this.lastAuthCheck = now;
        
        try {
            console.log('🔍 Checking auth status...');
            
            // First check if auth module is available and has a user
            if (window.authModule && window.authModule.isAuthenticated()) {
                this.user = window.authModule.getCurrentUser();
                this.isAuthenticated = true;
                console.log('👤 User authenticated via authModule:', this.user?.email);
            } else {
                // Check localStorage for auth token
                const authToken = localStorage.getItem('auth_token');
                if (authToken) {
                    console.log('🔑 Found auth token, validating format...');
                    
                    // Validate token format before making API call
                    if (!this.isValidJWT(authToken)) {
                        console.log('❌ Invalid token format, clearing...');
                        localStorage.removeItem('auth_token');
                        this.isAuthenticated = false;
                        this.user = null;
                    } else {
                        console.log('✅ Token format valid, verifying with backend...');
                        
                        try {
                            // Verify token with backend
                            const response = await fetch('/api/auth/status', {
                                headers: { 
                                    'Authorization': `Bearer ${authToken}`,
                                    'Content-Type': 'application/json'
                                }
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                if (data.authenticated && data.user) {
                                    this.user = data.user;
                                    this.isAuthenticated = true;
                                    console.log('👤 Session restored from token:', this.user.email);
                                } else {
                                    console.log('❌ Backend says user not authenticated');
                                    localStorage.removeItem('auth_token');
                                    this.isAuthenticated = false;
                                    this.user = null;
                                }
                            } else {
                                console.log('❌ Token validation failed with backend, clearing...');
                                localStorage.removeItem('auth_token');
                                this.isAuthenticated = false;
                                this.user = null;
                            }
                        } catch (fetchError) {
                            console.error('❌ Network error during token verification:', fetchError);
                            // Don't clear token on network errors, just set auth state to false
                            this.isAuthenticated = false;
                            this.user = null;
                        }
                    }
                } else {
                    console.log('🔍 No auth token found');
                    this.isAuthenticated = false;
                    this.user = null;
                }
            }
            
            // Update UI based on auth status (but only if DOM is ready)
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                this.updateAuthUI();
            }
            
        } catch (error) {
            console.error('❌ Error checking auth status:', error);
            this.isAuthenticated = false;
            this.user = null;
        } finally {
            this.isCheckingAuth = false;
        }
    }

    /**
     * Setup listeners for authentication state changes
     */
    setupAuthListeners() {
        // Prevent duplicate listeners
        if (this.listenersSetup) {
            console.log('🔄 Auth listeners already setup, skipping...');
            return;
        }

        // Listen for custom auth events
        window.addEventListener('auth-state-changed', (event) => {
            const { isAuthenticated, user, session } = event.detail;
            this.handleAuthStateChange(isAuthenticated, user, session);
        });

        // Listen for storage changes (logout from another tab)
        window.addEventListener('storage', (event) => {
            if (event.key === 'auth_token' && !event.newValue) {
                this.handleSignOut();
            }
        });

        // Listen for page visibility changes to refresh session (but limit frequency)
        let lastVisibilityCheck = 0;
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isInitialized) {
                const now = Date.now();
                // Only check auth if more than 60 seconds have passed and user was previously authenticated
                if (now - lastVisibilityCheck > 60000 && this.isAuthenticated) {
                    lastVisibilityCheck = now;
                    setTimeout(() => {
                        this.checkAuthStatus();
                    }, 1000); // Longer delay to avoid race conditions
                }
            }
        });

        this.listenersSetup = true;
        console.log('🔄 Auth listeners setup completed');
    }

    /**
     * Handle authentication state changes
     */
    handleAuthStateChange(isAuthenticated, user, session) {
        console.log('🔄 SessionManager: Auth state changed to:', isAuthenticated, 'for user:', user?.email);
        
        this.isAuthenticated = isAuthenticated;
        this.user = user;
        
        if (isAuthenticated && session?.token) {
            // Validate token before storing
            if (this.isValidJWT(session.token)) {
                localStorage.setItem('auth_token', session.token);
                console.log('✅ Valid token stored in localStorage');
            } else {
                console.warn('⚠️ Received invalid token format, not storing');
            }
        }
        
        console.log('🔄 Auth state changed:', isAuthenticated ? `Signed in as ${user?.email}` : 'Signed out');
        
        // Force UI update with a small delay to ensure DOM is ready
        setTimeout(() => {
            console.log('🔄 Forcing UI update...');
            this.updateAuthUI();
            
            // Double-check that user nav was created for authenticated users
            if (isAuthenticated && user) {
                const userNav = document.querySelector('.user-nav');
                if (!userNav) {
                    console.warn('⚠️ User nav not found after update, forcing creation...');
                    this.createUserNavigation();
                }
            }
        }, 100);
        
        // Notify listeners
        this.notifyListeners({
            isAuthenticated,
            user: this.user
        });
    }

    /**
     * Handle sign out
     */
    async handleSignOut() {
        this.isAuthenticated = false;
        this.user = null;
        
        // Clear local storage
        localStorage.removeItem('auth_token');
        
        // Update UI
        this.updateAuthUI();
        
        // Sign out from auth module if available
        if (window.authModule && typeof window.authModule.signOut === 'function') {
            await window.authModule.signOut();
        }
        
        console.log('👋 User signed out');
        showInfo('You have been signed out');
        
        // Redirect to landing page if on protected route
        if (window.router && (window.location.pathname === '/app' || window.location.pathname === '/profile')) {
            window.router.navigate('/');
        }
    }

    /**
     * Update authentication UI elements across the page
     */
    updateAuthUI() {
        console.log('🔄 Updating auth UI - isAuthenticated:', this.isAuthenticated, 'user:', this.user?.email);
        
        // Update navigation authentication elements
        this.updateNavAuth();
        
        // Update any other auth-dependent UI elements
        this.updateAuthDependentElements();
    }

    /**
     * Update navigation authentication elements
     */
    updateNavAuth() {
        console.log('🔄 Updating nav auth - isAuthenticated:', this.isAuthenticated);
        
        // Look for auth navigation elements
        const authButtons = document.querySelectorAll('[data-auth-element]');
        const signInButtons = document.querySelectorAll('a[href="/auth"], .auth-btn, .btn-signin');
        const userMenus = document.querySelectorAll('.user-menu, .user-dropdown');
        
        if (this.isAuthenticated && this.user) {
            console.log('👤 Creating user navigation for:', this.user.email);
            
            // Check if user navigation already exists and is for the current user
            const existingUserNav = document.querySelector('.user-nav .user-name');
            const currentDisplayName = this.getUserDisplayName();
            
            if (existingUserNav && existingUserNav.textContent === currentDisplayName) {
                console.log('✅ User navigation already exists for current user, skipping creation');
                
                // Just ensure sign-in buttons are hidden
                signInButtons.forEach(btn => {
                    if (btn.style) btn.style.display = 'none';
                });
                
                return;
            }
            
            // Hide sign-in buttons
            signInButtons.forEach(btn => {
                if (btn.style) btn.style.display = 'none';
            });
            
            // Show/update user menus
            userMenus.forEach(menu => {
                if (menu.style) menu.style.display = 'block';
            });
            
            // Update or create user navigation
            this.createUserNavigation();
            
        } else {
            console.log('🔒 User not authenticated, showing sign-in buttons');
            
            // Show sign-in buttons
            signInButtons.forEach(btn => {
                if (btn.style) btn.style.display = '';
            });
            
            // Hide user menus
            userMenus.forEach(menu => {
                if (menu.style) menu.style.display = 'none';
            });
            
            // Remove user navigation
            this.removeUserNavigation();
        }
    }

    /**
     * Create user navigation elements
     */
    createUserNavigation() {
        console.log('🔨 Creating user navigation for:', this.getUserDisplayName());
        
        // Prevent multiple simultaneous creation attempts
        if (this.creatingNavigation) {
            console.log('⏳ Already creating navigation, skipping...');
            return;
        }
        this.creatingNavigation = true;
        
        // Wait for DOM to be ready if needed
        const createNav = () => {
            // Update main navigation
            const navLinks = document.querySelector('.nav-links');
            if (navLinks) {
                console.log('✅ Found nav-links container');
                
                // Remove existing user nav if present
                const existingUserNav = navLinks.querySelector('.user-nav');
                if (existingUserNav) {
                    console.log('🗑️ Removing existing user nav');
                    existingUserNav.remove();
                }
                
                // Create user navigation
                const userNav = document.createElement('div');
                userNav.className = 'user-nav';
                userNav.innerHTML = `
                    <div class="user-menu">
                        <button class="user-btn" onclick="window.sessionManager.toggleUserDropdown()">
                            <span class="user-name">${this.getUserDisplayName()}</span>
                            <span class="user-icon">👤</span>
                            <span class="dropdown-arrow">▼</span>
                        </button>
                        <div class="user-dropdown" id="userDropdown">
                            <a href="/profile" class="dropdown-item">
                                <span class="item-icon">⚙️</span>
                                Profile
                            </a>
                            <button class="dropdown-item logout-btn" onclick="window.sessionManager.signOut()">
                                <span class="item-icon">🚪</span>
                                Sign Out
                            </button>
                        </div>
                    </div>
                `;
                
                // Hide sign-in button and add user nav
                const signInBtn = navLinks.querySelector('a[href="/auth"]');
                if (signInBtn) {
                    console.log('🫥 Hiding sign-in button');
                    signInBtn.style.display = 'none';
                }
                
                console.log('✅ Adding user navigation to DOM');
                navLinks.appendChild(userNav);
                
                // Force display to make sure it's visible
                userNav.style.display = 'block';
                
                console.log('✅ User navigation created successfully');
            } else {
                console.warn('⚠️ Could not find nav-links container, will retry...');
                // Try again after a short delay
                setTimeout(() => {
                    this.creatingNavigation = false;
                    this.createUserNavigation();
                }, 200);
                return;
            }
            
            // Update mobile navigation
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenu) {
                console.log('✅ Found mobile menu container');
                
                // Remove existing mobile user nav
                const existingMobileUserNav = mobileMenu.querySelector('.mobile-user-nav');
                if (existingMobileUserNav) {
                    existingMobileUserNav.remove();
                }
                
                // Create mobile user navigation
                const mobileUserNav = document.createElement('div');
                mobileUserNav.className = 'mobile-user-nav';
                mobileUserNav.innerHTML = `
                    <div class="mobile-user-info">
                        <span class="mobile-user-name">${this.getUserDisplayName()}</span>
                    </div>
                    <a href="/profile" class="mobile-link">Profile</a>
                    <button class="mobile-link logout-btn" onclick="window.sessionManager.signOut()">
                        Sign Out
                    </button>
                `;
                
                // Hide mobile sign-in button
                const mobileSignInBtn = mobileMenu.querySelector('a[href="/auth"]');
                if (mobileSignInBtn) {
                    mobileSignInBtn.style.display = 'none';
                }
                
                mobileMenu.appendChild(mobileUserNav);
                console.log('✅ Mobile user navigation created successfully');
            }
            
            this.creatingNavigation = false;
        };
        
        // Execute immediately if DOM is ready, otherwise wait
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            createNav();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                createNav();
            });
        }
    }

    /**
     * Remove user navigation elements
     */
    removeUserNavigation() {
        // Remove user nav from main navigation
        const userNav = document.querySelector('.user-nav');
        if (userNav) {
            userNav.remove();
        }
        
        // Remove mobile user nav
        const mobileUserNav = document.querySelector('.mobile-user-nav');
        if (mobileUserNav) {
            mobileUserNav.remove();
        }
        
        // Show sign-in buttons
        const signInBtn = document.querySelector('.nav-links a[href="/auth"]');
        if (signInBtn) {
            signInBtn.style.display = '';
        }
        
        const mobileSignInBtn = document.querySelector('#mobileMenu a[href="/auth"]');
        if (mobileSignInBtn) {
            mobileSignInBtn.style.display = '';
        }
    }

    /**
     * Update other authentication-dependent elements
     */
    updateAuthDependentElements() {
        // Update any elements with data-auth-show attribute
        const authShowElements = document.querySelectorAll('[data-auth-show]');
        authShowElements.forEach(element => {
            const show = element.getAttribute('data-auth-show');
            if ((show === 'true' && this.isAuthenticated) || (show === 'false' && !this.isAuthenticated)) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        });
        
        // Let landing page handle its own button updates to avoid conflicts
        // Removed duplicate try demo button logic that was causing issues
    }

    /**
     * Get user display name
     */
    getUserDisplayName() {
        if (!this.user) return 'User';
        
        // Debug log to see user structure
        console.log('🔍 User object for display name:', this.user);
        
        // Try different name fields in order of preference
        if (this.user.user_metadata?.full_name) {
            console.log('📝 Using full_name from user_metadata:', this.user.user_metadata.full_name);
            return this.user.user_metadata.full_name;
        }
        if (this.user.user_metadata?.name) {
            console.log('📝 Using name from user_metadata:', this.user.user_metadata.name);
            return this.user.user_metadata.name;
        }
        if (this.user.full_name) {
            console.log('📝 Using full_name from user:', this.user.full_name);
            return this.user.full_name;
        }
        if (this.user.name) {
            console.log('📝 Using name from user:', this.user.name);
            return this.user.name;
        }
        if (this.user.email) {
            console.log('📝 Using email prefix:', this.user.email.split('@')[0]);
            return this.user.email.split('@')[0];
        }
        
        console.log('📝 Falling back to "User"');
        return 'User';
    }

    /**
     * Toggle user dropdown menu
     */
    toggleUserDropdown() {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            const isShowing = dropdown.classList.contains('show');
            
            if (isShowing) {
                dropdown.classList.remove('show');
            } else {
                dropdown.classList.add('show');
                
                // Close dropdown when clicking outside
                setTimeout(() => {
                    document.addEventListener('click', function closeDropdown(event) {
                        const userBtn = document.querySelector('.user-btn');
                        if (!userBtn?.contains(event.target) && !dropdown.contains(event.target)) {
                            dropdown.classList.remove('show');
                            document.removeEventListener('click', closeDropdown);
                        }
                    });
                }, 0);
            }
        }
    }

    /**
     * Navigate to app (authenticated users)
     */
    navigateToApp() {
        if (this.isAuthenticated) {
            if (window.router) {
                window.router.navigate('/app');
            } else {
                window.location.href = '/app';
            }
        } else {
            showInfo('Please sign in to access the app');
            if (window.router) {
                window.router.navigate('/auth');
            } else {
                window.location.href = '/auth';
            }
        }
    }

    /**
     * Sign out the user
     */
    async signOut() {
        await this.handleSignOut();
    }

    /**
     * Add listener for auth state changes
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    /**
     * Remove listener
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of auth state changes
     */
    notifyListeners(authData) {
        this.listeners.forEach(callback => {
            try {
                callback(authData);
            } catch (error) {
                console.error('Error in auth listener:', error);
            }
        });
    }

    /**
     * Get current authentication state
     */
    getAuthState() {
        return {
            isAuthenticated: this.isAuthenticated,
            user: this.user
        };
    }
}

// Create and export singleton instance
const sessionManager = new SessionManager();

// Make it globally available
window.sessionManager = sessionManager;

export default sessionManager; 