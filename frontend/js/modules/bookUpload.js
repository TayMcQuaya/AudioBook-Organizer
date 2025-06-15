// AudioBook Organizer - Book Upload Module

import { setBookText, clearChapters } from './state.js';
import { updateChaptersList, updateSelectionColor } from './ui.js';
import { initializeSmartSelect } from './smartSelect.js';
import { showError } from './notifications.js';
import { clearFormatting } from './formattingState.js';

// File validation constants
const MAX_FILE_SIZE_TXT = 10 * 1024 * 1024; // 10MB for TXT
const MAX_FILE_SIZE_DOCX = 25 * 1024 * 1024; // 25MB for DOCX
const ALLOWED_EXTENSIONS = ['.txt', '.docx'];

// Validate uploaded file
function validateFile(file) {
    const errors = [];
    
    if (!file) {
        errors.push('Please select a file first.');
        return errors;
    }
    
    // Determine file type and size limit
    const fileName = file.name.toLowerCase();
    const isDocx = fileName.endsWith('.docx');
    const isTxt = fileName.endsWith('.txt');
    const maxSize = isDocx ? MAX_FILE_SIZE_DOCX : MAX_FILE_SIZE_TXT;
    const sizeLimit = isDocx ? '25MB' : '10MB';
    
    if (file.size > maxSize) {
        errors.push(`File is too large. Maximum size is ${sizeLimit}.`);
    }
    
    if (!ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
        errors.push('Please upload a .txt or .docx file.');
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

// Show loading indicator with dynamic message
function showLoading(file = null) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        let message = 'Loading book content...';
        if (file && file.name.toLowerCase().endsWith('.docx')) {
            message = 'Processing DOCX file and extracting formatting...';
        }
        loadingIndicator.textContent = message;
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
function handleUploadSuccess(text, formattingData = null, metadata = null) {
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
    
    // Handle formatting data
    if (formattingData && formattingData.ranges && formattingData.ranges.length > 0) {
        console.log('📋 DOCX IMPORT DEBUG: Processing formatting data...');
        console.log('📋 DOCX IMPORT DEBUG: Text length:', text.length);
        console.log('📋 DOCX IMPORT DEBUG: Formatting ranges count:', formattingData.ranges.length);
        console.log('📋 DOCX IMPORT DEBUG: Sample ranges:', formattingData.ranges.slice(0, 3));
        
        // Validate formatting ranges against text length
        const invalidRanges = formattingData.ranges.filter(range => 
            range.start < 0 || range.end > text.length || range.start >= range.end
        );
        
        if (invalidRanges.length > 0) {
            console.warn('📋 DOCX IMPORT DEBUG: Found invalid ranges:', invalidRanges);
        }
        
        // Import and set formatting data from DOCX
        import('./formattingState.js').then(({ setFormattingData }) => {
            setFormattingData(formattingData);
            console.log(`✅ Loaded ${formattingData.ranges.length} formatting ranges from DOCX`);
            
            // Apply formatting to DOM with delay to ensure text is properly set
            setTimeout(() => {
                import('./formattingRenderer.js').then(({ applyFormattingToDOM }) => {
                    console.log('📋 DOCX IMPORT DEBUG: About to apply formatting. DOM text length:', bookContent.textContent.length);
                    applyFormattingToDOM();
                    console.log('✅ Applied DOCX formatting to DOM');
                }).catch(error => {
                    console.error('Error applying DOCX formatting:', error);
                });
            }, 100); // Small delay to ensure DOM is ready
        }).catch(error => {
            console.error('Error setting DOCX formatting data:', error);
        });
    } else {
        // Clear formatting for plain text files
        clearFormatting();
    }
    
    // Initialize smart select functionality
    initializeSmartSelect();
    
    hideLoading();
    hideError();
    
    // Log success with metadata
    if (metadata) {
        console.log(`📄 ${metadata.filename} uploaded successfully:`, {
            textLength: text.length,
            formattingRanges: formattingData?.ranges?.length || 0,
            processingTime: metadata.processing_time || 'N/A'
        });
    } else {
        console.log(`Book uploaded successfully: ${text.length} characters`);
    }
    
    // Refresh edit mode state after content change
    if (window.refreshEditModeState) {
        setTimeout(() => {
            window.refreshEditModeState();
        }, 100);
    }
}

// Process DOCX file on server
async function processDocxFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        // Get auth token - try multiple methods for reliability
        let authToken = window.authModule?.getAuthToken();
        
        // Fallback to localStorage if authModule not available
        if (!authToken) {
            authToken = localStorage.getItem('auth_token');
        }
        
        if (!authToken) {
            throw new Error('Authentication required for DOCX processing. Please sign in first.');
        }
        
        const response = await fetch('/api/upload/docx', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to process DOCX file');
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'DOCX processing failed');
        }
        
        return result;
        
    } catch (error) {
        console.error('DOCX processing error:', error);
        throw error;
    }
}

// Handle file reading error
function handleUploadError(error) {
    hideLoading();
    
    // Provide more specific error messages
    let errorMessage = 'Error processing file. Please try again.';
    
    if (error.message.includes('Authentication required')) {
        errorMessage = 'Please sign in to upload DOCX files.';
    } else if (error.message.includes('File too large')) {
        errorMessage = error.message;
    } else if (error.message.includes('Invalid DOCX')) {
        errorMessage = 'Invalid DOCX file. Please ensure the file is a valid Word document.';
    } else if (error.message.includes('Credits')) {
        errorMessage = 'Insufficient credits for DOCX processing. Please purchase more credits.';
    } else if (error.message) {
        errorMessage = error.message;
    }
    
    showError(errorMessage);
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
    showLoading(file);
    
    try {
        let text, formattingData = null, metadata = null;
        
        if (file.name.toLowerCase().endsWith('.docx')) {
            // Process DOCX with formatting
            console.log('📄 Processing DOCX file:', file.name);
            const result = await processDocxFile(file);
            text = result.text;
            formattingData = result.formatting_data;
            metadata = result.metadata;
            
            console.log(`✅ DOCX processed: ${text.length} chars, ${formattingData.ranges.length} formatting ranges`);
        } else {
            // Process TXT as before
            console.log('📄 Processing TXT file:', file.name);
            text = await readFileAsText(file);
        }
        
        handleUploadSuccess(text, formattingData, metadata);
        
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