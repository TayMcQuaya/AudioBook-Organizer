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
    copySectionText
} from './modules/sections.js';

import { 
    showExportModal,
    hideExportModal
} from './modules/ui.js';

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
window.copySectionText = copySectionText;
window.showExportModal = showExportModal;
window.hideExportModal = hideExportModal;
window.startExport = startExport;
window.saveProgress = saveProgress;
window.loadProgress = loadProgress;
window.uploadBook = uploadBook;
window.smartSelect = smartSelect;
window.resetSmartSelectPosition = resetSmartSelectPosition;
window.toggleEditMode = toggleEditMode;
window.refreshEditModeState = refreshEditModeState;
window.getEditMode = getEditMode;
window.cleanupTextSelection = cleanupTextSelection;

// Enhanced showExportModal that initializes preview
window.showExportModal = function() {
    showExportModal();
    // Initialize preview after modal is shown
    setTimeout(() => {
        initializeExportPreview();
    }, 100);
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

function initialize() {
    console.log('🚀 Initializing AudioBook Organizer...');
    if (window.authModule) {
        initApp(window.authModule);
    } else {
        console.error('Auth module not found, cannot initialize app');
    }
}

function cleanup() {
    console.log('🧹 Cleaning up main application...');
    cleanupApp();
}

initialize();

export { initialize, cleanup };





 