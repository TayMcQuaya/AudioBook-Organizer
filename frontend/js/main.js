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
    removeAudio,
    clearMissingAudio,
    copySectionText
} from './modules/sections.js';

import { 
    showExportModal,
    hideExportModal
} from './modules/ui.js';

import { 
    showReorderModal,
    hideReorderModal,
    applyReorderChanges,
    cancelReorderChanges
} from './modules/reorder.js';

import { 
    startExport,
    initializeExportPreview
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

import { 
    toggleEditMode, 
    initializeEditProtection,
    refreshEditModeState,
    getEditMode 
} from './modules/editMode.js';

import { 
    uploadBook 
} from './modules/bookUpload.js';

import { 
    showSelectionTools, 
    hideSelectionTools, 
    clearTextSelection 
} from './modules/selectionTools.js';

import { initApp, cleanupApp } from './modules/appInitialization.js';

import { 
    cleanupTextSelection 
} from './modules/textSelection.js';

import { 
    initializeFormattingShortcuts,
    initializeSelectionTracking,
    initializeToolbarPositioning
} from './modules/formattingToolbar.js';

import { 
    initializeCommentsSystem
} from './modules/commentsSystem.js';

import { 
    toggleTableOfContents 
} from './modules/tableOfContents.js';

import testingModeUI from './modules/testingModeUI.js';

// Make functions globally available for HTML onclick handlers
// Async wrapper functions for onclick handlers
window.createNewChapter = async function() {
    try {
        await createNewChapter();
    } catch (error) {
        console.error('Error creating chapter:', error);
    }
};

window.createSection = async function() {
    try {
        await createSection();
    } catch (error) {
        console.error('Error creating section:', error);
    }
};

// Regular functions that don't need async wrappers
window.updateChapterName = updateChapterName;
window.toggleChapter = toggleChapter;
window.deleteChapter = deleteChapter;
window.toggleChapterPlayback = toggleChapterPlayback;
window.seekChapterAudio = seekChapterAudio;
window.updateSectionName = updateSectionName;
window.deleteSection = deleteSection;
window.navigateToSection = navigateToSection;
window.attachAudio = attachAudio;
window.removeAudio = removeAudio;
window.clearMissingAudio = clearMissingAudio;
window.copySectionText = copySectionText;
window.showExportModal = showExportModal;
window.hideExportModal = hideExportModal;
window.startExport = startExport;
window.showReorderModal = showReorderModal;
window.hideReorderModal = hideReorderModal;
window.applyReorderChanges = applyReorderChanges;
window.cancelReorderChanges = cancelReorderChanges;
window.saveProgress = saveProgress;
window.loadProgress = loadProgress;
window.uploadBook = uploadBook;
window.smartSelect = smartSelect;
window.resetSmartSelectPosition = resetSmartSelectPosition;
window.toggleEditMode = toggleEditMode;
window.refreshEditModeState = refreshEditModeState;
window.getEditMode = getEditMode;
window.cleanupTextSelection = cleanupTextSelection;
window.toggleTableOfContents = toggleTableOfContents;

// Enhanced showExportModal that initializes preview
window.showExportModal = function() {
    showExportModal();
    // Initialize preview after modal is shown
    setTimeout(() => {
        initializeExportPreview();
    }, 100);
};

// DEBUGGING: Add formatting diagnostics to global scope
window.debugFormatting = function() {
    import('./modules/formattingState.js').then(({ runFormattingSystemDiagnostics }) => {
        runFormattingSystemDiagnostics();
    }).catch(error => {
        console.error('Could not load formatting diagnostics:', error);
    });
};

// DEBUGGING: Quick test function
window.testFormatting = function() {
    console.log('🧪 QUICK FORMATTING TEST:');
    
    // Check if we're in edit mode
    if (!getEditMode()) {
        console.log('   - Not in edit mode. Please enter edit mode first.');
        return;
    }
    
    // Try to select some text and apply formatting
    const bookContent = document.getElementById('bookContent');
    if (!bookContent || bookContent.textContent.length < 20) {
        console.log('   - Need more text content to test.');
        return;
    }
    
    // Create a selection
    const range = document.createRange();
    const textNode = bookContent.firstChild;
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, Math.min(10, textNode.textContent.length));
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        console.log('   - Text selected:', selection.toString());
        
        // Test applying bold formatting
        setTimeout(() => {
            console.log('   - You can now click the Bold button to test formatting!');
            console.log('   - For nested formatting, apply Bold first, then select the same text and apply Italic');
        }, 100);
    }
};

// DEBUGGING: Test nested formatting fixes
window.testNestedFormatting = function() {
    import('./modules/formattingRenderer.js').then(({ testNestedFormatting }) => {
        testNestedFormatting();
    });
};

// DEBUGGING: Test persistence fixes
window.testPersistenceFix = function() {
    console.log('🧪 TESTING PERSISTENCE FIXES:');
    console.log('1. Apply some formatting');
    console.log('2. Exit edit mode and choose "Discard"');
    console.log('3. Re-enter edit mode');
    console.log('4. Check if formatting is gone (should be!)');
};

// Smart Select function - automatically selects configurable character chunks ending on periods
function smartSelect() {
    // Perform the smart selection
    const selection = performSmartSelect();
    
    if (selection) {
        // Highlight the selected text
        const highlighted = highlightSmartSelection(selection);
        console.log(`Highlighting result: ${highlighted}`);
        
        // Show selection tools using dedicated module
        showSelectionTools(selection);
        
        // Log warning if highlighting failed but tools are still shown
        if (!highlighted) {
            console.warn('Text highlighting failed, but selection tools are still available');
        }
    }
}

// Reset smart select position function
function resetSmartSelectPosition() {
    resetSmartSelect();
    hideSelectionTools();
    clearTextSelection();
    showSuccess('Smart selection position reset to the beginning!');
}

async function initialize() {
    console.log('🚀 Initializing AudioBook Organizer...');
    
    // **ENHANCED: Wait a moment for auth modules to be available after router init**
    // This handles the case where router initialization just completed
    if (!window.authModule && !window.tempAuthManager?.isTestingMode) {
        console.log('⏳ Waiting briefly for auth modules to be available...');
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Check if we're in testing mode or normal mode
    let authModuleToUse = null;
    
    if (window.tempAuthManager && window.tempAuthManager.isTestingMode) {
        console.log('🧪 Testing mode detected - using temp auth manager');
        authModuleToUse = window.tempAuthManager;
        
        // Initialize testing mode UI
        try {
            await testingModeUI.init();
            console.log('✅ Testing mode UI initialized');
        } catch (error) {
            console.error('❌ Failed to initialize testing mode UI:', error);
        }
    } else if (window.authModule) {
        console.log('🔑 Normal mode detected - using Supabase auth module');
        authModuleToUse = window.authModule;
    } else {
        console.warn('⚠️ No auth module found - proceeding with limited functionality');
        // In case no auth is available, we can still initialize the app
        authModuleToUse = { isAuthenticated: () => false }; // Mock auth for fallback with correct default
    }
    
    await initApp(authModuleToUse);
    
    // Initialize formatting system
    initializeFormattingShortcuts();
    initializeSelectionTracking();
    initializeToolbarPositioning();
    initializeCommentsSystem();
    
    console.log('✨ AudioBook Organizer main app initialized successfully');
}

function cleanup() {
    console.log('🧹 Cleaning up main application...');
    cleanupApp();
}

// Add CSS load verification
window.verifyCSSLoading = function() {
    console.log('🔍 Verifying CSS loading...');
    
    // Check if formatting.css is loaded
    const formattingStyles = Array.from(document.styleSheets)
        .find(sheet => sheet.href && sheet.href.includes('formatting.css'));
    
    console.log('Formatting CSS loaded:', !!formattingStyles);
    
    if (formattingStyles) {
        try {
            // Test element
            const testEl = document.createElement('div');
            testEl.className = 'fmt-bold';
            testEl.style.position = 'absolute';
            testEl.style.left = '-9999px';
            document.body.appendChild(testEl);
            
            const computedStyle = window.getComputedStyle(testEl);
            console.log('Test element styles:', {
                fontWeight: computedStyle.fontWeight,
                backgroundColor: computedStyle.backgroundColor
            });
            
            document.body.removeChild(testEl);
        } catch (error) {
            console.error('Error testing CSS:', error);
        }
    }
    
    // Check book content element
    const bookContent = document.getElementById('bookContent');
    if (bookContent) {
        console.log('Book content element:', {
            className: bookContent.className,
            computedStyle: window.getComputedStyle(bookContent)
        });
    }
};

// Run CSS verification on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.verifyCSSLoading, 1000);
});

// Formatting system test function (simplified)
window.testFormattingStyles = function() {
    console.log('🧪 Testing formatting styles...');
    
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) {
        console.log('❌ No book content found');
        return;
    }
    
    // Test each formatting type
    const testFormats = ['fmt-title', 'fmt-subtitle', 'fmt-section', 'fmt-subsection', 'fmt-bold', 'fmt-italic', 'fmt-underline'];
    
    testFormats.forEach(className => {
        const testEl = document.createElement('div');
        testEl.className = className;
        testEl.textContent = `Test ${className}`;
        testEl.style.position = 'absolute';
        testEl.style.left = '-9999px';
        bookContent.appendChild(testEl);
        
        const computedStyle = window.getComputedStyle(testEl);
        console.log(`✅ ${className}:`, {
            fontSize: computedStyle.fontSize,
            fontWeight: computedStyle.fontWeight,
            fontStyle: computedStyle.fontStyle,
            textDecoration: computedStyle.textDecoration
        });
        
        testEl.remove();
    });
    
    console.log('🧪 Formatting test complete');
};

// DEBUGGING: Check dark mode CSS
window.debugDarkMode = function() {
    console.log('🌙 DARK MODE DEBUG:');
    
    const html = document.documentElement;
    const hasDataTheme = html.getAttribute('data-theme');
    const currentTheme = window.themeManager?.getCurrentTheme();
    
    console.log('   - HTML data-theme attribute:', hasDataTheme);
    console.log('   - Theme manager current theme:', currentTheme);
    
    // Check CSS variables
    const computedStyle = window.getComputedStyle(html);
    const textPrimary = computedStyle.getPropertyValue('--text-primary');
    const bgPrimary = computedStyle.getPropertyValue('--bg-primary');
    
    console.log('   - --text-primary:', textPrimary);
    console.log('   - --bg-primary:', bgPrimary);
    
    // Test a specific element
    const bookContent = document.getElementById('bookContent');
    if (bookContent) {
        const bookStyles = window.getComputedStyle(bookContent);
        console.log('   - Book content color:', bookStyles.color);
        console.log('   - Book content background:', bookStyles.backgroundColor);
    }
    
    // Check if CSS is loaded
    const darkModeRules = Array.from(document.styleSheets)
        .flatMap(sheet => {
            try {
                return Array.from(sheet.cssRules || []);
            } catch (e) {
                return [];
            }
        })
        .filter(rule => rule.selectorText && rule.selectorText.includes('[data-theme="dark"]'));
    
    console.log('   - Dark mode CSS rules found:', darkModeRules.length);
    
    if (darkModeRules.length > 0) {
        console.log('   - Sample dark mode rule:', darkModeRules[0].selectorText);
    }
};

// DEBUGGING: Quick dark mode toggle
window.testDarkMode = function() {
    console.log('🧪 Testing dark mode toggle...');
    window.themeManager?.toggleTheme();
    setTimeout(() => {
        window.debugDarkMode();
    }, 100);
};

// Export the functions for the router to use
export { initialize, cleanup };

// Also make them available globally for fallback loading
window.initialize = initialize;
window.cleanup = cleanup;





 