// AudioBook Organizer - Application State

// Global application state - preserving exact structure from original
export let bookText = '';
export let chapters = [];
export let currentColorIndex = 1;
export const MAX_COLORS = 8;

// Chapter audio players map
export const chapterPlayers = new Map();

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