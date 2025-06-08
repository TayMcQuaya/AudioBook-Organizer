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

import { 
    toggleEditMode, 
    initializeEditProtection 
} from './modules/editMode.js';

import { 
    uploadBook 
} from './modules/bookUpload.js';

import { 
    showSelectionTools, 
    hideSelectionTools, 
    clearTextSelection 
} from './modules/selectionTools.js';



import { 
    initializeApp 
} from './modules/appInitialization.js';

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
window.toggleEditMode = toggleEditMode;



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



// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);





 