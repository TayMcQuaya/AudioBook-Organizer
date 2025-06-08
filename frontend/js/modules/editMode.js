// AudioBook Organizer - Edit Mode Module

import { setBookText } from './state.js';
import { showSuccess, showInfo } from './notifications.js';

// Edit mode state
let isEditMode = false;

// Edit protection event handlers
let protectionHandlers = {
    input: null,
    paste: null,
    drop: null,
    keydown: null
};

// Get edit mode state
export function getEditMode() {
    return isEditMode;
}

// Toggle edit mode function
export function toggleEditMode() {
    const bookContent = document.getElementById('bookContent');
    const toggleBtn = document.getElementById('toggleEditBtn');
    const btnIcon = toggleBtn.querySelector('i');
    const btnText = document.getElementById('editModeText');
    
    if (!bookContent || !toggleBtn) return;
    
    isEditMode = !isEditMode;
    
    if (isEditMode) {
        // Enter Edit Mode
        bookContent.classList.add('edit-mode');
        toggleBtn.classList.add('edit-active');
        btnIcon.textContent = '📝';
        btnText.textContent = 'Edit Mode';
        
        // Remove edit protection
        removeEditProtection();
        
        // Focus the content area
        bookContent.focus();
        
        showInfo('Edit mode enabled! You can now modify the book text.');
        
    } else {
        // Exit Edit Mode  
        bookContent.classList.remove('edit-mode');
        toggleBtn.classList.remove('edit-active');
        btnIcon.textContent = '👁';
        btnText.textContent = 'View Mode';
        
        // Re-apply edit protection
        applyEditProtection();
        
        // Update the bookText state with current content
        setBookText(bookContent.textContent);
        
        showSuccess('View mode enabled! Text is now protected from accidental changes.');
    }
    
    console.log(`Edit mode: ${isEditMode ? 'ON' : 'OFF'}`);
}

// Initialize book content protection system
export function initializeEditProtection() {
    // Create the protection handlers
    protectionHandlers.input = function(e) {
        if (!isEditMode) {
            e.preventDefault();
            return false;
        }
    };
    
    protectionHandlers.paste = function(e) {
        if (!isEditMode) {
            e.preventDefault();
            return false;
        }
    };
    
    protectionHandlers.drop = function(e) {
        if (!isEditMode) {
            e.preventDefault();
            return false;
        }
    };
    
    protectionHandlers.keydown = function(e) {
        if (!isEditMode) {
            // Allow cursor movement keys but prevent text input
            const allowedKeys = [
                'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                'Home', 'End', 'PageUp', 'PageDown',
                'Tab', 'Escape'
            ];
            
            if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                return false;
            }
        }
    };
    
    // Apply initial protection
    applyEditProtection();
    
    console.log('Edit protection system initialized');
}

// Apply edit protection
function applyEditProtection() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return;
    
    bookContent.addEventListener('input', protectionHandlers.input);
    bookContent.addEventListener('paste', protectionHandlers.paste);
    bookContent.addEventListener('drop', protectionHandlers.drop);
    bookContent.addEventListener('keydown', protectionHandlers.keydown);
    
    console.log('Edit protection applied');
}

// Remove edit protection  
function removeEditProtection() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return;
    
    bookContent.removeEventListener('input', protectionHandlers.input);
    bookContent.removeEventListener('paste', protectionHandlers.paste);
    bookContent.removeEventListener('drop', protectionHandlers.drop);
    bookContent.removeEventListener('keydown', protectionHandlers.keydown);
    
    console.log('Edit protection removed');
} 