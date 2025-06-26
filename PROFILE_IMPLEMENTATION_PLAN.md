# Profile Modal Implementation Plan

## Analysis of Current Codebase

### Current Authentication & User System
- **Authentication**: Supabase-based with JWT tokens
- **User Data**: Stored in `profiles` table with email, full_name, created_at, updated_at
- **Credits System**: `user_credits` table tracks current balance
- **Usage Logging**: `usage_logs` table records all credit transactions with action, credits_used, metadata, timestamp
- **Existing UI**: User dropdown menu with "Profile" and "Sign Out" options in navigation

### Current Modal Systems
- **Notifications**: Custom modal system in `notifications.js` with backdrop and styled components
- **Low Credits Modal**: Exists in `ui.js` with purchase options
- **Export Modal**: Functional modal for export options

### Current Credit Actions
- Audio Upload: 2 credits
- DOCX Processing: 5 credits  
- TXT Upload: 3 credits
- Premium Export: 15 credits

## Implementation Plan

### Phase 1: Backend Enhancement

#### 1.1 Add Usage History Endpoint
**File**: `backend/routes/auth_routes.py`

```python
@auth_bp.route('/usage-history', methods=['GET'])
@require_auth
def get_usage_history(current_user):
    """Get paginated usage history for the current user"""
    # Implementation details in step-by-step guide
```

#### 1.2 Enhance Profile Endpoint  
**File**: `backend/routes/auth_routes.py`
- Ensure existing `/api/auth/profile` returns complete user data
- Add account statistics (total credits used, account age, etc.)

### Phase 2: Frontend Modal System

#### 2.1 Create Profile Modal Module
**File**: `frontend/js/modules/profileModal.js`

**Key Components:**
- Modal creation and management
- Tab navigation system (Profile | History | Settings)
- Data fetching and display
- Form handling for name updates
- Password reset integration

#### 2.2 Add Profile Modal Styles
**File**: `frontend/css/profile-modal.css` (or integrate into existing CSS)

**Design Requirements:**
- Match existing modal styling from notifications system
- Responsive tabbed interface
- Clean data table for usage history
- Form styling consistent with auth pages
- Proper spacing and typography hierarchy

#### 2.3 Integration Points
**Files to modify:**
- `frontend/js/modules/appUI.js` - Connect user dropdown to modal
- `frontend/js/modules/router.js` - Handle modal routing if needed
- `frontend/index.html` - Add CSS import

### Phase 3: Feature Implementation

#### 3.1 Profile Information Tab
**Features:**
- Display email (read-only)
- Display full name (editable)
- Show current credits
- Show account creation date
- Show last activity timestamp

#### 3.2 Credit History Tab
**Features:**
- Paginated table showing:
  - Date/Time (formatted)
  - Action type (human-readable)
  - Credits consumed/added (+/- indicators)
  - Running balance
  - Additional metadata if relevant
- Filtering options (by action type, date range)
- Export history option

#### 3.3 Account Settings Tab
**Features:**
- Edit full name with validation
- Password reset button (reuse existing flow)
- Account preferences (future expansion)

## Chain of Thoughts Analysis

### 1. Functionality Requirements

**A. Data Display Requirements:**
- **User Info**: Email, name, credits, account age
- **History Tracking**: All credit transactions with context
- **Real-time Updates**: Current credit balance sync

**B. User Interaction Requirements:**
- **Profile Editing**: Name modification with validation
- **Password Management**: Integrated reset functionality  
- **History Navigation**: Pagination, filtering, search

**C. Integration Requirements:**
- **Existing Auth System**: Leverage current Supabase integration
- **Credit System**: Use existing usage logging
- **UI Consistency**: Match current design patterns

### 2. Design Considerations

**A. Modal Structure Decision:**
```
┌─────────────────────────────────────┐
│ Profile Modal (Fixed width: 800px)  │
├─────────────────────────────────────┤
│ Header: [User Name] [×]             │
├─────────────────────────────────────┤
│ Tabs: [Profile] [History] [Settings]│
├─────────────────────────────────────┤
│ Content Area (Scrollable)           │
│ ┌─ Profile Tab ──────────────────┐  │
│ │ Avatar | Email: user@email.com │  │
│ │        | Name: [Editable]      │  │
│ │        | Credits: 150 💎        │  │
│ │        | Member since: Jan 2024│  │
│ └────────────────────────────────┘  │
├─────────────────────────────────────┤
│ Footer: [Save Changes] [Close]      │
└─────────────────────────────────────┘
```

**B. History Table Design:**
```
┌──────────────┬─────────────┬─────────────┬─────────────┐
│ Date & Time  │ Action      │ Credits     │ Balance     │
├──────────────┼─────────────┼─────────────┼─────────────┤
│ Jan 15, 2024 │ DOCX Upload │ -5 💎       │ 145 💎     │
│ 2:30 PM      │             │             │             │
├──────────────┼─────────────┼─────────────┼─────────────┤
│ Jan 15, 2024 │ Audio Upload│ -2 💎       │ 150 💎     │
│ 1:15 PM      │             │             │             │
└──────────────┴─────────────┴─────────────┴─────────────┘
```

**C. Responsive Considerations:**
- Mobile: Stack tabs vertically, reduce table columns
- Tablet: Maintain tab layout, adjust table spacing
- Desktop: Full feature display

### 3. Implementation Strategy

**A. Incremental Development:**
1. Backend endpoints first (testable independently)
2. Basic modal structure (visual verification)
3. Profile tab (simple data display)
4. History tab (complex table with pagination)
5. Settings tab (form interactions)

**B. Code Reuse Strategy:**
- Modal backdrop/styling from `notifications.js`
- Form styling from `auth.js` password reset
- Table styling from existing data displays
- API patterns from current auth endpoints

**C. Error Handling:**
- Network failures during data fetch
- Validation errors on form submission
- Authentication state changes during modal use
- Credit balance updates while viewing history

## Step-by-Step Implementation Guide

### Step 1: Backend Usage History Endpoint

**Location**: `backend/routes/auth_routes.py`

```python
@auth_bp.route('/usage-history', methods=['GET'])
@require_auth
def get_usage_history(current_user):
    """Get paginated usage history for the current user"""
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        action_filter = request.args.get('action_filter')
        
        # Build query with filters
        query = supabase_service.client.table('usage_logs')\
            .select('*')\
            .eq('user_id', current_user['id'])\
            .order('created_at', desc=True)
            
        if action_filter:
            query = query.eq('action', action_filter)
            
        # Execute with pagination
        offset = (page - 1) * per_page
        result = query.range(offset, offset + per_page - 1).execute()
        
        # Get total count for pagination
        count_result = supabase_service.client.table('usage_logs')\
            .select('*', count='exact')\
            .eq('user_id', current_user['id']).execute()
            
        return jsonify({
            'success': True,
            'data': result.data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': count_result.count,
                'pages': math.ceil(count_result.count / per_page)
            }
        })
        
    except Exception as e:
        logger.error(f"Usage history error: {e}")
        return jsonify({'error': 'Failed to fetch usage history'}), 500
```

### Step 2: Profile Modal Module

**Location**: `frontend/js/modules/profileModal.js`

```javascript
/**
 * Profile Modal Module - User profile management
 */

import { showError, showSuccess } from './notifications.js';
import { apiFetch } from './api.js';

class ProfileModal {
    constructor() {
        this.isOpen = false;
        this.currentTab = 'profile';
        this.userData = null;
        this.usageHistory = null;
        this.currentPage = 1;
    }

    async open() {
        if (this.isOpen) return;
        
        try {
            // Fetch user data and create modal
            await this.fetchUserData();
            this.createModal();
            this.isOpen = true;
        } catch (error) {
            showError('Failed to load profile data');
        }
    }

    async fetchUserData() {
        // Fetch profile and usage history
        const [profileResponse, historyResponse] = await Promise.all([
            apiFetch('/api/auth/profile'),
            apiFetch('/api/auth/usage-history?page=1&per_page=10')
        ]);

        this.userData = await profileResponse.json();
        this.usageHistory = await historyResponse.json();
    }

    createModal() {
        // Remove existing modal
        this.removeModal();

        // Create backdrop and modal
        const backdrop = document.createElement('div');
        backdrop.className = 'profile-modal-backdrop';
        backdrop.onclick = () => this.close();

        const modal = document.createElement('div');
        modal.className = 'profile-modal';
        modal.innerHTML = this.getModalHTML();

        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        // Setup event listeners
        this.setupEventListeners();
        
        // Show with animation
        setTimeout(() => {
            backdrop.classList.add('show');
            modal.classList.add('show');
        }, 10);
    }

    getModalHTML() {
        return `
            <div class="profile-modal-header">
                <h2>Profile</h2>
                <button class="profile-modal-close" onclick="window.profileModal.close()">×</button>
            </div>
            
            <div class="profile-modal-tabs">
                <button class="tab-btn ${this.currentTab === 'profile' ? 'active' : ''}" data-tab="profile">
                    Profile
                </button>
                <button class="tab-btn ${this.currentTab === 'history' ? 'active' : ''}" data-tab="history">
                    Credit History
                </button>
                <button class="tab-btn ${this.currentTab === 'settings' ? 'active' : ''}" data-tab="settings">
                    Settings
                </button>
            </div>
            
            <div class="profile-modal-content">
                ${this.getTabContent()}
            </div>
        `;
    }

    getTabContent() {
        switch (this.currentTab) {
            case 'profile':
                return this.getProfileTabHTML();
            case 'history':
                return this.getHistoryTabHTML();
            case 'settings':
                return this.getSettingsTabHTML();
            default:
                return '';
        }
    }

    // ... Additional methods for each tab
}

// Create global instance
window.profileModal = new ProfileModal();

export { ProfileModal };
```

### Step 3: CSS Styling

**Location**: `frontend/css/profile-modal.css`

```css
/* Profile Modal Styles */
.profile-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.profile-modal-backdrop.show {
    opacity: 1;
}

.profile-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.9);
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    background: var(--bg-primary, white);
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: flex;
    flex-direction: column;
}

.profile-modal.show {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
}

/* Header */
.profile-modal-header {
    padding: 24px;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.profile-modal-header h2 {
    margin: 0;
    color: var(--text-primary);
    font-size: 24px;
    font-weight: 600;
}

.profile-modal-close {
    background: none;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.profile-modal-close:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

/* Tabs */
.profile-modal-tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color);
    padding: 0 24px;
}

.tab-btn {
    background: none;
    border: none;
    padding: 16px 24px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    color: var(--text-secondary);
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
}

.tab-btn:hover {
    color: var(--text-primary);
}

.tab-btn.active {
    color: var(--accent-color);
    border-bottom-color: var(--accent-color);
}

/* Content */
.profile-modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
}

/* Profile Tab */
.profile-info {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 24px;
    align-items: start;
}

.profile-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--accent-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: white;
    font-weight: 600;
}

.profile-details {
    display: grid;
    gap: 16px;
}

.profile-field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-light);
}

.profile-field:last-child {
    border-bottom: none;
}

.field-label {
    font-weight: 600;
    color: var(--text-primary);
}

.field-value {
    color: var(--text-secondary);
    text-align: right;
}

/* History Tab */
.history-filters {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
}

.history-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
}

.history-table th,
.history-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid var(--border-light);
}

.history-table th {
    background: var(--bg-secondary);
    font-weight: 600;
    color: var(--text-primary);
}

.history-table td {
    color: var(--text-secondary);
}

.credit-change {
    font-weight: 600;
}

.credit-change.positive {
    color: var(--success-color, #10b981);
}

.credit-change.negative {
    color: var(--error-color, #ef4444);
}

.pagination {
    display: flex;
    justify-content: center;
    gap: 8px;
}

.pagination button {
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.pagination button:hover:not(:disabled) {
    background: var(--accent-color);
    color: white;
}

.pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination button.active {
    background: var(--accent-color);
    color: white;
}

/* Settings Tab */
.settings-section {
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border-light);
}

.settings-section:last-child {
    border-bottom: none;
}

.settings-section h3 {
    margin: 0 0 16px 0;
    color: var(--text-primary);
    font-size: 18px;
    font-weight: 600;
}

.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-primary);
}

.form-group input {
    width: 100%;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.2s ease;
}

.form-group input:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px rgba(var(--accent-color-rgb), 0.1);
}

.btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-primary {
    background: var(--accent-color);
    color: white;
}

.btn-primary:hover {
    background: var(--accent-color-dark);
}

.btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}

.btn-secondary:hover {
    background: var(--border-color);
}

/* Responsive Design */
@media (max-width: 768px) {
    .profile-modal {
        width: 95%;
        max-height: 95vh;
    }
    
    .profile-info {
        grid-template-columns: 1fr;
        text-align: center;
    }
    
    .profile-modal-tabs {
        overflow-x: auto;
    }
    
    .tab-btn {
        white-space: nowrap;
        min-width: 120px;
    }
    
    .history-table {
        font-size: 14px;
    }
    
    .history-filters {
        flex-direction: column;
    }
}
```

### Step 4: Integration with User Dropdown

**Location**: `frontend/js/modules/appUI.js`

**Modify the user dropdown HTML generation:**

```javascript
// In the generateUserNavigation function, update the dropdown:
const dropdownHTML = `
    <div class="user-dropdown">
        <button class="dropdown-item" onclick="window.profileModal.open()">
            <i class="icon">👤</i>
            Profile
        </button>
        <button class="dropdown-item" onclick="window.sessionManager.signOut()">
            <i class="icon">🚪</i>
            Sign Out
        </button>
    </div>
`;
```

### Step 5: Module Integration

**Location**: `frontend/index.html`

**Add CSS import:**
```html
<link rel="stylesheet" href="/css/profile-modal.css">
```

**Location**: `frontend/js/modules/appInitialization.js`

**Import the profile modal:**
```javascript
import './profileModal.js';
```

### Step 6: Password Reset Integration

**In the Settings tab of profile modal, reuse existing password reset functionality:**

```javascript
async handlePasswordReset() {
    try {
        const email = this.userData.user.email;
        const response = await apiFetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            showSuccess('Password reset email sent! Check your inbox.');
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to send reset email');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}
```

## Testing Checklist

- [ ] Modal opens/closes properly
- [ ] Tab navigation works
- [ ] Profile data displays correctly
- [ ] Usage history loads with pagination
- [ ] Name editing saves successfully
- [ ] Password reset sends email
- [ ] Responsive design works on mobile
- [ ] Error handling for network failures
- [ ] Credit balance updates in real-time
- [ ] No conflicts with existing functionality

## Future Enhancements

1. **Avatar Upload**: Allow users to upload profile pictures
2. **Export History**: Download credit history as CSV/PDF
3. **Usage Analytics**: Charts showing credit usage patterns
4. **Account Preferences**: Theme selection, notification settings
5. **Two-Factor Authentication**: Enhanced security options

This implementation maintains consistency with the existing codebase while providing a comprehensive profile management system.