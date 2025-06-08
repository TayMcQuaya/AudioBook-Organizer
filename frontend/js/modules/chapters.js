// AudioBook Organizer - Chapter Management

import { chapters, addChapter, removeChapter, findChapter, getNextColor, chapterPlayers } from './state.js';
import { formatDuration, getAccentColor } from '../utils/helpers.js';
import { updateChaptersList } from './ui.js';
import { showConfirm } from './notifications.js';
import { removeHighlightFromText } from './sections.js';

// Chapter Management - preserving exact logic from original
export function createNewChapter() {
    const chapter = {
        id: Date.now(),
        name: `Chapter ${chapters.length + 1}`,
        colorIndex: getNextColor(),
        sections: [],
        collapsed: false,
        description: '',
        totalDuration: 0
    };
    addChapter(chapter);
    updateChaptersList();
}

export function updateChapterName(chapterId, newName) {
    const chapter = findChapter(chapterId);
    if (chapter) {
        chapter.name = newName;
        updateChaptersList();
    }
}

export function toggleChapter(chapterId) {
    const chapter = findChapter(chapterId);
    if (chapter) {
        chapter.collapsed = !chapter.collapsed;
        updateChaptersList();
    }
}

export function deleteChapter(chapterId) {
    showConfirm(
        'Are you sure you want to delete this chapter and all its sections?',
        () => {
            // Remove all highlights for this chapter's sections first
            removeChapterHighlights(chapterId);
            
            // Remove the chapter from the data
            removeChapter(chapterId);
            updateChaptersList();
        },
        null, // No action needed on cancel
        'Delete Chapter', // Custom confirm text
        'Cancel' // Custom cancel text
    );
}

/**
 * Removes all visual highlights for sections belonging to a chapter
 * @param {number} chapterId - The ID of the chapter whose section highlights should be removed
 */
function removeChapterHighlights(chapterId) {
    const chapter = findChapter(chapterId);
    if (!chapter) return;
    
    // Remove highlights for all sections in this chapter
    chapter.sections.forEach(section => {
        removeHighlightFromText(section.id);
    });
}

export function playChapter(chapterId) {
    const chapter = findChapter(chapterId);
    if (!chapter || !chapter.sections.length) return;
    
    let currentIndex = 0;
    const audioElements = chapter.sections
        .filter(s => s.audioPath)
        .map(s => {
            const audio = new Audio(s.audioPath);
            audio.addEventListener('ended', () => {
                currentIndex++;
                if (currentIndex < chapter.sections.length) {
                    audio.src = chapter.sections[currentIndex].audioPath;
                    audio.play();
                }
            });
            return audio;
        });
    
    if (audioElements.length) {
        audioElements[0].play();
    }
}

export function calculateChapterDuration(chapter) {
    return chapter.sections.reduce((total, section) => {
        const audio = document.querySelector(`audio[src="${section.audioPath}"]`);
        return total + (audio ? audio.duration : 0);
    }, 0);
}

// Chapter Audio Player Class - preserving exact logic from original
export class ChapterAudioPlayer {
    constructor(chapterId) {
        this.chapterId = chapterId;
        this.currentSectionIndex = 0;
        this.isPlaying = false;
        this.audioElements = [];
        this.currentAudio = null;
        this.totalDuration = 0;
        this.currentTime = 0;
        
        this.initializeAudio();
    }
    
    initializeAudio() {
        const chapter = findChapter(this.chapterId);
        if (!chapter) return;
        
        // Create audio elements for each section
        this.audioElements = chapter.sections
            .filter(s => s.audioPath)
            .map(s => {
                const audio = new Audio(s.audioPath);
                audio.addEventListener('ended', () => this.playNextSection());
                audio.addEventListener('timeupdate', () => this.updateProgress());
                audio.addEventListener('loadedmetadata', () => {
                    this.totalDuration += audio.duration;
                    this.updateDurationDisplay();
                });
                return audio;
            });
            
        // Initialize UI elements
        this.playerElement = document.getElementById(`chapter-player-${this.chapterId}`);
        this.progressBar = document.getElementById(`chapter-progress-${this.chapterId}`);
        this.playIcon = document.getElementById(`chapter-play-icon-${this.chapterId}`);
        this.currentTimeDisplay = document.getElementById(`chapter-current-time-${this.chapterId}`);
        this.durationDisplay = document.getElementById(`chapter-duration-${this.chapterId}`);
        this.sectionsContainer = document.getElementById(`chapter-sections-${this.chapterId}`);
    }
    
    togglePlayback() {
        if (!this.audioElements.length) return;
        
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    play() {
        if (!this.audioElements.length) return;
        
        // Stop all other chapter players
        chapterPlayers.forEach((player, id) => {
            if (id !== this.chapterId) player.pause();
        });
        
        this.isPlaying = true;
        this.playerElement.classList.add('active');
        this.playIcon.textContent = '⏸️';
        
        if (!this.currentAudio) {
            this.currentAudio = this.audioElements[this.currentSectionIndex];
        }
        
        this.currentAudio.play();
        this.updateSectionHighlight();
    }
    
    pause() {
        if (this.currentAudio) {
            this.currentAudio.pause();
        }
        this.isPlaying = false;
        this.playIcon.textContent = '▶️';
    }
    
    playNextSection() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        
        this.currentSectionIndex++;
        if (this.currentSectionIndex < this.audioElements.length) {
            this.currentAudio = this.audioElements[this.currentSectionIndex];
            if (this.isPlaying) {
                this.currentAudio.play();
            }
            this.updateSectionHighlight();
        } else {
            this.stop();
        }
    }
    
    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        this.isPlaying = false;
        this.currentSectionIndex = 0;
        this.currentAudio = this.audioElements[0];
        this.playIcon.textContent = '▶️';
        this.updateProgress();
        this.playerElement.classList.remove('active');
        this.clearSectionHighlight();
    }
    
    seek(percentage) {
        if (!this.audioElements.length) return;
        
        const totalTime = percentage * this.totalDuration;
        let accumulatedTime = 0;
        let foundSection = false;
        
        // Stop current audio if playing
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        
        // Find the correct section and time
        for (let i = 0; i < this.audioElements.length; i++) {
            const audio = this.audioElements[i];
            if (accumulatedTime + audio.duration > totalTime) {
                // Clean up previous audio if different section
                if (this.currentSectionIndex !== i && this.currentAudio) {
                    this.currentAudio.pause();
                    this.currentAudio.currentTime = 0;
                }
                
                this.currentSectionIndex = i;
                this.currentAudio = audio;
                audio.currentTime = totalTime - accumulatedTime;
                
                if (this.isPlaying) {
                    audio.play();
                }
                
                foundSection = true;
                break;
            }
            accumulatedTime += audio.duration;
        }
        
        // If we didn't find a section (clicked at the very end)
        if (!foundSection && this.audioElements.length > 0) {
            this.currentSectionIndex = this.audioElements.length - 1;
            this.currentAudio = this.audioElements[this.currentSectionIndex];
            this.currentAudio.currentTime = this.currentAudio.duration;
        }
        
        this.updateSectionHighlight();
        this.updateProgress();
    }
    
    updateProgress() {
        if (!this.audioElements.length) return;
        
        // Calculate total progress
        let accumulatedTime = 0;
        for (let i = 0; i < this.currentSectionIndex; i++) {
            accumulatedTime += this.audioElements[i].duration;
        }
        if (this.currentAudio) {
            accumulatedTime += this.currentAudio.currentTime;
        }
        
        // Update progress bar and time display
        const progress = (accumulatedTime / this.totalDuration) * 100;
        this.progressBar.style.width = `${progress}%`;
        this.currentTimeDisplay.textContent = formatDuration(accumulatedTime);
    }
    
    updateDurationDisplay() {
        this.durationDisplay.textContent = formatDuration(this.totalDuration);
    }
    
    updateSectionHighlight() {
        const sections = this.sectionsContainer.children;
        Array.from(sections).forEach((section, index) => {
            section.classList.toggle('active', index === this.currentSectionIndex);
        });
    }
    
    clearSectionHighlight() {
        const sections = this.sectionsContainer.children;
        Array.from(sections).forEach(section => section.classList.remove('active'));
    }
}

export function toggleChapterPlayback(chapterId) {
    let player = chapterPlayers.get(chapterId);
    if (!player) {
        player = new ChapterAudioPlayer(chapterId);
        chapterPlayers.set(chapterId, player);
    }
    player.togglePlayback();
}

export function seekChapterAudio(event, chapterId) {
    const player = chapterPlayers.get(chapterId);
    if (!player) return;
    
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const percentage = (event.clientX - rect.left) / rect.width;
    player.seek(percentage);
} 