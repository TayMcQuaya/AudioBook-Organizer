// AudioBook Organizer - Application State

// Global application state - preserving exact structure from original
export let bookText = '';
export let chapters = [];
export let currentColorIndex = 1;
export const MAX_COLORS = 8;

// File type tracking for different edit mode behaviors
export let currentFileType = 'txt'; // 'txt' or 'docx'
export let currentFileName = '';

// Chapter audio players map
export const chapterPlayers = new Map();

// Table of Contents state
export let tocState = {
    isVisible: false,
    headers: [],
    activeHeaderId: null,
    isScrolling: false
};

// Auto-save functionality
let triggerAutoSaveFunction = null;

// Set the auto-save trigger function (called from storage.js)
export function setAutoSaveTrigger(triggerFunction) {
    triggerAutoSaveFunction = triggerFunction;
}

// Helper function to trigger auto-save when state changes
function triggerAutoSaveIfEnabled() {
    if (triggerAutoSaveFunction && typeof triggerAutoSaveFunction === 'function') {
        triggerAutoSaveFunction();
    }
}

// State setters with auto-save triggers
export function setBookText(text) {
    bookText = text;
    triggerAutoSaveIfEnabled();
}

export function setChapters(newChapters) {
    chapters = newChapters;
    triggerAutoSaveIfEnabled();
}

export function setCurrentColorIndex(index) {
    currentColorIndex = index;
    triggerAutoSaveIfEnabled();
}

// File type management
export function setCurrentFileType(fileType, fileName = '') {
    currentFileType = fileType;
    currentFileName = fileName;
    
    // **SECURITY FIX: Removed filename logging to prevent exposure**
    console.log(`📁 File type set to: ${currentFileType}`);
    
    triggerAutoSaveIfEnabled();
}

export function getCurrentFileType() {
    return currentFileType;
}

export function getCurrentFileName() {
    return currentFileName;
}

export function isDocxFile() {
    return currentFileType === 'docx';
}

export function isTxtFile() {
    return currentFileType === 'txt';
}

export function addChapter(chapter) {
    chapters.push(chapter);
    triggerAutoSaveIfEnabled();
}

export function removeChapter(chapterId) {
    chapters = chapters.filter(c => c.id !== chapterId);
    triggerAutoSaveIfEnabled();
}

export function findChapter(chapterId) {
    return chapters.find(c => c.id === chapterId);
}

export function clearChapters() {
    chapters = [];
    triggerAutoSaveIfEnabled();
}

// Color management - preserving exact logic from original
export function getNextColor() {
    const nextColor = currentColorIndex;
    currentColorIndex = currentColorIndex % MAX_COLORS + 1;
    return nextColor;
}

// TOC state management
export function setTOCVisible(visible) {
    tocState.isVisible = visible;
}

export function setTOCHeaders(headers) {
    tocState.headers = headers;
}

export function setActiveHeader(headerId) {
    tocState.activeHeaderId = headerId;
}

export function setTOCScrolling(isScrolling) {
    tocState.isScrolling = isScrolling;
}

// Make state module available globally for storage access
if (typeof window !== 'undefined') {
    window.stateModule = {
        getCurrentFileType,
        getCurrentFileName,
        isDocxFile,
        isTxtFile
    };
} 