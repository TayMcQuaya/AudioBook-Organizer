// AudioBook Organizer - App Initialization Module

import { chapters } from './state.js';
import { createNewChapter } from './chapters.js';
import { navigateToSection } from './sections.js';
import { updateSelectionColor, initializeModalHandlers } from './ui.js';
import { initializeTextSelection } from './textSelection.js';
import { initializeEditProtection } from './editMode.js';
import sessionManager from './sessionManager.js';
import appUI from './appUI.js';

let isInitialized = false;

/**
 * Cleanup function for the application
 */
export function cleanupApp() {
    if (!isInitialized) return;
    console.log('🧹 Cleaning up application resources...');

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

// Initialize all modules in correct order
async function initializeModules() {
    // Initialize session management first
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
    if (isInitialized) {
        console.log('App already initialized. Skipping.');
        return;
    }
    console.log('AudioBook Organizer - Initializing application...');
    
    // Initialize default state
    initializeDefaultState();
    
    // Show selection guide for new users
    showSelectionGuide();
    
    // Initialize all modules
    await initializeModules();
    
    // Handle URL hash navigation
    handleHashNavigation();
    
    isInitialized = true;
    console.log('AudioBook Organizer - Application ready!');
}

// Get initialization status (useful for debugging)
export function getInitializationStatus() {
    return {
        selectionGuideShown: localStorage.getItem('selectionGuideShown') === 'true',
        chaptersCount: chapters.length,
        isAuthenticated: sessionManager.isAuthenticated,
        timestamp: new Date().toISOString()
    };
} 