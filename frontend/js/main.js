// AudioBook Organizer - Main Application Entry Point

// Import all modules
import { 
    bookText, 
    chapters, 
    currentColorIndex, 
    setBookText, 
    setChapters, 
    setCurrentColorIndex,
    clearChapters,
    getNextColor 
} from './modules/state.js';

import { 
    createNewChapter, 
    updateChapterName, 
    toggleChapter, 
    deleteChapter,
    toggleChapterPlayback,
    seekChapterAudio
} from './modules/chapters.js';

import { 
    createSection, 
    updateSectionName, 
    deleteSection, 
    navigateToSection,
    attachAudio,
    removeAudio
} from './modules/sections.js';

import { 
    updateChaptersList, 
    updateSelectionColor,
    showExportModal,
    hideExportModal
} from './modules/ui.js';

import { 
    startExport 
} from './modules/export.js';

import { 
    saveProgress, 
    loadProgress 
} from './modules/storage.js';

import { 
    performSmartSelect, 
    highlightSmartSelection, 
    resetSmartSelect,
    initializeSmartSelect 
} from './modules/smartSelect.js';

import { findTextNodeWithContent } from './utils/helpers.js';
import { showSuccess } from './modules/notifications.js';

// Make functions globally available for HTML onclick handlers
window.createNewChapter = createNewChapter;
window.updateChapterName = updateChapterName;
window.toggleChapter = toggleChapter;
window.deleteChapter = deleteChapter;
window.toggleChapterPlayback = toggleChapterPlayback;
window.seekChapterAudio = seekChapterAudio;
window.createSection = createSection;
window.updateSectionName = updateSectionName;
window.deleteSection = deleteSection;
window.navigateToSection = navigateToSection;
window.attachAudio = attachAudio;
window.removeAudio = removeAudio;
window.showExportModal = showExportModal;
window.hideExportModal = hideExportModal;
window.startExport = startExport;
window.saveProgress = saveProgress;
window.loadProgress = loadProgress;
window.uploadBook = uploadBook;
window.smartSelect = smartSelect;
window.resetSmartSelectPosition = resetSmartSelectPosition;

// Book upload function - preserving exact logic from original
async function uploadBook() {
    const fileInput = document.getElementById('bookFile');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const bookContent = document.getElementById('bookContent');
    
    errorMessage.style.display = 'none';
    
    if (!fileInput.files || fileInput.files.length === 0) {
        errorMessage.textContent = 'Please select a file first.';
        errorMessage.style.display = 'block';
        return;
    }

    const file = fileInput.files[0];
    
    if (file.size > 10 * 1024 * 1024) {
        errorMessage.textContent = 'File is too large. Maximum size is 10MB.';
        errorMessage.style.display = 'block';
        return;
    }

    if (!file.name.toLowerCase().endsWith('.txt')) {
        errorMessage.textContent = 'Please upload a .txt file.';
        errorMessage.style.display = 'block';
        return;
    }

    loadingIndicator.style.display = 'block';
    bookContent.textContent = '';

    try {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            setBookText(e.target.result);
            bookContent.textContent = bookText;
            clearChapters();
            updateChaptersList();
            updateSelectionColor(); // Initialize selection color
            loadingIndicator.style.display = 'none';
            
            // Initialize smart select functionality
            initializeSmartSelect();
        };
        
        reader.onerror = function(e) {
            loadingIndicator.style.display = 'none';
            errorMessage.textContent = 'Error reading file. Please try again.';
            errorMessage.style.display = 'block';
        };

        reader.readAsText(file);
    } catch (error) {
        loadingIndicator.style.display = 'none';
        errorMessage.textContent = 'Error uploading file: ' + error.message;
        errorMessage.style.display = 'block';
    }
}

// Smart Select function - automatically selects 3000-character chunks ending on periods
function smartSelect() {
    // Perform the smart selection
    const selection = performSmartSelect();
    
    if (selection) {
        // Highlight the selected text
        const highlighted = highlightSmartSelection(selection);
        
                // Always show selection tools, regardless of highlighting success
        console.log(`Highlighting result: ${highlighted}`);
        
        // Show the selection tools with the smart-selected text
        const tools = document.getElementById('selection-tools');
        const charCounter = document.querySelector('.char-counter');
        
        if (tools) {
                // Store smart selection data globally for createSection to access
                window.smartSelectionData = {
                    text: selection.text,
                    startPosition: selection.startPosition,
                    endPosition: selection.endPosition,
                    length: selection.length
                };
                
                // Update selection info with full text (not truncated)
                document.getElementById('selectionLength').textContent = selection.length;
                document.getElementById('selectionPreview').textContent = selection.text;
                
                console.log('Showing centered selection tools...');
                
                // Simply show the tools - CSS handles the centering
                tools.style.display = 'block';
                
                console.log('Tools should now be centered via CSS');
            }
            
            if (charCounter) {
                // Position character counter at top center of viewport for consistency
                document.getElementById('charCount').textContent = selection.length;
                charCounter.style.display = 'block';
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
            
        // Show success message if highlighting failed but tools are still shown
        if (!highlighted) {
            console.warn('Text highlighting failed, but selection tools are still available');
        }
    }
}

// Reset smart select position function
function resetSmartSelectPosition() {
    resetSmartSelect();
    
    // Hide selection tools if they're showing
    const tools = document.getElementById('selection-tools');
    const charCounter = document.querySelector('.char-counter');
    
    if (tools) {
        tools.style.display = 'none';
    }
    
    if (charCounter) {
        charCounter.style.display = 'none';
    }
    
    // Clear text selection
    if (window.getSelection) {
        window.getSelection().removeAllRanges();
    }
    
    showSuccess('Smart selection position reset to the beginning!');
}

// Initialize when the page loads - preserving exact logic from original
document.addEventListener('DOMContentLoaded', function() {
    updateSelectionColor();
    if (chapters.length === 0) {
        createNewChapter();
    }
    
    // Show selection guide on first visit
    if (!localStorage.getItem('selectionGuideShown')) {
        const selectionGuide = document.getElementById('selectionGuide');
        if (selectionGuide) {
            selectionGuide.style.display = 'block';
            localStorage.setItem('selectionGuideShown', 'true');
            
            setTimeout(() => {
                selectionGuide.style.display = 'none';
            }, 5000);
        }
    }
    
    // Initialize text selection handlers
    initializeTextSelection();
    
    // Initialize modal handlers
    initializeModalHandlers();
    
    // Handle direct links to sections
    if (window.location.hash) {
        const sectionId = window.location.hash.replace('#section-', '');
        if (sectionId) {
            setTimeout(() => navigateToSection(sectionId), 500);
        }
    }
});

// Text selection handlers - preserving exact logic from original
function initializeTextSelection() {
    document.getElementById('bookContent').addEventListener('mouseup', function(e) {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        const tools = document.getElementById('selection-tools');
        const charCounter = document.querySelector('.char-counter');
        
        if (text) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Update and position the character counter
            document.getElementById('charCount').textContent = text.length;
            charCounter.style.display = 'block';
            charCounter.style.top = (window.scrollY + rect.top - 30) + 'px';
            charCounter.style.left = (rect.left + rect.width/2) + 'px';
            charCounter.style.transform = 'translateX(-50%)';
            
            // Position the selection tools
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            tools.style.display = 'block';
            tools.style.visibility = 'hidden';  // Hide it while we measure
            const toolsRect = tools.getBoundingClientRect();
            
            // Calculate initial position
            let top = window.scrollY + rect.bottom + 10;
            let left = rect.left;
            
            // Ensure the tools stay within viewport horizontally
            if (left + toolsRect.width > viewportWidth - 20) {
                left = viewportWidth - toolsRect.width - 20;
            }
            if (left < 20) {
                left = 20;
            }
            
            // Always show the tools above the selection if we're in the bottom 25% of the viewport
            const bottomThreshold = viewportHeight * 0.75;
            if (rect.bottom > bottomThreshold) {
                top = window.scrollY + rect.top - toolsRect.height - 10;
            
                // If showing below selection would go off screen, show above
                if (top + toolsRect.height > window.scrollY + viewportHeight - 20) {
                    top = window.scrollY + rect.top - toolsRect.height - 10;
                }
            }
            
            // If showing above would go off screen, ensure minimum padding from top
            if (top < window.scrollY + 20) {
                top = window.scrollY + 20;
            }
            
            // Position and show the tools
            tools.style.top = top + 'px';
            tools.style.left = left + 'px';
            tools.style.visibility = 'visible';
            
            document.getElementById('selectionLength').textContent = text.length;
            document.getElementById('selectionPreview').textContent = text;
        } else {
            tools.style.display = 'none';
            charCounter.style.display = 'none';
        }
    });

    document.addEventListener('mousedown', function(e) {
        const tools = document.getElementById('selection-tools');
        const charCounter = document.querySelector('.char-counter');
        if (!tools.contains(e.target) && !window.getSelection().toString().trim()) {
            tools.style.display = 'none';
            charCounter.style.display = 'none';
        }
    });

    document.addEventListener('scroll', function() {
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
                const toolsRect = tools.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;
                
                let top = window.scrollY + rect.bottom + 10;
                let left = rect.left;
                
                if (left + toolsRect.width > viewportWidth - 20) {
                    left = viewportWidth - toolsRect.width - 20;
                }
                if (left < 20) {
                    left = 20;
                }
                
                const bottomThreshold = viewportHeight * 0.75;
                if (rect.bottom > bottomThreshold) {
                    top = window.scrollY + rect.top - toolsRect.height - 10;
                    
                    if (top + toolsRect.height > window.scrollY + viewportHeight - 20) {
                        top = window.scrollY + rect.top - toolsRect.height - 10;
                    }
                }
                
                if (top < window.scrollY + 20) {
                    top = window.scrollY + 20;
                }
                
                tools.style.top = top + 'px';
                tools.style.left = left + 'px';
            }
        }
    });
}

// Modal handlers - preserving exact logic from original
function initializeModalHandlers() {
    // Close modal when clicking outside
    const exportModal = document.getElementById('exportModal');
    if (exportModal) {
        exportModal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideExportModal();
            }
        });
    }
} 