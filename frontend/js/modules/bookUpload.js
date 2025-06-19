// AudioBook Organizer - Book Upload Module

import { setBookText, clearChapters } from './state.js';
import { updateChaptersList, updateSelectionColor } from './ui.js';
import { initializeSmartSelect } from './smartSelect.js';
import { showError } from './notifications.js';
import { clearFormatting } from './formattingState.js';
import { apiFetch } from './api.js';

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
    
    // Set file type based on metadata or formatting data presence
    const fileName = metadata?.filename || '';
    const fileType = fileName.toLowerCase().endsWith('.docx') || (formattingData && formattingData.ranges && formattingData.ranges.length > 0) ? 'docx' : 'txt';
    
    // Import and set file type
    import('./state.js').then(({ setCurrentFileType }) => {
        setCurrentFileType(fileType, fileName);
    }).catch(error => {
        console.error('Error setting file type:', error);
    });
    
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
    
    // Refresh Table of Contents with new content
    setTimeout(() => {
        if (window.refreshTableOfContents) {
            window.refreshTableOfContents();
        }
    }, 200); // Allow DOM to update
    
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

// Process DOCX file with hybrid approach (backend + frontend)
async function processDocxFileHybrid(file) {
    try {
        console.log('🔄 Starting hybrid DOCX processing...');
        
        // Import the new DOCX processor and HTML converter
        const { docxProcessor } = await import('./docxProcessor.js');
        const { htmlToFormattingConverter } = await import('./htmlToFormatting.js');
        
        // Process with both backend (for compatibility) and frontend (for rich content)
        const [backendResult, frontendResult] = await Promise.all([
            processDocxFile(file),  // Current backend system
            processDocxFileFrontend(file, docxProcessor, htmlToFormattingConverter)  // New frontend system
        ]);
        
        // Merge results intelligently
        const mergedResult = mergeDocxResults(backendResult, frontendResult);
        
        console.log('✅ Hybrid DOCX processing completed');
        return mergedResult;
        
    } catch (error) {
        console.error('❌ Hybrid DOCX processing failed:', error);
        // Fallback to backend-only processing
        console.log('🔄 Falling back to backend-only processing...');
        return await processDocxFile(file);
    }
}

// Process DOCX file with frontend mammoth.js
async function processDocxFileFrontend(file, docxProcessor, htmlToFormattingConverter) {
    try {
        console.log('🔄 Processing DOCX with mammoth.js...');
        
        // Extract rich content with mammoth.js
        const richResult = await docxProcessor.processRichContent(file);
        
        if (!richResult.success) {
            throw new Error(richResult.error || 'Frontend processing failed');
        }
        
        // Convert HTML to internal formatting system
        const converted = htmlToFormattingConverter.convert(richResult.html);
        
        console.log(`🔧 Frontend conversion result: ${converted.text.length} chars, ${converted.formattingRanges.length} ranges`);
        
        return {
            success: true,
            text: converted.text,
            formatting_data: {
                ranges: converted.formattingRanges,
                version: '2.0',
                source: 'frontend_mammoth'
            },
            metadata: {
                processing_method: 'frontend_mammoth',
                features: richResult.features,
                messages: richResult.messages
            }
        };
        
    } catch (error) {
        console.error('❌ Frontend DOCX processing failed:', error);
        return {
            success: false,
            error: error.message,
            text: '',
            formatting_data: { ranges: [] },
            metadata: { processing_method: 'frontend_mammoth_failed' }
        };
    }
}

// Merge backend and frontend DOCX processing results with perfect text alignment
function mergeDocxResults(backendResult, frontendResult) {
    console.log('🔄 Merging backend and frontend DOCX results...');
    
    // Smart base text selection - prefer the successful result with content
    const backendText = backendResult.text || '';
    const frontendText = frontendResult.text || '';
    
    console.log(`📊 Text lengths - Backend: ${backendText.length}, Frontend: ${frontendText.length}`);
    
    // Determine which processing was successful
    const backendSuccess = backendResult.success && backendText.length > 0;
    const frontendSuccess = frontendResult.success && frontendText.length > 0;
    
    console.log(`📊 Processing success - Backend: ${backendSuccess}, Frontend: ${frontendSuccess}`);
    
    // Choose the best text source
    let baseText, baseRanges, fallbackRanges;
    
    if (backendSuccess && frontendSuccess) {
        // Both succeeded - prefer backend for consistency but validate
        if (backendText.length >= frontendText.length * 0.8) {
            // Backend text is reasonable - use it
            baseText = backendText;
            baseRanges = backendResult.formatting_data?.ranges || [];
            fallbackRanges = frontendResult.formatting_data?.ranges || [];
            console.log('✅ Using backend as primary (both successful, backend text substantial)');
        } else {
            // Backend text seems incomplete - use frontend
            baseText = frontendText;
            baseRanges = frontendResult.formatting_data?.ranges || [];
            fallbackRanges = backendResult.formatting_data?.ranges || [];
            console.log('✅ Using frontend as primary (backend text incomplete)');
        }
    } else if (frontendSuccess) {
        // Only frontend succeeded
        baseText = frontendText;
        baseRanges = frontendResult.formatting_data?.ranges || [];
        fallbackRanges = backendResult.formatting_data?.ranges || [];
        console.log('✅ Using frontend as primary (backend failed)');
    } else if (backendSuccess) {
        // Only backend succeeded
        baseText = backendText;
        baseRanges = backendResult.formatting_data?.ranges || [];
        fallbackRanges = frontendResult.formatting_data?.ranges || [];
        console.log('✅ Using backend as primary (frontend failed)');
    } else {
        // Both failed - return empty result
        console.log('❌ Both processing methods failed');
        return {
            success: false,
            text: '',
            formatting_data: { ranges: [] },
            metadata: { processing_method: 'both_failed' }
        };
    }
    
    // Combine formatting ranges from both sources
    let mergedRanges = [...baseRanges];
    
    console.log(`🔍 Range counts - Base: ${baseRanges.length}, Fallback: ${fallbackRanges.length}`);
    
    // If we have both ranges and they're for different text lengths, try alignment
    if (fallbackRanges.length > 0 && baseText !== (backendSuccess && frontendSuccess ? 
        (baseText === backendText ? frontendText : backendText) : '')) {
        
        console.log('🔧 Attempting range alignment from fallback source...');
        
        const fallbackText = baseText === backendText ? frontendText : backendText;
        const textDiff = baseText.length - fallbackText.length;
        console.log(`📊 Character difference: ${textDiff}`);
        
        // For small differences (< 50 chars), use intelligent alignment
        if (Math.abs(textDiff) < 50) {
            console.log('🎯 Small text difference - using intelligent alignment');
            
            const alignedRanges = fallbackRanges
                .map((range, index) => {
                    // Get the text content that this range should format
                    const rangeText = fallbackText.substring(range.start, range.end);
                    
                    // Find this text in the base text
                    const baseIndex = baseText.indexOf(rangeText);
                    
                    if (baseIndex !== -1) {
                        // Found exact match - use base positions
                        return {
                            ...range,
                            start: baseIndex,
                            end: baseIndex + rangeText.length,
                            source: 'aligned_exact'
                        };
                    } else {
                        // No exact match - try proportional alignment
                        const progressRatio = range.start / fallbackText.length;
                        const newStart = Math.floor(progressRatio * baseText.length);
                        const rangeLength = range.end - range.start;
                        
                        const adjustedRange = {
                            ...range,
                            start: Math.max(0, Math.min(newStart, baseText.length - rangeLength)),
                            end: Math.max(0, Math.min(newStart + rangeLength, baseText.length)),
                            source: 'aligned_proportional'
                        };
                        
                        // Skip invalid ranges
                        if (adjustedRange.start >= adjustedRange.end) {
                            return null;
                        }
                        
                        return adjustedRange;
                    }
                })
                .filter(range => range !== null);
            
            // Add non-conflicting aligned ranges
            alignedRanges.forEach(alignedRange => {
                const hasConflict = mergedRanges.some(baseRange => 
                    baseRange.start <= alignedRange.start && 
                    baseRange.end >= alignedRange.end &&
                    baseRange.type === alignedRange.type
                );
                
                if (!hasConflict) {
                    mergedRanges.push(alignedRange);
                }
            });
            
            console.log(`📊 Added ${alignedRanges.length} aligned ranges from fallback`);
        }
    }
    
    // Sort ranges by position and validate
    mergedRanges.sort((a, b) => a.start - b.start);
    
    // Final validation pass
    mergedRanges = mergedRanges.filter(range => 
        range.start >= 0 && 
        range.end <= baseText.length && 
        range.start < range.end
    );
    
    console.log(`📊 Merged result: ${mergedRanges.length} total formatting ranges`);
    
    return {
        success: true,
        text: baseText,
        formatting_data: {
            ranges: mergedRanges,
            version: '2.0',
            source: 'hybrid_processing'
        },
        metadata: {
            processing_method: 'hybrid',
            primary_source: baseText === backendText ? 'backend' : 'frontend',
            backend_success: backendSuccess,
            frontend_success: frontendSuccess,
            backend_ranges: (backendResult.formatting_data?.ranges || []).length,
            frontend_ranges: (frontendResult.formatting_data?.ranges || []).length,
            merged_ranges: mergedRanges.length,
            text_length: baseText.length
        }
    };
}

// Process DOCX file with backend (for backward compatibility and plain text)
async function processDocxFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await apiFetch('/api/upload/docx', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to process DOCX file on backend');
        }

        return {
            success: true,
            text: data.text,
            formatting_data: data.formatting_data,
            metadata: data.metadata || { processing_method: 'backend' }
        };
    } catch (error) {
        console.error('❌ Backend DOCX processing error:', error);
        return {
            success: false,
            error: `Backend processing failed: ${error.message}`,
            text: '',
            formatting_data: { ranges: [] },
            metadata: { processing_method: 'backend_failed' }
        };
    }
}

// Handle file upload errors (e.g., network issues, server errors)
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
            // Pause session check during DOCX processing to prevent logout
            if (window.tempAuthManager?.pauseNextSessionCheck) {
                window.tempAuthManager.pauseNextSessionCheck();
            }
            
            // Process DOCX with enhanced hybrid approach
            console.log('📄 Processing DOCX file with hybrid approach:', file.name);
            const result = await processDocxFileHybrid(file);
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