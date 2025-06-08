// AudioBook Organizer - UI Management

import { chapters, currentColorIndex, getNextColor } from './state.js';
import { calculateChapterDuration } from './chapters.js';
import { initializeDragAndDrop } from './sections.js';
import { formatDuration, getAccentColor } from '../utils/helpers.js';

// UI Updates - preserving exact logic from original
export function updateChaptersList() {
    const sectionsList = document.getElementById('sectionsList');
    sectionsList.innerHTML = chapters.map(chapter => `
        <div class="chapter-item" data-chapter-id="${chapter.id}">
            <div class="chapter-header" onclick="toggleChapter(${chapter.id})">
                <div class="chapter-collapse-icon ${chapter.collapsed ? 'collapsed' : ''}">▼</div>
                <div class="color-indicator" style="background-color: var(--section-color-${chapter.colorIndex}); border-color: ${getAccentColor(chapter.colorIndex)}"></div>
                <input type="text" value="${chapter.name}" 
                       onchange="updateChapterName(${chapter.id}, this.value)"
                       onclick="event.stopPropagation()"
                       class="chapter-title" />
                <div class="chapter-duration">${formatDuration(calculateChapterDuration(chapter))}</div>
                <div class="chapter-controls">
                    <button class="chapter-play-btn" onclick="event.stopPropagation(); toggleChapterPlayback(${chapter.id})">
                        <i>▶️</i>
                    </button>
                    <button onclick="event.stopPropagation(); deleteChapter(${chapter.id})">
                        <i>🗑️</i>
                    </button>
                </div>
            </div>
            <div class="chapter-audio-player" id="chapter-player-${chapter.id}">
                <div class="chapter-audio-controls">
                    <button class="chapter-play-btn" onclick="toggleChapterPlayback(${chapter.id})">
                        <i id="chapter-play-icon-${chapter.id}">▶️</i>
                    </button>
                    <div class="chapter-audio-time" id="chapter-current-time-${chapter.id}">0:00</div>
                    <div class="chapter-audio-progress" onclick="seekChapterAudio(event, ${chapter.id})">
                        <div class="chapter-audio-progress-bar" id="chapter-progress-${chapter.id}"></div>
                    </div>
                    <div class="chapter-audio-time" id="chapter-duration-${chapter.id}">0:00</div>
                </div>
                <div class="chapter-audio-sections" id="chapter-sections-${chapter.id}">
                    ${chapter.sections.filter(s => s.audioPath).map((section, index, array) => {
                        const width = (100 / array.length) + '%';
                        return `<div class="chapter-audio-section" style="width: ${width}" data-section-id="${section.id}"></div>`;
                    }).join('')}
                </div>
            </div>
            <div class="chapter-sections ${chapter.collapsed ? 'collapsed' : ''}" data-chapter-id="${chapter.id}">
                ${chapter.sections.map((section, index) => `
                    <div class="section-item section-color-${section.colorIndex}" 
                         data-section-id="${section.id}"
                         data-index="${index}"
                         draggable="true"
                         ondblclick="navigateToSection(${section.id})"
                         title="Double-click to locate in text">
                        <div class="section-header">
                            <div class="drag-handle">⋮⋮</div>
                            <div class="color-indicator" style="background-color: var(--section-color-${section.colorIndex}); border-color: ${getAccentColor(section.colorIndex)}"></div>
                            <input type="text" value="${section.name}" 
                                   onchange="updateSectionName(${section.id}, this.value)" 
                                   class="section-name" />
                            <span class="section-status">${section.status}</span>
                            <button class="copy-section-btn" onclick="copySectionText(${section.id})" title="Copy section text">
                                📋
                            </button>
                        </div>
                        <div class="section-text">${section.text}</div>
                        <div class="audio-controls">
                            ${section.audioPath ? `
                                <audio controls src="${section.audioPath}"></audio>
                                <button onclick="removeAudio(${chapter.id}, ${section.id})">Remove Audio</button>
                            ` : `
                                <input type="file" accept="audio/*" onchange="attachAudio(${chapter.id}, ${section.id}, this)">
                            `}
                            <button onclick="deleteSection(${chapter.id}, ${section.id})">Delete Section</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    initializeDragAndDrop();
}

export function updateSelectionColor() {
    const nextColor = getNextColor();
    const dot = document.getElementById('nextColorDot');
    if (dot) {
        dot.style.backgroundColor = `var(--section-color-${nextColor})`;
        dot.style.borderColor = getAccentColor(nextColor);
    }
}

// Modal functions - preserving exact logic from original
export function showExportModal() {
    document.getElementById('exportModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
}

export function hideExportModal() {
    document.getElementById('exportModal').style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
    document.getElementById('status').style.display = 'none';
    document.getElementById('status').textContent = '';
}

// Initialize modal click-outside-to-close functionality
export function initializeModalHandlers() {
    // Close modal when clicking outside
    const exportModal = document.getElementById('exportModal');
    if (exportModal) {
        exportModal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideExportModal();
            }
        });
    }
    
    console.log('Modal handlers initialized');
} 