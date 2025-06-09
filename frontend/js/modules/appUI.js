/**
 * App UI Manager
 * Handles all DOM-related operations and UI updates
 */

import { showSuccess, showError, showInfo } from './notifications.js';
import sessionManager from './sessionManager.js';

class AppUIManager {
    constructor() {
        this.isInitialized = false;
        this.creatingNavigation = false;
        this.retryCount = 0;
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 500;
    }

    /**
     * Initialize UI manager
     */
    async init() {
        if (this.isInitialized) return;
        
        console.log('🎨 Initializing UI manager...');
        
        // Listen for auth state changes
        sessionManager.addListener(this.handleAuthStateChange.bind(this));
        
        // Initial UI update
        this.updateUI(sessionManager.getAuthState());
        
        this.isInitialized = true;
        console.log('✅ UI manager initialized');
    }

    /**
     * Handle authentication state changes
     */
    handleAuthStateChange(state) {
        this.updateUI(state);
    }

    /**
     * Update UI based on auth state
     */
    updateUI({ isAuthenticated, user }) {
        // Update navigation
        this.updateNavigation(isAuthenticated, user);
        
        // Update auth-dependent elements
        this.updateAuthDependentElements(isAuthenticated);
    }

    /**
     * Update navigation based on auth state
     */
    updateNavigation(isAuthenticated, user) {
        const signInButtons = document.querySelectorAll('a[href="/auth"], .auth-btn, .btn-signin');
        const userMenus = document.querySelectorAll('.user-menu, .user-dropdown');
        
        if (isAuthenticated && user) {
            // Hide sign-in buttons
            signInButtons.forEach(btn => {
                if (btn.style) btn.style.display = 'none';
            });
            
            // Show user menus
            userMenus.forEach(menu => {
                if (menu.style) menu.style.display = 'block';
            });
            
            // Create or update user navigation
            this.createUserNavigation(user);
        } else {
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
    createUserNavigation(user) {
        if (this.creatingNavigation) return;
        this.creatingNavigation = true;
        
        const createNav = () => {
            const navLinks = document.querySelector('.nav-links');
            if (!navLinks) {
                if (this.retryCount < this.MAX_RETRIES) {
                    this.retryCount++;
                    setTimeout(() => createNav(), this.RETRY_DELAY);
                    return;
                }
                this.creatingNavigation = false;
                return;
            }
            
            // Remove existing user nav
            const existingUserNav = navLinks.querySelector('.user-nav');
            if (existingUserNav) existingUserNav.remove();
            
            // Create user navigation
            const userNav = document.createElement('div');
            userNav.className = 'user-nav';
            userNav.innerHTML = `
                <div class="user-menu">
                    <button class="user-btn" onclick="window.appUI.toggleUserDropdown()">
                        <span class="user-name">${this.getUserDisplayName(user)}</span>
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
            
            navLinks.appendChild(userNav);
            userNav.style.display = 'block';
            
            // Update mobile navigation
            this.updateMobileNavigation(user);
            
            this.creatingNavigation = false;
            this.retryCount = 0;
        };

        // Execute when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createNav);
        } else {
            createNav();
        }
    }

    /**
     * Update mobile navigation
     */
    updateMobileNavigation(user) {
        const mobileMenu = document.getElementById('mobileMenu');
        if (!mobileMenu) return;
        
        // Remove existing mobile user nav
        const existingMobileUserNav = mobileMenu.querySelector('.mobile-user-nav');
        if (existingMobileUserNav) existingMobileUserNav.remove();
        
        // Create mobile user navigation
        const mobileUserNav = document.createElement('div');
        mobileUserNav.className = 'mobile-user-nav';
        mobileUserNav.innerHTML = `
            <div class="mobile-user-info">
                <span class="mobile-user-name">${this.getUserDisplayName(user)}</span>
            </div>
            <a href="/profile" class="mobile-link">Profile</a>
            <button class="mobile-link logout-btn" onclick="window.sessionManager.signOut()">
                Sign Out
            </button>
        `;
        
        // Hide mobile sign-in button
        const mobileSignInBtn = mobileMenu.querySelector('a[href="/auth"]');
        if (mobileSignInBtn) mobileSignInBtn.style.display = 'none';
        
        mobileMenu.appendChild(mobileUserNav);
    }

    /**
     * Remove user navigation elements
     */
    removeUserNavigation() {
        // Remove desktop nav
        const userNav = document.querySelector('.user-nav');
        if (userNav) userNav.remove();
        
        // Remove mobile nav
        const mobileUserNav = document.querySelector('.mobile-user-nav');
        if (mobileUserNav) mobileUserNav.remove();
        
        // Show sign-in buttons
        const signInBtn = document.querySelector('.nav-links a[href="/auth"]');
        if (signInBtn) signInBtn.style.display = '';
        
        const mobileSignInBtn = document.querySelector('#mobileMenu a[href="/auth"]');
        if (mobileSignInBtn) mobileSignInBtn.style.display = '';
    }

    /**
     * Update auth-dependent elements
     */
    updateAuthDependentElements(isAuthenticated) {
        const authShowElements = document.querySelectorAll('[data-auth-show]');
        authShowElements.forEach(element => {
            const show = element.getAttribute('data-auth-show');
            element.style.display = 
                (show === 'true' && isAuthenticated) || 
                (show === 'false' && !isAuthenticated) 
                    ? '' 
                    : 'none';
        });
    }

    /**
     * Toggle user dropdown menu
     */
    toggleUserDropdown() {
        const dropdown = document.getElementById('userDropdown');
        if (!dropdown) return;
        
        const isShowing = dropdown.classList.contains('show');
        dropdown.classList.toggle('show');
        
        if (!isShowing) {
            // Close dropdown when clicking outside
            const closeDropdown = (event) => {
                const userBtn = document.querySelector('.user-btn');
                if (!userBtn?.contains(event.target) && !dropdown.contains(event.target)) {
                    dropdown.classList.remove('show');
                    document.removeEventListener('click', closeDropdown);
                }
            };
            setTimeout(() => document.addEventListener('click', closeDropdown), 0);
        }
    }

    /**
     * Get user display name
     */
    getUserDisplayName(user) {
        if (!user) return 'User';
        
        return user.user_metadata?.full_name ||
               user.user_metadata?.name ||
               user.full_name ||
               user.name ||
               user.email?.split('@')[0] ||
               'User';
    }
}

// Create and export singleton instance
const appUI = new AppUIManager();

// Make it globally available
window.appUI = appUI;

export default appUI; 