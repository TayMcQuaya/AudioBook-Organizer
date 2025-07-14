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

// Restore latest project from database
async function restoreLatestProject() {
    try {
        console.log('🔄 Attempting to restore latest project...');
        
        // Check authentication based on mode
        let isAuthenticated = false;
        if (tempAuthManager.isTestingMode) {
            // In testing mode, check temp auth
            isAuthenticated = tempAuthManager.isAuthenticated;
            console.log('Testing mode - auth status:', isAuthenticated);
        } else {
            // In normal mode, check Supabase auth
            isAuthenticated = window.authModule?.isAuthenticated();
            console.log('Normal mode - auth status:', isAuthenticated);
        }
        
        if (!isAuthenticated) {
            console.log('👤 User not authenticated, skipping project restoration');
            return false;
        }
        
        // Check if we already have content (avoid overwriting user's current work)
        if (chapters.length > 0 || document.getElementById('bookContent')?.textContent?.trim()) {
            console.log('📝 Current project exists, skipping auto-restoration');
            return false;
        }
        
        // Show loading indicator
        const loadingMessage = tempAuthManager.isTestingMode ? 
            'Restoring your work...' : 
            'Restoring your project...';
        showLoadingIndicator(loadingMessage);
        
        // Try to restore from appropriate storage
        const restored = await loadFromDatabase();
        
        // Hide loading indicator
        hideLoadingIndicator();
        
        if (restored) {
            const storageType = tempAuthManager.isTestingMode ? 'browser storage' : 'database';
            console.log(`✅ Project restored successfully from ${storageType}`);
            return true;
        } else {
            console.log('📭 No previous project found, starting fresh');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error during project restoration:', error);
        hideLoadingIndicator();
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
    const MAX_WAIT_TIME = 10000; // 10 seconds max wait
    const CHECK_INTERVAL = 500; // Check every 500ms
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
        
        // Case 3: Mixed state - wait for stability
        console.log('⏳ Authentication state inconsistent, waiting for stability...');
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    }
    
    // If we timeout, log the final state and continue
    const finalAuthState = {
        authModule: window.authModule?.isAuthenticated(),
        sessionManager: window.sessionManager?.isAuthenticated,
        token: !!localStorage.getItem('auth_token'),
        user: !!(window.authModule?.getCurrentUser?.() || window.sessionManager?.user)
    };
    
    console.warn('⚠️ Authentication stability timeout reached, proceeding with current state:', finalAuthState);
}

// Initialize all modules in correct order
async function initializeModules() {
    // Initialize temporary auth manager first (for testing mode)
    await tempAuthManager.init();
    
    // Make tempAuthManager globally accessible for storage module
    window.tempAuthManager = tempAuthManager;
    
    // Initialize theme manager
    themeManager.init();
    
    // Session manager is already initialized by the router - don't re-initialize
    // This prevents race conditions and double initialization issues
    if (!window.sessionManager) {
        console.warn('⚠️ Session manager not found - router initialization may have failed');
        // Only initialize if router hasn't done it yet (fallback)
        await sessionManager.init();
    } else {
        console.log('✅ Using session manager initialized by router');
    }
    
    // **NEW: Wait for authentication to be fully established before UI initialization**
    console.log('🔄 Ensuring authentication is fully established...');
    await waitForAuthenticationStability();
    
    // Initialize UI manager after session manager AND authentication stability
    await appUI.init();
    
    // Initialize UI handlers
    initializeModalHandlers();
    
    // Initialize text interaction
    initializeTextSelection();
    
    // Initialize edit mode protection
    initializeEditProtection();
    
    // **NEW: Pre-initialize Stripe service for better page refresh handling**
    console.log('🔄 Pre-initializing Stripe service...');
    try {
        const stripeModule = await import('./stripe.js');
        const { ensureStripeServiceGlobal } = stripeModule;
        ensureStripeServiceGlobal();
        console.log('✅ Stripe service pre-initialized and globally available');
    } catch (error) {
        console.warn('⚠️ Stripe service pre-initialization failed (this is normal in testing mode):', error.message);
    }
    
    // Credit system is already initialized in appUI.init() - skip duplicate initialization
    console.log('✅ Credit system already initialized via appUI.init()');
    
    console.log('All modules initialized');
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
        
        // **PERFORMANCE: Start project restoration in background (non-blocking)**
        // This allows the app to be usable while large projects are being restored
        restoreLatestProject().catch(error => {
            console.error('❌ Background project restoration failed:', error);
        });
        
        // Initialize Table of Contents
        console.log('📋 Initializing Table of Contents...');
        try {
            // Small delay to ensure DOM is fully stable
            await new Promise(resolve => setTimeout(resolve, 100));
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
        
        // Mark as initialized
        isInitialized = true;
        window.isAppInitialized = true;
        
        // Remove initialization class to show app is ready
        document.body.classList.remove('app-initializing');
        document.body.classList.add('app-ready');
        
        console.log('✅ AudioBook Organizer - Application ready!');
        
    } catch (error) {
        console.error('❌ Error during app initialization:', error);
        isInitialized = false;
        window.isAppInitialized = false;
        
        // Remove initialization class even on error
        document.body.classList.remove('app-initializing');
        document.body.classList.add('app-error');
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