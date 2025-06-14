// AudioBook Organizer - Comments System

import { addComment, formattingData, resolveComment } from './formattingState.js';
import { applyFormattingToDOM } from './formattingRenderer.js';

let activeCommentPopup = null;

// Show comment creation dialog
export function showCommentDialog(position) {
    const dialog = document.createElement('div');
    dialog.className = 'comment-dialog';
    dialog.innerHTML = `
        <div class="comment-dialog-content">
            <h4>💬 Add Comment</h4>
            <textarea placeholder="Enter your comment here..." rows="4" cols="40" id="commentText"></textarea>
            <div class="comment-dialog-actions">
                <button id="saveComment" class="btn btn-primary">Save Comment</button>
                <button id="cancelComment" class="btn btn-secondary">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Focus textarea
    const textarea = dialog.querySelector('#commentText');
    textarea.focus();
    
    // Handle save
    dialog.querySelector('#saveComment').onclick = () => {
        const text = textarea.value.trim();
        if (text) {
            const comment = addComment(position, text);
            if (comment) {
                // Re-render to show comment
                applyFormattingToDOM();
                console.log(`Comment added at position ${position}: "${text}"`);
            }
        }
        document.body.removeChild(dialog);
    };
    
    // Handle cancel
    dialog.querySelector('#cancelComment').onclick = () => {
        document.body.removeChild(dialog);
    };
    
    // Handle escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(dialog);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    dialog.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleEscape);
    
    // Handle Enter to save (Ctrl+Enter)
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            dialog.querySelector('#saveComment').click();
        }
    });
}

// Show comment popup when clicking on comment indicator
export function showCommentPopup(commentId, x, y) {
    hideCommentPopup();
    
    const comment = formattingData.comments.find(c => c.id === commentId);
    if (!comment) {
        console.warn(`Comment not found: ${commentId}`);
        return;
    }
    
    const popup = document.createElement('div');
    popup.className = 'comment-popup';
    popup.innerHTML = `
        <div class="comment-text">${escapeHtml(comment.text)}</div>
        <div class="comment-meta">
            <span>${formatDate(comment.timestamp)}</span>
            <button onclick="window.resolveCommentFromUI('${commentId}')" class="resolve-btn">
                ${comment.resolved ? '✓ Resolved' : 'Resolve'}
            </button>
        </div>
    `;
    
    // Position popup
    popup.style.left = Math.min(x, window.innerWidth - 320) + 'px';
    popup.style.top = Math.max(y - 10, 10) + 'px';
    
    document.body.appendChild(popup);
    activeCommentPopup = popup;
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
        if (activeCommentPopup === popup) {
            hideCommentPopup();
        }
    }, 8000);
    
    console.log(`Showing comment popup for: "${comment.text.substring(0, 50)}..."`);
}

// Hide active comment popup
export function hideCommentPopup() {
    if (activeCommentPopup) {
        if (activeCommentPopup.parentNode) {
            activeCommentPopup.parentNode.removeChild(activeCommentPopup);
        }
        activeCommentPopup = null;
    }
}

// Resolve a comment (called from UI)
export function resolveCommentFromUI(commentId) {
    const success = resolveComment(commentId);
    if (success) {
        hideCommentPopup();
        // Re-render to update comment appearance
        applyFormattingToDOM();
        console.log(`Comment resolved: ${commentId}`);
    } else {
        console.warn(`Failed to resolve comment: ${commentId}`);
    }
}

// Initialize comment system event handlers
export function initializeCommentsSystem() {
    // Handle clicks on comment indicators
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('comment-indicator')) {
            e.preventDefault();
            e.stopPropagation();
            
            const commentId = e.target.dataset.commentId;
            const rect = e.target.getBoundingClientRect();
            showCommentPopup(commentId, rect.right + 10, rect.top);
        } else {
            // Hide popup when clicking elsewhere
            hideCommentPopup();
        }
    });
    
    // Handle keyboard shortcuts for comments
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideCommentPopup();
        }
    });
    
    // Make resolve function available globally for HTML onclick
    window.resolveCommentFromUI = resolveCommentFromUI;
    
    console.log('Comments system initialized');
}

// Get all comments for display/management
export function getAllComments() {
    return formattingData.comments.map(comment => ({
        ...comment,
        formattedDate: formatDate(comment.timestamp)
    }));
}

// Get active (unresolved) comments
export function getActiveComments() {
    return getAllComments().filter(comment => !comment.resolved);
}

// Get resolved comments
export function getResolvedComments() {
    return getAllComments().filter(comment => comment.resolved);
}

// Delete a comment entirely
export function deleteComment(commentId) {
    import('./formattingState.js').then(({ removeComment }) => {
        const success = removeComment(commentId);
        if (success) {
            hideCommentPopup();
            applyFormattingToDOM();
            console.log(`Comment deleted: ${commentId}`);
        }
        return success;
    });
}

// Export comments to text format
export function exportCommentsToText() {
    const comments = getAllComments();
    if (comments.length === 0) {
        return 'No comments found.';
    }
    
    let output = 'AudioBook Comments Export\n';
    output += '='.repeat(30) + '\n\n';
    
    const activeComments = comments.filter(c => !c.resolved);
    const resolvedComments = comments.filter(c => c.resolved);
    
    if (activeComments.length > 0) {
        output += `ACTIVE COMMENTS (${activeComments.length})\n`;
        output += '-'.repeat(20) + '\n\n';
        
        activeComments.forEach((comment, index) => {
            output += `${index + 1}. Position: ${comment.position}\n`;
            output += `   Date: ${comment.formattedDate}\n`;
            output += `   Comment: ${comment.text}\n\n`;
        });
    }
    
    if (resolvedComments.length > 0) {
        output += `\nRESOLVED COMMENTS (${resolvedComments.length})\n`;
        output += '-'.repeat(20) + '\n\n';
        
        resolvedComments.forEach((comment, index) => {
            output += `${index + 1}. Position: ${comment.position}\n`;
            output += `   Date: ${comment.formattedDate}\n`;
            output += `   Comment: ${comment.text}\n\n`;
        });
    }
    
    return output;
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) {
        return 'Just now';
    } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffMinutes < 1440) { // 24 hours
        const hours = Math.floor(diffMinutes / 60);
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (diffMinutes < 10080) { // 7 days
        const days = Math.floor(diffMinutes / 1440);
        return `${days} day${days === 1 ? '' : 's'} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Create a comments management panel (can be called from UI)
export function createCommentsPanel() {
    const panel = document.createElement('div');
    panel.id = 'commentsPanel';
    panel.className = 'comments-panel';
    
    const activeComments = getActiveComments();
    const resolvedComments = getResolvedComments();
    
    panel.innerHTML = `
        <div class="comments-panel-header">
            <h3>💬 Comments (${activeComments.length + resolvedComments.length})</h3>
            <button onclick="window.hideCommentsPanel()" class="close-btn">×</button>
        </div>
        <div class="comments-panel-content">
            ${activeComments.length > 0 ? `
                <div class="comments-section">
                    <h4>Active Comments (${activeComments.length})</h4>
                    ${activeComments.map(comment => `
                        <div class="comment-item">
                            <div class="comment-item-text">${escapeHtml(comment.text)}</div>
                            <div class="comment-item-meta">
                                Position: ${comment.position} • ${comment.formattedDate}
                                <button onclick="window.resolveCommentFromUI('${comment.id}')" class="resolve-btn">Resolve</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${resolvedComments.length > 0 ? `
                <div class="comments-section">
                    <h4>Resolved Comments (${resolvedComments.length})</h4>
                    ${resolvedComments.map(comment => `
                        <div class="comment-item resolved">
                            <div class="comment-item-text">${escapeHtml(comment.text)}</div>
                            <div class="comment-item-meta">
                                Position: ${comment.position} • ${comment.formattedDate} • ✓ Resolved
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${activeComments.length === 0 && resolvedComments.length === 0 ? `
                <div class="no-comments">
                    <p>No comments yet.</p>
                    <p>Select text and click the 💬 button in the formatting toolbar to add comments.</p>
                </div>
            ` : ''}
        </div>
        <div class="comments-panel-footer">
            <button onclick="window.exportComments()" class="btn btn-secondary">Export Comments</button>
        </div>
    `;
    
    // Position panel
    panel.style.position = 'fixed';
    panel.style.top = '20px';
    panel.style.right = '20px';
    panel.style.width = '350px';
    panel.style.maxHeight = '600px';
    panel.style.zIndex = '1001';
    panel.style.background = 'white';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '8px';
    panel.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
    panel.style.padding = '0';
    panel.style.overflow = 'hidden';
    
    document.body.appendChild(panel);
    
    // Make functions available globally
    window.hideCommentsPanel = () => {
        if (panel.parentNode) {
            panel.parentNode.removeChild(panel);
        }
    };
    
    window.exportComments = () => {
        const commentsText = exportCommentsToText();
        const blob = new Blob([commentsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `comments_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };
    
    return panel;
} 