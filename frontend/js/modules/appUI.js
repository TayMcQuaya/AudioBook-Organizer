/**
 * App UI Manager
 * Handles all DOM-related operations and UI updates
 */

import { showSuccess, showError, showInfo } from './notifications.js';
import { sessionManager } from './sessionManager.js';
import { createCreditsDisplay, updateCreditsDisplay } from './ui.js';

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
        console.log('🎨 Initializing UI manager...');
        
        // Always refresh auth state on init, even if already initialized
        if (this.isInitialized) {
            console.log('🔄 UI manager already initialized, refreshing auth state...');
        } else {
            // Listen for auth state changes (only on first init)
            sessionManager.addListener(this.handleAuthStateChange.bind(this));
        }
        
        // Get comprehensive auth state from multiple sources
        const authState = this.getComprehensiveAuthState();
        
        // Always update UI with current auth state
        this.updateUI(authState);
        
        this.isInitialized = true;
        console.log('✅ UI manager initialized');
    }
    
    /**
     * Get comprehensive authentication state from all available sources
     */
    getComprehensiveAuthState() {
        // Check session manager
        const sessionState = sessionManager.getAuthState();
        
        // Check auth module
        const authModuleAuth = window.authModule?.isAuthenticated?.();
        const authModuleUser = window.authModule?.getCurrentUser?.();
        
        // Combine the states, preferring the most complete one
        const isAuthenticated = sessionState.isAuthenticated || authModuleAuth;
        const user = sessionState.user || authModuleUser;
        
        console.log(`🔍 UI: Comprehensive auth state - Session: ${sessionState.isAuthenticated}, AuthModule: ${authModuleAuth}, User: ${!!user}`);
        
        return { isAuthenticated, user };
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
        
        // If no user provided, try to get from available sources
        if (!user) {
            user = window.sessionManager?.user || window.authModule?.getCurrentUser?.();
            console.log(`🔍 UI: No user provided to createUserNavigation, found: ${!!user}`);
        }
        
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
            
            // Ensure dropdown is hidden initially
            const dropdown = userNav.querySelector('.user-dropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
                console.log('✅ User dropdown created and properly hidden');
            }
            
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
        if (!dropdown) {
            console.warn('⚠️ User dropdown not found');
            return;
        }
        
        const isShowing = dropdown.classList.contains('show');
        dropdown.classList.toggle('show');
        console.log(`🔄 User dropdown toggled: ${isShowing ? 'hiding' : 'showing'}`);
        
        if (!isShowing) {
            // Close dropdown when clicking outside
            const closeDropdown = (event) => {
                const userBtn = document.querySelector('.user-btn');
                if (!userBtn?.contains(event.target) && !dropdown.contains(event.target)) {
                    dropdown.classList.remove('show');
                    document.removeEventListener('click', closeDropdown);
                    console.log('🔄 User dropdown closed by outside click');
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

/**
 * Initialize credits display in the header
 */
export function initializeCreditsDisplay() {
    createCreditsDisplay();
    
    // Update credits immediately if user is authenticated
    if (window.authModule && window.authModule.isAuthenticated()) {
        updateUserCredits();
    }
}

/**
 * Update user credits display
 */
export async function updateUserCredits() {
    try {
        // Check if we're in testing mode first
        const envManager = await import('./envManager.js');
        const config = envManager.default.getConfig();
        
        if (config.testing_mode) {
            // In testing mode, simulate credit consumption
            const currentTestCredits = parseInt(localStorage.getItem('testModeCredits') || '100');
            updateCreditsDisplay(currentTestCredits);
            console.log(`💎 Testing mode - Credits display updated: ${currentTestCredits}`);
            return;
        }
        
        // Normal mode - use auth module
        if (window.authModule && window.authModule.isAuthenticated()) {
            const credits = await window.authModule.getUserCredits();
            updateCreditsDisplay(credits);
            
            // Show warning if credits are low
            if (credits < 20) {
                console.warn(`⚠️ Low credits: ${credits} remaining`);
                // Could show a subtle notification here
            }
        } else {
            updateCreditsDisplay(0);
        }
    } catch (error) {
        console.error('Error updating credits display:', error);
        updateCreditsDisplay(0);
    }
}

/**
 * Consume credits in testing mode (simulate credit usage)
 */
export async function consumeTestCredits(amount, action) {
    try {
        const envManager = await import('./envManager.js');
        const config = envManager.default.getConfig();
        
        if (!config.testing_mode) return;
        
        const currentCredits = parseInt(localStorage.getItem('testModeCredits') || '100');
        const newCredits = Math.max(0, currentCredits - amount);
        
        localStorage.setItem('testModeCredits', newCredits.toString());
        updateCreditsDisplay(newCredits);
        
        console.log(`💎 Testing mode - Consumed ${amount} credits for ${action}: ${currentCredits} → ${newCredits}`);
        
        // Show low credits warning
        if (newCredits < 20 && currentCredits >= 20) {
            const { showLowCreditsModal } = await import('./ui.js');
            showLowCreditsModal();
        }
        
    } catch (error) {
        console.error('Error consuming test credits:', error);
    }
}

/**
 * Check if user has sufficient credits for an action
 */
export function checkCreditsForAction(requiredCredits, actionName) {
    return new Promise(async (resolve) => {
        try {
            if (window.authModule && window.authModule.isAuthenticated()) {
                const currentCredits = await window.authModule.getUserCredits();
                
                if (currentCredits < requiredCredits) {
                    const { showLowCreditsModal } = await import('./ui.js');
                    showLowCreditsModal();
                    resolve(false);
                    return;
                }
                
                resolve(true);
            } else {
                // Not authenticated - allow in testing mode, deny in production
                const envManager = await import('./envManager.js');
                const config = envManager.default.getConfig();
                resolve(config.testing_mode);
            }
        } catch (error) {
            console.error('Error checking credits:', error);
            resolve(false);
        }
    });
} 