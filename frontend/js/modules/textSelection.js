// AudioBook Organizer - Text Selection Handlers Module

import { 
    showCharacterCounter, 
    hideSelectionTools, 
    positionManualSelectionTools,
    updateSelectionToolsOnScroll 
} from './selectionTools.js';

// Handle mouseup events for text selection
function handleMouseUp(e) {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Show character counter
        showCharacterCounter(text.length, rect);
        
        // Position manual selection tools
        positionManualSelectionTools(rect);
        
        // Update selection info
        document.getElementById('selectionLength').textContent = text.length;
        document.getElementById('selectionPreview').textContent = text;
        
        console.log(`Manual selection: ${text.length} characters`);
    } else {
        hideSelectionTools();
    }
}

// Handle mousedown events for clearing selection tools
function handleMouseDown(e) {
    const tools = document.getElementById('selection-tools');
    const charCounter = document.querySelector('.char-counter');
    
    // Hide tools if clicking outside and no active selection
    if (!tools.contains(e.target) && !window.getSelection().toString().trim()) {
        hideSelectionTools();
    }
}

// Handle scroll events for repositioning selection tools
function handleScroll() {
    updateSelectionToolsOnScroll();
}

// Initialize text selection event handlers
export function initializeTextSelection() {
    const bookContent = document.getElementById('bookContent');
    
    if (!bookContent) {
        console.warn('Book content element not found for text selection initialization');
        return;
    }
    
    // Add event listeners
    bookContent.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('scroll', handleScroll);
    
    console.log('Text selection handlers initialized');
}

// Remove text selection event handlers (useful for cleanup)
export function cleanupTextSelection() {
    const bookContent = document.getElementById('bookContent');
    
    if (bookContent) {
        bookContent.removeEventListener('mouseup', handleMouseUp);
    }
    
    document.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('scroll', handleScroll);
    
    console.log('Text selection handlers cleaned up');
} 