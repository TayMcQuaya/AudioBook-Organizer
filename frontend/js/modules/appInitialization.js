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

let isInitialized = false;
let isInitializing = false;

/**
 * Cleanup function for the application
 */
export function cleanupApp() {
    if (!isInitialized) return;
    console.log('🧹 Cleaning up application resources...');

    // Stop auto-save functionality
    stopAutoSave();

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
    isInitializing = false;
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
        
        // Try to restore from database
        const restored = await loadFromDatabase();
        
        if (restored) {
            console.log('✅ Project restored successfully from database');
            return true;
        } else {
            console.log('📭 No previous project found, starting fresh');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error during project restoration:', error);
        return false;
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
    if (isInitialized || isInitializing) {
        console.log('App already initialized or initializing. Skipping.');
        return;
    }
    
    console.log('AudioBook Organizer - Initializing application...');
    isInitializing = true;
    
    try {
        // Initialize default state
        initializeDefaultState();
        
        // Show selection guide for new users
        showSelectionGuide();
        
        // Initialize all modules
        await initializeModules();
        
        // Try to restore latest project from database
        await restoreLatestProject();
        
        // Start auto-save functionality
        startAutoSave();
        
        // Handle URL hash navigation
        handleHashNavigation();
        
        // Mark as initialized
        isInitialized = true;
        window.isAppInitialized = true;
        console.log('AudioBook Organizer - Application ready!');
        
    } catch (error) {
        console.error('❌ Error during app initialization:', error);
        isInitialized = false;
        window.isAppInitialized = false;
    } finally {
        isInitializing = false;
    }
}

// Get initialization status (useful for debugging)
export function getInitializationStatus() {
    return {
        isInitialized,
        isInitializing,
        windowFlag: window.isAppInitialized,
        selectionGuideShown: localStorage.getItem('selectionGuideShown') === 'true',
        chaptersCount: chapters.length,
        isAuthenticated: sessionManager.isAuthenticated,
        timestamp: new Date().toISOString()
    };
} 