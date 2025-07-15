// AudioBook Organizer - App Initialization Module

import { chapters } from './state.js';
import { createNewChapter } from './chapters.js';
import { navigateToSection } from './sections.js';
import { updateSelectionColor, initializeModalHandlers } from './ui.js';
import { initializeTextSelection } from './textSelection.js';
import { initializeEditProtection } from './editMode.js';
import { sessionManager } from './sessionManager.js';
import appUI from './appUI.js';
import themeManager from './themeManager.js';
import { loadFromDatabase, startAutoSave, stopAutoSave } from './storage.js';
import { initializeTableOfContents, cleanupTableOfContents } from './tableOfContents.js';
import { tempAuthManager } from './tempAuth.js';
import { initializeCreditsDisplay, updateUserCredits } from './appUI.js';
import './profileModal.js';
import { initializeCreditCosts } from './creditConfig.js';
import { showError } from './notifications.js';

let isInitialized = false;

/**
 * Cleanup function for the application
 */
export function cleanupApp(fullCleanup = false) {
    if (!isInitialized) return;
    console.log('🧹 Cleaning up application resources...', fullCleanup ? '(full cleanup)' : '(minimal cleanup)');

    // Always stop auto-save functionality and clean up listeners
    stopAutoSave();
    cleanupTableOfContents();

    // Clean up text selection listeners
    if (window.cleanupTextSelection) {
        window.cleanupTextSelection();
        console.log('...text selection cleaned up.');
    }

    if (fullCleanup) {
        // Full cleanup - completely destroy app state (only for permanent exits)
        if (window.appUI) {
            window.appUI.removeUserNavigation();
            console.log('...user navigation removed.');
        }
        
        isInitialized = false;
        window.isAppInitialized = false;
        console.log('✅ Application full cleanup complete.');
    } else {
        // Minimal cleanup - preserve app state and initialization flags for quick re-initialization
        // DON'T reset isInitialized or window.isAppInitialized - this allows fast navigation
        console.log('✅ Application minimal cleanup complete - app state preserved.');
    }
}

// Show selection guide overlay for first-time users
function showSelectionGuide() {
    if (!localStorage.getItem('selectionGuideShown')) {
        const selectionGuide = document.getElementById('selectionGuide');
        if (selectionGuide) {
            selectionGuide.style.display = 'block';
            localStorage.setItem('selectionGuideShown', 'true');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                selectionGuide.style.display = 'none';
            }, 5000);
            
            console.log('Selection guide shown to first-time user');
        }
    }
}

// Handle direct links to sections via URL hash
function handleHashNavigation() {
    if (window.location.hash) {
        const sectionId = window.location.hash.replace('#section-', '');
        if (sectionId) {
            // Delay navigation to ensure DOM is ready
            setTimeout(() => {
                navigateToSection(sectionId);
                console.log(`Navigating to section: ${sectionId}`);
            }, 500);
        }
    }
}

// Initialize default state if needed
function initializeDefaultState() {
    // Update selection color indicator
    updateSelectionColor();
    
    // Don't create any default chapters - start with clean state
    console.log('Application initialized with clean state');
}

// **REVERTED: Back to the original blocking restoration with optimizations**
// User preferred the blocking message, just wanted it faster
async function restoreLatestProject() {
    try {
        console.log('🔄 Attempting to restore latest project...');
        
        // **FIXED: Enhanced authentication check with state waiting**
        let isAuthenticated = false;
        
        if (tempAuthManager.isTestingMode) {
            // In testing mode, check temp auth
            isAuthenticated = tempAuthManager.isAuthenticated;
            console.log('Testing mode - auth status:', isAuthenticated);
        } else {
            // In normal mode, check multiple auth sources and wait if needed
            console.log('🔍 Checking authentication status from multiple sources...');
            
            // Check immediate auth state
            const authModuleAuth = window.authModule?.isAuthenticated();
            const sessionManagerAuth = window.sessionManager?.isAuthenticated;
            const hasStoredToken = !!localStorage.getItem('supabase.auth.token') || 
                                 !!sessionStorage.getItem('supabase.auth.token');
            
            console.log('🔍 Auth check results:', {
                authModule: authModuleAuth,
                sessionManager: sessionManagerAuth,
                hasStoredToken: hasStoredToken
            });
            
            // If we have stored tokens but no active session, wait a bit for session restoration
            if (hasStoredToken && !authModuleAuth && !sessionManagerAuth) {
                console.log('🔄 Found stored tokens but no active session - waiting for session restoration...');
                
                // Wait up to 2 seconds for authentication to be established
                for (let i = 0; i < 20; i++) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    const newAuthCheck = window.authModule?.isAuthenticated() || window.sessionManager?.isAuthenticated;
                    if (newAuthCheck) {
                        console.log(`✅ Authentication established after ${(i + 1) * 100}ms wait`);
                        isAuthenticated = true;
                        break;
                    }
                }
                
                if (!isAuthenticated) {
                    console.log('⏰ Timeout waiting for authentication - proceeding as unauthenticated');
                }
            } else {
                isAuthenticated = authModuleAuth || sessionManagerAuth;
            }
            
            console.log('Normal mode - final auth status:', isAuthenticated);
        }
        
        if (!isAuthenticated) {
            console.log('👤 User not authenticated, skipping project restoration');
            console.log('ℹ️ This is why you don\'t see the "restoring your project" message');
            return false;
        }
        
        // Check if we already have content (avoid overwriting user's current work)
        const hasChapters = chapters.length > 0;
        const hasContent = document.getElementById('bookContent')?.textContent?.trim();
        if (hasChapters || hasContent) {
            console.log('📝 Current project exists, skipping auto-restoration');
            console.log(`ℹ️ Chapters: ${chapters.length}, Content: ${hasContent ? 'Yes' : 'No'}`);
            console.log('ℹ️ This is why you don\'t see the "restoring your project" message');
            return false;
        }
        
        // **IMPROVED: Show loading message with minimum display time**
        const loadingMessage = tempAuthManager.isTestingMode ? 
            'Restoring your work...' : 
            'Restoring your project...';
        console.log(`📢 Showing restoration message: "${loadingMessage}"`);
        showLoadingIndicator(loadingMessage);
        
        // **FIXED: Ensure minimum display time so user can see the message**
        const startTime = Date.now();
        const minimumDisplayTime = 800; // Show for at least 800ms
        
        // **PERFORMANCE: Reduced delay for faster restoration**
        const restored = await loadFromDatabase();
        
        // Calculate how long to wait to reach minimum display time
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minimumDisplayTime - elapsedTime);
        
        // Wait for remaining time if needed
        if (remainingTime > 0) {
            console.log(`⏱️ Waiting ${remainingTime}ms more to ensure message visibility`);
            await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        // Hide loading indicator
        hideLoadingIndicator();
        console.log('✅ Restoration message hidden');
        
        if (restored) {
            const storageType = tempAuthManager.isTestingMode ? 'browser storage' : 'database';
            console.log(`✅ Project restored successfully from ${storageType}`);
            return true;
        } else {
            console.log('📭 No previous project found, starting fresh');
            return false;
        }
    } catch (error) {
        console.error('❌ Project restoration failed:', error);
        
        // Make sure to hide loading indicator on error
        hideLoadingIndicator();
        
        // Show error to user
        showError('Failed to restore project. You can still use the app.');
        return false;
    }
}

// Show loading indicator
function showLoadingIndicator(message = 'Loading...') {
    // Create or update loading indicator
    let loadingEl = document.getElementById('app-loading-indicator');
    if (!loadingEl) {
        loadingEl = document.createElement('div');
        loadingEl.id = 'app-loading-indicator';
        loadingEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px 30px;
            border-radius: 8px;
            z-index: 10000;
            font-family: system-ui, sans-serif;
            display: flex;
            align-items: center;
            gap: 15px;
        `;
        
        loadingEl.innerHTML = `
            <div style="
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            <span id="loading-message">${message}</span>
        `;
        
        // Add CSS animation
        if (!document.getElementById('loading-spinner-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-spinner-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(loadingEl);
    } else {
        document.getElementById('loading-message').textContent = message;
        loadingEl.style.display = 'flex';
    }
}

// Hide loading indicator
function hideLoadingIndicator() {
    const loadingEl = document.getElementById('app-loading-indicator');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

// Wait for authentication to be fully established before proceeding
async function waitForAuthenticationStability() {
    const MAX_WAIT_TIME = 3000; // Reduced from 10000ms - 3 seconds max wait
    const CHECK_INTERVAL = 200; // Reduced from 500ms - check every 200ms for faster response
    const startTime = Date.now();
    
    console.log('🔄 Waiting for authentication stability...');
    
    while (Date.now() - startTime < MAX_WAIT_TIME) {
        // Check multiple authentication sources for consistency
        const authModuleAuth = window.authModule?.isAuthenticated();
        const sessionManagerAuth = window.sessionManager?.isAuthenticated;
        const hasValidToken = !!localStorage.getItem('auth_token');
        const authModuleUser = window.authModule?.getCurrentUser?.();
        const sessionManagerUser = window.sessionManager?.user;
        
        // Debug logging for auth state
        console.log(`🔍 Auth check: AuthModule=${authModuleAuth}, SessionManager=${sessionManagerAuth}, Token=${hasValidToken}, User=${!!(authModuleUser || sessionManagerUser)}`);
        
        // Case 1: User is clearly not authenticated (stable state)
        if (!authModuleAuth && !sessionManagerAuth && !hasValidToken) {
            console.log('✅ Authentication stable: User not authenticated');
            return;
        }
        
        // Case 2: User is clearly authenticated with all systems in agreement (stable state)
        if (authModuleAuth && sessionManagerAuth && hasValidToken && (authModuleUser || sessionManagerUser)) {
            console.log('✅ Authentication stable: User fully authenticated');
            return;
        }
        
        // **OPTIMIZED: Case 3: Accept partial authentication if token exists and at least one system is authenticated**
        // This prevents unnecessary waiting when authentication is actually working
        if (hasValidToken && (authModuleAuth || sessionManagerAuth)) {
            console.log('✅ Authentication stable: Partial auth detected but functional');
            return;
        }
        
        // Case 4: Mixed state - wait for stability but with shorter intervals
        console.log('⏳ Authentication state inconsistent, waiting for stability...');
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    }
    
    // **ENHANCED: After timeout, make a final decision instead of hanging**
    const finalAuthState = window.authModule?.isAuthenticated() || window.sessionManager?.isAuthenticated;
    const finalToken = !!localStorage.getItem('auth_token');
    
    console.log(`⚠️ Authentication stability timeout reached. Final state: Auth=${finalAuthState}, Token=${finalToken}`);
    
    // If we have any sign of authentication, proceed anyway
    if (finalAuthState || finalToken) {
        console.log('✅ Proceeding with partial authentication state');
    } else {
        console.log('✅ Proceeding as unauthenticated user');
    }
}

// Initialize all modules in correct order
async function initializeModules() {
    console.log('🔄 Starting parallel module initialization...');
    
    // **OPTIMIZED: Run independent initializations in parallel**
    const parallelInitPromises = [];
    
    // Initialize temporary auth manager first (required for other modules)
    await tempAuthManager.init();
    
    // Make tempAuthManager globally accessible for storage module
    window.tempAuthManager = tempAuthManager;
    
    // **PARALLEL: Initialize independent modules**
    parallelInitPromises.push(
        // Theme manager (independent)
        (async () => {
            themeManager.init();
            console.log('✅ Theme manager initialized');
        })(),
        
        // Credit costs configuration (independent)
        (async () => {
            try {
                await initializeCreditCosts();
                console.log('✅ Credit costs configuration loaded');
            } catch (error) {
                console.warn('⚠️ Failed to initialize credit costs:', error);
            }
        })(),
        
        // Stripe service pre-initialization (independent)
        (async () => {
            try {
                console.log('🔄 Pre-initializing Stripe service...');
                const stripeModule = await import('./stripe.js');
                const { ensureStripeServiceGlobal } = stripeModule;
                ensureStripeServiceGlobal();
                console.log('✅ Stripe service pre-initialized and globally available');
            } catch (error) {
                console.warn('⚠️ Stripe service pre-initialization failed (this is normal in testing mode):', error.message);
            }
        })(),
        
        // **NEW: Profile modal preloading (prevents race condition)**
        (async () => {
            try {
                console.log('🔄 Pre-loading profile modal...');
                const profileModule = await import('./profileModal.js');
                console.log('✅ Profile modal pre-loaded and globally available');
            } catch (error) {
                console.warn('⚠️ Profile modal pre-loading failed:', error.message);
            }
        })()
    );
    
    // Wait for all parallel operations
    await Promise.all(parallelInitPromises);
    
    // Session manager is already initialized by the router - don't re-initialize
    // This prevents race conditions and double initialization issues
    if (!window.sessionManager) {
        console.warn('⚠️ Session manager not found - router initialization may have failed');
        // Only initialize if router hasn't done it yet (fallback)
        await sessionManager.init();
    } else {
        console.log('✅ Using session manager initialized by router');
    }
    
    // **OPTIMIZED: Reduce authentication stability wait time**
    console.log('🔄 Ensuring authentication is fully established...');
    await waitForAuthenticationStability();
    
    // Initialize UI manager after session manager AND authentication stability
    await appUI.init();
    
    // **PARALLEL: Initialize UI handlers and features**
    const uiInitPromises = [
        // Initialize UI handlers
        (async () => {
            initializeModalHandlers();
            console.log('✅ Modal handlers initialized');
        })(),
        
        // Initialize text interaction
        (async () => {
            initializeTextSelection();
            console.log('✅ Text selection initialized');
        })(),
        
        // Initialize edit mode protection
        (async () => {
            initializeEditProtection();
            console.log('✅ Edit protection initialized');
        })()
    ];
    
    // Wait for all UI operations
    await Promise.all(uiInitPromises);
    
    console.log('✅ All modules initialized successfully');
}

// Main application initialization
export async function initApp() {
    // Prevent double initialization
    if (isInitialized) {
        console.log('App already initialized. Skipping.');
        return;
    }
    
    console.log('📱 AudioBook Organizer - Initializing application...');
    
    // Add initialization class to body to prevent display issues during loading
    document.body.classList.add('app-initializing');
    
    try {
        // Initialize default state
        initializeDefaultState();
        
        // Show selection guide for new users
        showSelectionGuide();
        
        // Initialize all modules
        await initializeModules();
        
        // **REVERTED: Keep project restoration blocking as user requested**
        // User liked the blocking message, just wanted it faster
        console.log('📂 Starting project restoration (blocking as requested)...');
        await restoreLatestProject();
        
        // After project restoration, update credits display
        console.log('💎 Project restored, updating credits display...');
        updateUserCredits();
        
        // Initialize Table of Contents
        console.log('📋 Initializing Table of Contents...');
        try {
            // Small delay to ensure DOM is fully stable
            await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 100ms
            initializeTableOfContents();
            console.log('✅ Table of Contents initialized successfully');
        } catch (error) {
            console.error('❌ Table of Contents initialization failed:', error);
            // Don't fail the entire app if TOC fails
        }
        
        // Start auto-save functionality
        startAutoSave();
        
        // Handle URL hash navigation
        handleHashNavigation();
        
        // **OPTIMIZED: Mark as initialized and ready**
        isInitialized = true;
        window.isAppInitialized = true;
        
        // Remove initialization class to show app is ready
        document.body.classList.remove('app-initializing');
        
        console.log('✅ AudioBook Organizer - Application ready!');
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        document.body.classList.remove('app-initializing');
        // Show error to user
        showError('Failed to initialize application. Please refresh the page.');
    }
}

// Get initialization status (useful for debugging)
export function getInitializationStatus() {
    return {
        isInitialized,
        windowFlag: window.isAppInitialized,
        selectionGuideShown: localStorage.getItem('selectionGuideShown') === 'true',
        chaptersCount: chapters.length,
        isAuthenticated: sessionManager.isAuthenticated,
        timestamp: new Date().toISOString()
    };
} 