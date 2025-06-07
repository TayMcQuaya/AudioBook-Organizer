// AudioBook Organizer - Application State

// Global application state - preserving exact structure from original
export let bookText = '';
export let chapters = [];
export let currentColorIndex = 1;
export const MAX_COLORS = 8;

// Chapter audio players map
export const chapterPlayers = new Map();

// State setters
export function setBookText(text) {
    bookText = text;
}

export function setChapters(newChapters) {
    chapters = newChapters;
}

export function setCurrentColorIndex(index) {
    currentColorIndex = index;
}

export function addChapter(chapter) {
    chapters.push(chapter);
}

export function removeChapter(chapterId) {
    chapters = chapters.filter(c => c.id !== chapterId);
}

export function findChapter(chapterId) {
    return chapters.find(c => c.id === chapterId);
}

export function clearChapters() {
    chapters = [];
}

// Color management - preserving exact logic from original
export function getNextColor() {
    const nextColor = currentColorIndex;
    currentColorIndex = currentColorIndex % MAX_COLORS + 1;
    return nextColor;
} 