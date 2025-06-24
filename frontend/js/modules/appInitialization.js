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

// Initialize all modules in correct order
async function initializeModules() {
    // Initialize temporary auth manager first (for testing mode)
    await tempAuthManager.init();
    
    // Make tempAuthManager globally accessible for storage module
    window.tempAuthManager = tempAuthManager;
    
    // Initialize theme manager
    themeManager.init();
    
    // Initialize session management
    await sessionManager.init();
    
    // Initialize UI manager after session manager
    await appUI.init();
    
    // Initialize UI handlers
    initializeModalHandlers();
    
    // Initialize text interaction
    initializeTextSelection();
    
    // Initialize edit mode protection
    initializeEditProtection();
    
    // Initialize credit system after authentication is ready
    console.log('🔄 Initializing credit system...');
    try {
        const { initializeCreditsDisplay, updateUserCredits } = await import('./appUI.js');
        
        // Always show credit display (in testing mode or when authenticated)
        initializeCreditsDisplay();
        
        if (window.authModule && window.authModule.isAuthenticated()) {
            await updateUserCredits();
            console.log('✅ Credit system initialized with real user data');
        } else if (tempAuthManager.isTestingMode) {
            // In testing mode, show demo credits
            const { updateCreditsDisplay } = await import('./ui.js');
            updateCreditsDisplay(100); // Show 100 demo credits
            console.log('✅ Credit system initialized with demo data (testing mode)');
        } else {
            console.log('✅ Credit system UI initialized (no auth)');
        }
    } catch (error) {
        console.error('❌ Credit system initialization failed:', error);
    }
    
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
    
    try {
        // Initialize default state
        initializeDefaultState();
        
        // Show selection guide for new users
        showSelectionGuide();
        
        // Initialize all modules
        await initializeModules();
        
        // Try to restore latest project from database
        await restoreLatestProject();
        
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
        console.log('✅ AudioBook Organizer - Application ready!');
        
    } catch (error) {
        console.error('❌ Error during app initialization:', error);
        isInitialized = false;
        window.isAppInitialized = false;
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