// AudioBook Organizer - App Initialization Module

import { chapters } from './state.js';
import { createNewChapter } from './chapters.js';
import { navigateToSection } from './sections.js';
import { updateSelectionColor, initializeModalHandlers } from './ui.js';
import { initializeTextSelection } from './textSelection.js';
import { initializeEditProtection } from './editMode.js';
import sessionManager from './sessionManager.js';
import appUI from './appUI.js';
import themeManager from './themeManager.js';
import { loadFromDatabase, startAutoSave, stopAutoSave } from './storage.js';
import { initializeTableOfContents, cleanupTableOfContents } from './tableOfContents.js';

let isInitialized = false;

/**
 * Cleanup function for the application
 */
export function cleanupApp() {
    if (!isInitialized) return;
    console.log('🧹 Cleaning up application resources...');

    // Stop auto-save functionality
    stopAutoSave();

    // Clean up Table of Contents
    cleanupTableOfContents();

    // Clean up text selection listeners
    if (window.cleanupTextSelection) {
        window.cleanupTextSelection();
        console.log('...text selection cleaned up.');
    }

    // Clean up UI elements like user navigation
    if (window.appUI) {
        window.appUI.removeUserNavigation();
        console.log('...user navigation removed.');
    }
    
    // You could add more cleanup here, e.g., removing other listeners
    
    isInitialized = false;
    window.isAppInitialized = false;
    console.log('✅ Application cleanup complete.');
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
        
        // Check if user is authenticated
        if (!window.authModule?.isAuthenticated()) {
            console.log('👤 User not authenticated, skipping project restoration');
            return false;
        }
        
        // Check if we already have content (avoid overwriting user's current work)
        if (chapters.length > 0 || document.getElementById('bookContent')?.textContent?.trim()) {
            console.log('📝 Current project exists, skipping auto-restoration');
            return false;
        }
        
        // Show loading indicator
        showLoadingIndicator('Restoring your project...');
        
        // Try to restore from database
        const restored = await loadFromDatabase();
        
        // Hide loading indicator
        hideLoadingIndicator();
        
        if (restored) {
            console.log('✅ Project restored successfully from database');
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
    // Initialize theme manager first
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
        initializeTableOfContents();
        
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