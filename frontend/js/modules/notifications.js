// AudioBook Organizer - Custom Notifications Module
// Replaces standard alert() with design-matched popup windows

/**
 * Shows a custom notification popup that matches the app's design
 * @param {string} message - The message to display
 * @param {string} type - The type of notification: 'info', 'success', 'warning', 'error'
 * @param {number} duration - Auto-close duration in milliseconds (0 = no auto-close)
 */
export function showNotification(message, type = 'info', duration = 4000) {
    // Remove any existing notification
    removeExistingNotification();

    // Create backdrop overlay
    const backdrop = document.createElement('div');
    backdrop.id = 'notification-backdrop';
    backdrop.className = 'notification-backdrop';
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'custom-notification';
    notification.className = `notification notification-${type}`;
    
    // Get icon based on type
    const icons = {
        info: '💡',
        success: '✅',
        warning: '⚠️',
        error: '❌'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-header">
                <div class="notification-icon">${icons[type]}</div>
                <div class="notification-title">${getTitle(type)}</div>
                <button class="notification-close" onclick="closeNotification()">×</button>
            </div>
            <div class="notification-message">${message}</div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(backdrop);
    document.body.appendChild(notification);
    
    // Add CSS if not already added
    addNotificationStyles();
    
    // Show with animation
    setTimeout(() => {
        backdrop.classList.add('notification-backdrop-show');
        notification.classList.add('notification-show');
    }, 10);
    
    // Auto-close if duration is set
    if (duration > 0) {
        setTimeout(() => {
            closeNotification();
        }, duration);
    }
    
    // Make close function global
    window.closeNotification = closeNotification;
}

/**
 * Gets the appropriate title for each notification type
 */
function getTitle(type) {
    const titles = {
        info: 'Information',
        success: 'Success',
        warning: 'Warning',
        error: 'Error'
    };
    return titles[type] || 'Notification';
}

/**
 * Closes the current notification
 */
function closeNotification() {
    const notification = document.getElementById('custom-notification');
    const backdrop = document.getElementById('notification-backdrop');
    
    if (notification) {
        notification.classList.add('notification-hide');
    }
    if (backdrop) {
        backdrop.classList.add('notification-backdrop-hide');
    }
    
    setTimeout(() => {
        if (notification) notification.remove();
        if (backdrop) backdrop.remove();
    }, 300);
}

/**
 * Removes any existing notification before showing a new one
 */
function removeExistingNotification() {
    const existing = document.getElementById('custom-notification');
    const existingBackdrop = document.getElementById('notification-backdrop');
    if (existing) {
        existing.remove();
    }
    if (existingBackdrop) {
        existingBackdrop.remove();
    }
}

/**
 * Adds CSS styles for notifications if not already added
 */
function addNotificationStyles() {
    if (document.getElementById('notification-styles')) {
        return; // Styles already added
    }
    
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.8);
            background: var(--bg-primary, white);
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            min-width: 450px;
            max-width: 600px;
            border: 1px solid var(--border-color, #e0e0e0);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            backdrop-filter: blur(10px);
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }
        
        .notification-show {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        
        .notification-hide {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
        }
        
        .notification-content {
            padding: 20px;
        }
        
        .notification-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }
        
        .notification-icon {
            font-size: 24px;
            flex-shrink: 0;
        }
        
        .notification-title {
            font-weight: 600;
            font-size: 18px;
            color: var(--text-primary, #333);
            flex-grow: 1;
        }
        
        .notification-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-secondary, #666);
            padding: 0;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        
        .notification-close:hover {
            background: var(--bg-secondary, #f5f5f5);
            color: var(--text-primary, #333);
        }
        
        .notification-message {
            color: var(--text-primary, #333);
            line-height: 1.6;
            font-size: 16px;
        }
        
        /* Type-specific styles */
        .notification-info {
            border-left: 4px solid #2196F3;
        }
        
        .notification-success {
            border-left: 4px solid #4CAF50;
        }
        
        .notification-warning {
            border-left: 4px solid #FF9800;
        }
        
        .notification-error {
            border-left: 4px solid #F44336;
        }
        
        /* Backdrop overlay */
        .notification-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.4);
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .notification-backdrop-show {
            opacity: 1;
        }
        
        .notification-backdrop-hide {
            opacity: 0;
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
            .notification {
                min-width: 320px;
                max-width: 90vw;
                margin: 0 20px;
            }
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Convenience functions for different notification types
 */
export function showInfo(message, duration = 4000) {
    showNotification(message, 'info', duration);
}

export function showSuccess(message, duration = 4000) {
    showNotification(message, 'success', duration);
}

export function showWarning(message, duration = 5000) {
    showNotification(message, 'warning', duration);
}

export function showError(message, duration = 6000) {
    showNotification(message, 'error', duration);
}

/**
 * Shows a confirmation dialog matching the app's design
 * @param {string} message - The confirmation message
 * @param {function} onConfirm - Callback function when user confirms
 * @param {function} onCancel - Callback function when user cancels (optional)
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 */
export function showConfirm(message, onConfirm, onCancel = null, confirmText = 'Confirm', cancelText = 'Cancel') {
    // Remove any existing notification
    removeExistingNotification();

    // Generate unique IDs for this dialog
    const dialogId = `confirm-dialog-${Date.now()}`;
    const confirmFuncName = `confirmAction_${Date.now()}`;
    const cancelFuncName = `cancelConfirm_${Date.now()}`;

    // Create backdrop overlay
    const backdrop = document.createElement('div');
    backdrop.id = 'notification-backdrop';
    backdrop.className = 'notification-backdrop';
    
    // Create confirmation dialog
    const notification = document.createElement('div');
    notification.id = 'custom-notification';
    notification.className = 'notification notification-confirm';
    notification.dataset.dialogId = dialogId;
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-header">
                <div class="notification-icon">❓</div>
                <div class="notification-title">Confirmation Required</div>
                <button class="notification-close" data-action="cancel">×</button>
            </div>
            <div class="notification-message">${message}</div>
            <div class="notification-actions">
                <button class="notification-btn notification-btn-cancel" data-action="cancel">${cancelText}</button>
                <button class="notification-btn notification-btn-confirm" data-action="confirm">${confirmText}</button>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(backdrop);
    document.body.appendChild(notification);
    
    // Add CSS if not already added
    addNotificationStyles();
    addConfirmStyles();
    
    // Show with animation
    setTimeout(() => {
        backdrop.classList.add('notification-backdrop-show');
        notification.classList.add('notification-show');
    }, 10);
    
    // Add event listeners instead of global functions
    function handleClick(e) {
        const action = e.target.dataset.action;
        if (action === 'confirm') {
            closeNotification();
            if (onConfirm) onConfirm();
            cleanup();
        } else if (action === 'cancel') {
            closeNotification();
            if (onCancel) onCancel();
            cleanup();
        }
    }
    
    // Add click listeners to all buttons
    notification.addEventListener('click', handleClick);
    
    // Handle escape key
    function handleKeydown(e) {
        if (e.key === 'Escape') {
            closeNotification();
            if (onCancel) onCancel();
            cleanup();
        }
    }
    
    document.addEventListener('keydown', handleKeydown);
    
    function cleanup() {
        notification.removeEventListener('click', handleClick);
        document.removeEventListener('keydown', handleKeydown);
    }
}

/**
 * Adds CSS styles for confirmation dialogs
 */
function addConfirmStyles() {
    if (document.getElementById('confirm-styles')) {
        return; // Styles already added
    }
    
    const style = document.createElement('style');
    style.id = 'confirm-styles';
    style.textContent = `
        .notification-confirm {
            border-left: 4px solid #FF9800;
        }
        
        .notification-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid var(--border-color, #e0e0e0);
        }
        
        .notification-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 80px;
        }
        
        .notification-btn-cancel {
            background: var(--bg-secondary, #f5f5f5);
            color: var(--text-secondary, #666);
            border: 1px solid var(--border-color, #e0e0e0);
        }
        
        .notification-btn-cancel:hover {
            background: var(--bg-tertiary, #e0e0e0);
            color: var(--text-primary, #333);
        }
        
        .notification-btn-confirm {
            background: linear-gradient(135deg, #FF9800, #FF7043);
            color: white;
            box-shadow: 0 2px 4px rgba(255, 152, 0, 0.3);
        }
        
        .notification-btn-confirm:hover {
            background: linear-gradient(135deg, #FF7043, #FF9800);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(255, 152, 0, 0.4);
        }
    `;
    
    document.head.appendChild(style);
} 