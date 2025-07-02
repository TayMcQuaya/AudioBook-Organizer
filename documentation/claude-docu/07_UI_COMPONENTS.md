# UI Components System - AudioBook Organizer

## Overview
The UI system consists of:
1. Core UI utilities and helpers
2. Notification and feedback system
3. Modal dialogs and overlays
4. Theme management
5. Landing page components
6. Authentication UI
7. Application-specific UI

## Core UI Modules

### UI Utilities (`frontend/js/modules/ui.js`)
- **Lines**: 337
- **Purpose**: General UI helper functions
- **Key Functions**:
  - `updateChaptersList()` - Render chapters
  - `updateSectionsList()` - Render sections
  - `createChapterElement()` - Chapter UI
  - `createSectionElement()` - Section UI
  - `showLoadingSpinner()` - Loading states

### App UI (`frontend/js/modules/appUI.js`)
- **Lines**: 445
- **Purpose**: Application-wide UI management
- **Key Functions**:
  - `updateAuthUI()` - Auth-aware UI updates
  - `generateUserNavigation()` - User menus
  - `handleResponsiveMenu()` - Mobile UI
  - `updateNavigationState()` - Active states

## Notification System

### Notifications (`frontend/js/modules/notifications.js`)
- **Lines**: 423
- **No Dependencies**
- **Notification Types**:

```javascript
// Success notification
showSuccess('File uploaded successfully!', {
  duration: 3000,
  position: 'top-right'
});

// Error notification
showError('Upload failed. Please try again.', {
  duration: 5000,
  clickToDismiss: true
});

// Info notification
showInfo('Processing your file...', {
  persistent: true,
  showProgress: true
});

// Warning notification
showWarning('Unsaved changes will be lost!');

// Confirmation dialog
const confirmed = await showConfirm(
  'Delete this chapter?',
  'This action cannot be undone.'
);
```

### Notification Structure
```javascript
{
  id: 'notif-uuid',
  type: 'success|error|info|warning',
  message: 'Notification text',
  options: {
    duration: 3000,
    position: 'top-right',
    clickToDismiss: true,
    showProgress: false,
    persistent: false,
    actions: [
      {
        label: 'Undo',
        callback: () => {}
      }
    ]
  }
}
```

## Modal Systems

### Profile Modal (`frontend/js/modules/profileModal.js`)
- **Lines**: 723
- **Features**:
  - User profile editing
  - Email/name updates
  - Credit balance display
  - Usage history
  - Password change

### Modal Structure
```html
<div class="modal-overlay">
  <div class="modal-content">
    <div class="modal-header">
      <h2>User Profile</h2>
      <button class="modal-close">×</button>
    </div>
    <div class="modal-body">
      <!-- Content -->
    </div>
    <div class="modal-footer">
      <button class="btn-save">Save</button>
      <button class="btn-cancel">Cancel</button>
    </div>
  </div>
</div>
```

### Reorder Modal (`frontend/js/modules/reorder.js`)
- **Lines**: 502
- **Purpose**: Chapter/section reordering
- **Features**:
  - Drag-and-drop interface
  - Visual preview
  - Two-level reordering
  - Undo capability

## Theme Management

### Theme Manager (`frontend/js/modules/themeManager.js`)
- **Lines**: 229
- **Features**:
  - Light/dark theme toggle
  - System preference detection
  - Persistence across sessions
  - Smooth transitions

### Theme Implementation
```javascript
// CSS custom properties
:root {
  --bg-primary: #ffffff;
  --text-primary: #333333;
  --accent-color: #4A90E2;
}

[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --text-primary: #ffffff;
  --accent-color: #64B5F6;
}

// Theme switching
function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  const next = current === 'dark' ? 'light' : 'dark';
  
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  
  // Smooth transition
  document.documentElement.style.transition = 
    'background-color 0.3s, color 0.3s';
}
```

## Landing Page UI

### Landing UI (`frontend/js/modules/landingUI.js`)
- **Lines**: 809
- **Components**:
  - Hero section
  - Feature showcase
  - Testimonial carousel
  - FAQ accordion
  - Pricing cards
  - Newsletter signup

### Interactive Components
```javascript
// Feature demo
function playFeatureDemo(feature) {
  const modal = createDemoModal();
  modal.loadDemo(feature);
  modal.play();
}

// Testimonial carousel
function initTestimonialCarousel() {
  const carousel = new Carousel({
    autoPlay: true,
    interval: 5000,
    pauseOnHover: true
  });
}

// FAQ accordion
function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('expanded');
      updateAccordionHeight(item);
    });
  });
}
```

## Testing Mode UI

### Testing Mode UI (`frontend/js/modules/testingModeUI.js`)
- **Lines**: 327
- **Features**:
  - Visual testing mode indicators
  - Navigation restrictions
  - Exit confirmation
  - Debug information display

### Testing Mode Overlay
```javascript
// Visual indicators
function applyTestingModeStyles() {
  // Add banner
  const banner = createTestingBanner();
  document.body.prepend(banner);
  
  // Disable navigation
  document.querySelectorAll('nav a').forEach(link => {
    link.classList.add('disabled');
    link.addEventListener('click', showTestingModeWarning);
  });
  
  // Add visual border
  document.body.style.border = '3px solid #ff9800';
}
```

## Component Communication

### Event System
```javascript
// Global events for UI updates
window.addEventListener('auth-state-changed', (e) => {
  updateAuthUI(e.detail);
});

window.addEventListener('theme-changed', (e) => {
  updateThemeUI(e.detail.theme);
});

window.addEventListener('save-state-changed', (e) => {
  updateSaveIndicator(e.detail);
});
```

### UI State Management
```javascript
const uiState = {
  modals: {
    profile: { open: false },
    reorder: { open: false },
    conflict: { open: false }
  },
  notifications: [],
  theme: 'light',
  sidebar: {
    tocOpen: false,
    width: '300px'
  }
};
```

## Responsive Design

### Breakpoints
```css
/* Mobile: < 768px */
/* Tablet: 768px - 1024px */
/* Desktop: > 1024px */

@media (max-width: 768px) {
  .sidebar { display: none; }
  .mobile-menu { display: block; }
}
```

### Mobile Adaptations
```javascript
// Touch event handling
function enableTouchSupport() {
  let touchStartX = 0;
  
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });
  
  document.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchEndX - touchStartX;
    
    if (swipeDistance > 100) {
      openSidebar();
    } else if (swipeDistance < -100) {
      closeSidebar();
    }
  });
}
```

## Loading States

### Skeleton Screens
```javascript
function showSkeletonScreen() {
  const skeleton = `
    <div class="skeleton-container">
      <div class="skeleton-header"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text short"></div>
    </div>
  `;
  
  document.querySelector('.content').innerHTML = skeleton;
}
```

### Progress Indicators
```javascript
// File upload progress
function updateUploadProgress(percent) {
  const progressBar = document.querySelector('.upload-progress');
  progressBar.style.width = `${percent}%`;
  progressBar.textContent = `${percent}%`;
  
  if (percent === 100) {
    setTimeout(() => {
      progressBar.classList.add('complete');
    }, 500);
  }
}
```

## Accessibility

### ARIA Labels
```javascript
function addAccessibilityLabels() {
  // Buttons
  document.querySelectorAll('button').forEach(btn => {
    if (!btn.textContent.trim() && !btn.getAttribute('aria-label')) {
      btn.setAttribute('aria-label', getButtonLabel(btn));
    }
  });
  
  // Modals
  document.querySelectorAll('.modal').forEach(modal => {
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
  });
}
```

### Keyboard Navigation
```javascript
// Modal keyboard handling
function setupModalKeyboard(modal) {
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(modal);
    } else if (e.key === 'Tab') {
      trapFocus(e, modal);
    }
  });
}
```

## Performance

### UI Optimization
```javascript
// Debounced resize handler
const debouncedResize = debounce(() => {
  updateLayout();
}, 250);

window.addEventListener('resize', debouncedResize);

// Virtual scrolling for long lists
function virtualScroll(container, items, itemHeight) {
  const visibleCount = Math.ceil(container.clientHeight / itemHeight);
  const totalHeight = items.length * itemHeight;
  
  // Only render visible items
  const startIndex = Math.floor(container.scrollTop / itemHeight);
  const endIndex = startIndex + visibleCount + 1;
  
  renderItems(items.slice(startIndex, endIndex));
}
```

### Animation Performance
```css
/* Use transform for animations */
.modal-enter {
  transform: translateY(-20px);
  opacity: 0;
}

.modal-enter-active {
  transform: translateY(0);
  opacity: 1;
  transition: transform 0.3s, opacity 0.3s;
}

/* Enable hardware acceleration */
.animated-element {
  will-change: transform;
  transform: translateZ(0);
}
```