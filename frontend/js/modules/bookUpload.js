// AudioBook Organizer - Book Upload Module

import { setBookText, clearChapters } from './state.js';
import { updateChaptersList, updateSelectionColor } from './ui.js';
import { initializeSmartSelect } from './smartSelect.js';
import { showError } from './notifications.js';

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.txt'];

// Validate uploaded file
function validateFile(file) {
    const errors = [];
    
    if (!file) {
        errors.push('Please select a file first.');
        return errors;
    }
    
    if (file.size > MAX_FILE_SIZE) {
        errors.push('File is too large. Maximum size is 10MB.');
    }
    
    if (!ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
        errors.push('Please upload a .txt file.');
    }
    
    return errors;
}

// Hide error message in UI (keeping for backward compatibility with existing HTML)
function hideError() {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}

// Show loading indicator
function showLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
}

// Hide loading indicator
function hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

// Process successful file upload
function handleUploadSuccess(text) {
    const bookContent = document.getElementById('bookContent');
    
    // Update application state
    setBookText(text);
    if (bookContent) {
        bookContent.textContent = text;
    }
    
    // Reset chapters and UI
    clearChapters();
    updateChaptersList();
    updateSelectionColor();
    
    // Initialize smart select functionality
    initializeSmartSelect();
    
    hideLoading();
    hideError();
    
    console.log(`Book uploaded successfully: ${text.length} characters`);
    
    // Refresh edit mode state after content change
    if (window.refreshEditModeState) {
        setTimeout(() => {
            window.refreshEditModeState();
        }, 100);
    }
}

// Handle file reading error
function handleUploadError(error) {
    hideLoading();
    showError('Error reading file. Please try again.');
    console.error('File upload error:', error);
}

// Main book upload function
export async function uploadBook() {
    const fileInput = document.getElementById('bookFile');
    const bookContent = document.getElementById('bookContent');
    
    hideError();
    
    // Validate file
    const file = fileInput?.files?.[0];
    const validationErrors = validateFile(file);
    
    if (validationErrors.length > 0) {
        showError(validationErrors[0]);
        return;
    }
    
    // Clear current content and show loading
    if (bookContent) {
        bookContent.textContent = '';
    }
    showLoading();
    
    try {
        // Read file asynchronously
        const text = await readFileAsText(file);
        handleUploadSuccess(text);
    } catch (error) {
        handleUploadError(error);
    }
}

// Promisified FileReader
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        
        reader.onerror = function(e) {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
    });
}

// Initialize book upload functionality
export function initializeBookUpload() {
    console.log('Book upload module initialized');
}