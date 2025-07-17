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
            
            // **NEW: Add authentication recovery listener for credit updates**
            this.setupAuthRecoveryListener();
        }
        
        // **ENHANCED: Force authentication state check before UI update**
        // This is critical for page refresh scenarios
        if (window.sessionManager && typeof window.sessionManager.checkAuthStatus === 'function') {
            console.log('🔄 Triggering auth status check before UI initialization...');
            await window.sessionManager.checkAuthStatus();
        }
        
        // Get comprehensive auth state from multiple sources
        const authState = this.getComprehensiveAuthState();
        
        // Always update UI with current auth state
        this.updateUI(authState);
        
        // Initialize credits display (if on app page)
        if (window.location.pathname === '/app') {
            console.log('💎 Initializing credits display on app page...');
            // Create the credits display element but DON'T fetch credits yet
            // Let the project restoration complete first
            createCreditsDisplay();
            
            // Check for gift notifications (non-blocking, after initialization)
            setTimeout(() => {
                this.checkGiftNotification().catch(error => {
                    console.log('Gift notification check failed silently:', error.message);
                });
            }, 100);
        }
        
        this.isInitialized = true;
        console.log('✅ UI manager initialized');
    }

    /**
     * Setup authentication recovery listener for post-restart session issues
     */
    setupAuthRecoveryListener() {
        // Listen for authentication state improvements
        let lastAuthState = false;
        let lastCreditsState = 0;
        
        const checkAuthRecovery = () => {
            const currentAuthState = window.authModule?.isAuthenticated() || false;
            const hasToken = !!localStorage.getItem('auth_token');
            
            // Detect authentication recovery after restart
            if (!lastAuthState && currentAuthState && hasToken) {
                console.log('💎 Authentication recovered - scheduling credits refresh...');
                // Delay credit fetch to avoid conflicts with restoration
                setTimeout(() => {
                    updateUserCredits(0); // Start fresh retry cycle
                }, 2000);
            }
            
            // Update tracking state
            lastAuthState = currentAuthState;
        };
        
        // Check periodically for auth state changes
        setInterval(checkAuthRecovery, 2000); // Check every 2 seconds
        
        // Also listen for storage events (cross-tab auth changes)
        window.addEventListener('storage', (event) => {
            if (event.key === 'auth_token' && event.newValue) {
                console.log('💎 Auth token updated - checking for credit recovery...');
                setTimeout(() => updateUserCredits(0), 500); // Small delay to let auth stabilize
            }
        });
        
        console.log('✅ Authentication recovery listener setup complete');
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
        console.log('🔄 UI: Auth state changed:', state);
        this.updateUI(state);
        
        // **NEW: Trigger credit update when user becomes authenticated**
        if (state.isAuthenticated && state.user) {
            console.log('💎 User authenticated - updating credits...');
            // Small delay to ensure auth is fully established
            setTimeout(() => {
                updateUserCredits(0);
            }, 500);
        }
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
                    <button class="user-btn" onclick="window.safeToggleUserDropdown()">
                        <span class="user-name">${this.getUserDisplayName(user)}</span>
                        <span class="user-icon">👤</span>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div class="user-dropdown" id="userDropdown">
                        ${window.location.pathname === '/' ? `
                        <button class="dropdown-item" onclick="window.navigateToApp && window.navigateToApp()">
                            <span class="item-icon">🚀</span>
                            Open App
                        </button>` : ''}
                        <button class="dropdown-item" onclick="window.safeOpenProfile()">
                            <span class="item-icon">👤</span>
                            Profile
                        </button>
                        <button class="dropdown-item logout-btn" onclick="window.sessionManager.signOut()">
                            <span class="item-icon">🚪</span>
                            Sign Out
                        </button>
                    </div>
                </div>
            `;
            
            // Insert user nav with consistent positioning
            const existingCredits = navLinks.querySelector('#creditsDisplay');
            const authButton = navLinks.querySelector('.auth-btn');
            
            if (existingCredits) {
                // If credits display exists, insert user nav AFTER credits to maintain order
                existingCredits.insertAdjacentElement('afterend', userNav);
                console.log('✅ User nav inserted after existing credits display');
            } else if (authButton) {
                // If no credits but auth button exists, insert before auth button
                authButton.insertAdjacentElement('beforebegin', userNav);
                console.log('✅ User nav inserted before auth button');
            } else {
                // Fallback: append to end of nav-links
                navLinks.appendChild(userNav);
                console.log('✅ User nav appended to end of nav-links');
            }
            
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
            ${window.location.pathname === '/' ? `<button class="mobile-link" onclick="window.navigateToApp && window.navigateToApp()">Open App</button>` : ''}
            <button class="mobile-link" onclick="window.safeOpenProfile()">Profile</button>
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
     * Safely open profile modal with defensive checks
     */
    openProfile() {
        try {
            // **OPTIMIZED: Check for profile modal availability with better error handling**
            if (window.profileModal && typeof window.profileModal.open === 'function') {
                console.log('✅ Opening profile modal (already loaded)');
                window.profileModal.open();
                return;
            }
            
            // **ENHANCED: If profile modal isn't available, try immediate import**
            console.log('🔄 Profile modal not ready, attempting immediate load...');
            this.loadAndOpenProfile();
            
        } catch (error) {
            console.error('🚨 Error opening profile modal:', error);
            // Fallback navigation to profile page
            this.showProfileFallback();
        }
    }

    /**
     * Load and open profile modal immediately
     */
    async loadAndOpenProfile() {
        try {
            // Check if module is already in module cache
            if (window.profileModal) {
                console.log('✅ Profile modal found in cache, opening...');
                window.profileModal.open();
                return;
            }
            
            // Dynamic import with timeout
            const importPromise = import('./profileModal.js');
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Profile modal import timeout')), 3000)
            );
            
            await Promise.race([importPromise, timeoutPromise]);
            
            // Small delay to ensure module is fully initialized
            await new Promise(resolve => setTimeout(resolve, 50));
            
            if (window.profileModal && typeof window.profileModal.open === 'function') {
                console.log('✅ Profile modal loaded successfully, opening...');
                window.profileModal.open();
            } else {
                throw new Error('Profile modal not available after loading');
            }
            
        } catch (error) {
            console.error('🚨 Failed to load profile modal:', error);
            this.showProfileFallback();
        }
    }

    /**
     * Show fallback when profile modal fails
     */
    showProfileFallback() {
        console.log('🔄 Using profile fallback navigation');
        // Show a brief message and navigate
        if (window.showInfo) {
            showInfo('Loading profile page...');
        }
        setTimeout(() => {
            window.location.href = '/profile';
        }, 500);
    }

    /**
     * Fallback method to load and open profile modal
     * @deprecated - kept for backward compatibility
     */
    async fallbackOpenProfile() {
        // Redirect to new method
        await this.loadAndOpenProfile();
    }

    /**
     * Get user display name
     */
    getUserDisplayName(user) {
        if (!user) return 'User';
        
        // Prioritize profile table data over OAuth metadata for consistency
        return user.full_name ||                    // Updated profile name (highest priority)
               user.name ||                         // Alternative profile name
               user.user_metadata?.full_name ||     // OAuth cached name (fallback)
               user.user_metadata?.name ||          // Alternative OAuth name
               user.email?.split('@')[0] ||         // Email prefix
               'User';                              // Default
    }
    
    /**
     * Check for gift notifications on app initialization
     */
    async checkGiftNotification() {
        try {
            console.log('🎁 Checking for gift notifications...');
            
            // Import apiFetch from api module
            const { apiFetch } = await import('./api.js');
            
            const response = await apiFetch('/auth/check-gift');
            if (!response.ok) {
                console.error('Failed to check gift notification');
                return;
            }
            
            const data = await response.json();
            
            if (data.has_gift) {
                const gift = data.gift;
                const notificationKey = `gift_acknowledged_${gift.id}`;
                
                // Check if already acknowledged in localStorage
                if (!localStorage.getItem(notificationKey)) {
                    console.log('🎁 New gift detected:', gift);
                    // Show special gift notification
                    this.showGiftNotification(gift);
                } else {
                    console.log('🎁 Gift already acknowledged:', gift.id);
                }
            } else {
                console.log('🎁 No unacknowledged gifts');
            }
        } catch (error) {
            console.error('Error checking gift notification:', error);
            // Silently fail to prevent blocking app initialization
            // Gift notification is a nice-to-have feature, not critical
        }
    }
    
    /**
     * Show gift notification to user
     */
    async showGiftNotification(gift) {
        try {
            const { showNotification } = await import('./notifications.js');
            const { apiFetch } = await import('./api.js');
            
            // Create custom gift notification with enhanced styling
            const message = `
                <div style="text-align: center; padding: 10px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 24px;">🎁 You've received a gift!</h3>
                    <p style="margin: 10px 0; font-size: 16px; color: #666;">${gift.reason}</p>
                    <p style="font-size: 36px; font-weight: bold; color: #4CAF50; margin: 20px 0;">
                        +${gift.amount} 💎
                    </p>
                    <p style="margin: 10px 0; color: #888; font-size: 14px;">Credits have been added to your account</p>
                    <button class="notification-btn notification-btn-confirm" 
                            style="margin-top: 15px; padding: 12px 24px; font-size: 16px;"
                            onclick="window.closeNotification()">
                        Awesome, thanks! 🎉
                    </button>
                </div>
            `;
            
            // Show notification with no auto-close (0 duration)
            showNotification(message, 'success', 0);
            
            // Mark as acknowledged locally
            localStorage.setItem(`gift_acknowledged_${gift.id}`, 'true');
            
            // Also acknowledge on server (fire and forget)
            apiFetch(`/auth/acknowledge-gift/${gift.id}`, { method: 'POST' })
                .catch(err => console.error('Failed to acknowledge gift on server:', err));
            
            // Force refresh credits display to show new balance
            console.log('🎁 Refreshing credits after gift...');
            window._creditRefreshNeeded = true;
            updateUserCredits(0);
            
        } catch (error) {
            console.error('Error showing gift notification:', error);
        }
    }
}

// Create and export singleton instance
const appUI = new AppUIManager();

// CRITICAL: Make appUI globally available immediately to prevent race conditions
window.appUI = appUI;

// Safe global wrapper functions for HTML onclick handlers
// These prevent errors when modules aren't loaded yet after page refresh
window.safeOpenProfile = function() {
    console.log('🔐 Safe profile open called');
    if (window.appUI && typeof window.appUI.openProfile === 'function') {
        window.appUI.openProfile();
    } else {
        console.error('AppUI not ready, retrying in 500ms...');
        setTimeout(() => {
            if (window.appUI && typeof window.appUI.openProfile === 'function') {
                window.appUI.openProfile();
            } else {
                console.error('AppUI still not available');
                // Last resort: try to load the module
                import('./appUI.js').then(module => {
                    if (window.appUI && typeof window.appUI.openProfile === 'function') {
                        window.appUI.openProfile();
                    }
                }).catch(err => console.error('Failed to load appUI:', err));
            }
        }, 500);
    }
};

window.safeToggleUserDropdown = function() {
    console.log('🔐 Safe dropdown toggle called');
    if (window.appUI && typeof window.appUI.toggleUserDropdown === 'function') {
        window.appUI.toggleUserDropdown();
    } else {
        console.error('AppUI not ready for dropdown toggle');
    }
};

// Safe wrapper for opening credits purchase modal
window.safeOpenCreditsModal = async function() {
    console.log('🔐 Safe open credits modal called');
    try {
        const { showLowCreditsModal } = await import('./ui.js');
        await showLowCreditsModal();
    } catch (error) {
        console.error('Failed to open credits modal:', error);
        // Try to show a basic error message
        if (window.showError) {
            window.showError('Failed to open credits purchase. Please refresh the page and try again.');
        }
    }
};

export default appUI;

/**
 * Initialize credits display in the header
 */
export function initializeCreditsDisplay() {
    createCreditsDisplay();
    
    // Don't automatically fetch credits here - let the app initialization handle it
    // This prevents duplicate API calls during startup
    console.log('💎 Credits display created, waiting for app to trigger credit fetch...');
}

// Flag to prevent concurrent credit fetches
let creditsFetchInProgress = false;

/**
 * Update user credits display with retry logic and authentication recovery
 */
export async function updateUserCredits(retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    
    // Prevent concurrent fetches
    if (creditsFetchInProgress && retryCount === 0) {
        console.log('💎 Credits fetch already in progress, skipping duplicate request');
        return;
    }
    
    creditsFetchInProgress = true;
    
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
        
        // Enhanced authentication state checking
        const isAuthenticated = window.authModule && window.authModule.isAuthenticated();
        const hasValidToken = localStorage.getItem('auth_token');
        
        console.log(`💎 Credit fetch attempt ${retryCount + 1}/${MAX_RETRIES + 1} - Auth: ${isAuthenticated}, Token: ${!!hasValidToken}`);
        
        if (isAuthenticated) {
            // Check if we should force refresh (e.g., after an upload)
            const shouldForceRefresh = retryCount === 0 && window._creditRefreshNeeded;
            if (shouldForceRefresh) {
                console.log('💎 Force refreshing credits after action...');
                delete window._creditRefreshNeeded;
            }
            
            // Always force refresh on first attempt to avoid stale cache after navigation/refresh
            const forceRefresh = shouldForceRefresh || retryCount === 0;
            if (forceRefresh && !shouldForceRefresh) {
                console.log('💎 Force refreshing credits on first attempt to avoid cache...');
            }
            
            const credits = await window.authModule.getUserCredits(forceRefresh);
            console.log(`💎 Credits fetched: ${credits}`);
            
            // Detect potential session invalidation issue
            if (credits === 0 && hasValidToken && retryCount < MAX_RETRIES) {
                console.warn(`⚠️ Credits returned 0 but user appears authenticated - potential session invalidation (retry ${retryCount + 1})`);
                
                // Wait and retry - this handles timing issues after server restart
                setTimeout(() => {
                    updateUserCredits(retryCount + 1);
                }, RETRY_DELAY * (retryCount + 1)); // Exponential backoff
                return;
            }
            
            // Force update the display with the fetched credits
            console.log(`💎 Updating credits display to: ${credits}`);
            updateCreditsDisplay(credits);
            
            // Also force update the auth module cache if needed
            if (window.authModule && window.authModule.user) {
                window.authModule.user.credits = credits;
            }
            
            // Show warning if credits are low (but not 0 due to technical issues)
            if (credits > 0 && credits < 20) {
                console.warn(`⚠️ Low credits: ${credits} remaining`);
                // Could show a subtle notification here
            }
            
            // If we successfully got credits after retries, clear any pending session recovery
            if (credits > 0 && retryCount > 0) {
                console.log(`✅ Credits recovered after ${retryCount} retries: ${credits}`);
            }
            
        } else if (hasValidToken && retryCount < MAX_RETRIES) {
            // We have a token but auth module says not authenticated - possible timing issue
            console.warn(`⚠️ Valid token found but not authenticated - waiting for auth recovery (retry ${retryCount + 1})`);
            
            // Wait for authentication to be established
            setTimeout(() => {
                updateUserCredits(retryCount + 1);
            }, RETRY_DELAY * (retryCount + 1));
            return;
            
        } else {
            // Genuinely not authenticated
            console.log(`💎 User not authenticated, setting credits to 0`);
            updateCreditsDisplay(0);
        }
        
    } catch (error) {
        console.error(`❌ Error updating credits display (attempt ${retryCount + 1}):`, error);
        
        // Retry on error if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
            console.log(`🔄 Retrying credit fetch in ${RETRY_DELAY * (retryCount + 1)}ms...`);
            setTimeout(() => {
                updateUserCredits(retryCount + 1);
            }, RETRY_DELAY * (retryCount + 1));
            return;
        }
        
        // Final fallback after all retries failed
        updateCreditsDisplay(0);
        console.error(`❌ Credit fetching failed after ${MAX_RETRIES} retries`);
    } finally {
        // Always reset the flag when done
        if (retryCount === 0 || retryCount >= MAX_RETRIES) {
            creditsFetchInProgress = false;
        }
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
            await showLowCreditsModal();
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
                    await showLowCreditsModal();
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