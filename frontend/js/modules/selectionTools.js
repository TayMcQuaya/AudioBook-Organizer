// AudioBook Organizer - Selection Tools Module

import { clearSmartSelection } from './smartSelect.js';

// Selection tools positioning and display logic

// Show selection tools with positioning
export function showSelectionTools(selection, rect) {
    const tools = document.getElementById('selection-tools');
    const charCounter = document.querySelector('.char-counter');
    
    if (!tools || !charCounter) return;
    
    // Store selection data globally for createSection to access
    window.smartSelectionData = {
        text: selection.text,
        startPosition: selection.startPosition,
        endPosition: selection.endPosition,
        length: selection.length
    };
    
    // Update selection info
    document.getElementById('selectionLength').textContent = selection.length;
    document.getElementById('selectionPreview').textContent = selection.text;
    
    // Show tools (CSS handles centering for smart selections)
    tools.style.display = 'block';
    
    // Position character counter for smart selections
    showCharacterCounter(selection.length, rect);
    
    console.log('Selection tools shown');
}

// Show and position character counter
export function showCharacterCounter(length, rect = null) {
    const charCounter = document.querySelector('.char-counter');
    if (!charCounter) return;
    
    document.getElementById('charCount').textContent = length;
    charCounter.style.display = 'block';
    
    if (rect) {
        // Position relative to selection (manual selections)
        charCounter.style.position = 'absolute';
        charCounter.style.top = (window.scrollY + rect.top - 30) + 'px';
        charCounter.style.left = (rect.left + rect.width/2) + 'px';
        charCounter.style.transform = 'translateX(-50%)';
        charCounter.style.zIndex = '1000';
    } else {
        // Fixed position for smart selections
        charCounter.style.position = 'fixed';
        charCounter.style.top = '20px';
        charCounter.style.left = '50%';
        charCounter.style.transform = 'translateX(-50%)';
        charCounter.style.zIndex = '1000';
        charCounter.style.fontSize = '14px';
        charCounter.style.padding = '8px 16px';
        charCounter.style.borderRadius = '20px';
        charCounter.style.background = 'rgba(76, 175, 80, 0.9)';
        charCounter.style.color = 'white';
        charCounter.style.fontWeight = '600';
        charCounter.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        charCounter.style.backdropFilter = 'blur(10px)';
    }
}

// Hide selection tools
export function hideSelectionTools() {
    const tools = document.getElementById('selection-tools');
    const charCounter = document.querySelector('.char-counter');
    
    if (tools) {
        tools.style.display = 'none';
    }
    
    if (charCounter) {
        charCounter.style.display = 'none';
    }
    
    // Clear smart selection highlights if they exist
    clearSmartSelection();
    
    // Clear selection data
    if (window.smartSelectionData) {
        delete window.smartSelectionData;
    }
    
    // Clear any text selection
    if (window.getSelection) {
        window.getSelection().removeAllRanges();
    }
    
    console.log('Selection tools hidden and highlights cleared');
}

// Position manual selection tools based on viewport constraints
export function positionManualSelectionTools(rect) {
    const tools = document.getElementById('selection-tools');
    const charCounter = document.querySelector('.char-counter');
    
    if (!tools || !rect) return;
    
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    tools.style.display = 'block';
    tools.style.visibility = 'hidden';  // Hide while measuring
    const toolsRect = tools.getBoundingClientRect();
    
    // Calculate initial position
    let top = window.scrollY + rect.bottom + 10;
    let left = rect.left;
    
    // Ensure tools stay within viewport horizontally
    if (left + toolsRect.width > viewportWidth - 20) {
        left = viewportWidth - toolsRect.width - 20;
    }
    if (left < 20) {
        left = 20;
    }
    
    // Show above selection if in bottom 25% of viewport
    const bottomThreshold = viewportHeight * 0.75;
    if (rect.bottom > bottomThreshold) {
        top = window.scrollY + rect.top - toolsRect.height - 10;
        
        // If showing below would go off screen, show above
        if (top + toolsRect.height > window.scrollY + viewportHeight - 20) {
            top = window.scrollY + rect.top - toolsRect.height - 10;
        }
    }
    
    // Ensure minimum padding from top
    if (top < window.scrollY + 20) {
        top = window.scrollY + 20;
    }
    
    // Apply position and show
    tools.style.top = top + 'px';
    tools.style.left = left + 'px';
    tools.style.visibility = 'visible';
    
    console.log(`Manual selection tools positioned at ${left}, ${top}`);
}

// Update positions on scroll for manual selections
export function updateSelectionToolsOnScroll() {
    const tools = document.getElementById('selection-tools');
    const charCounter = document.querySelector('.char-counter');
    
    if (tools.style.display === 'block') {
        const selection = window.getSelection();
        if (selection.toString().trim()) {
            const rect = selection.getRangeAt(0).getBoundingClientRect();
            
            // Update character counter position
            charCounter.style.top = (window.scrollY + rect.top - 30) + 'px';
            charCounter.style.left = (rect.left + rect.width/2) + 'px';
            
            // Update tools position
            positionManualSelectionTools(rect);
        }
    }
}

// Clear text selection
export function clearTextSelection() {
    if (window.getSelection) {
        window.getSelection().removeAllRanges();
    }
} 