# Credit Cost Configuration Issue

## Problem
Credit consumption values are hardcoded in the frontend and not matching environment variables:
- **Configured**: TXT=3, DOCX=5, Export=15, Audio=2
- **Actually Used**: TXT=1, DOCX=2, Export=10, Audio=?

## Root Causes

### 1. Frontend Hardcoded Values
- `export.js`: Hardcoded export cost to 15
- `ui.js`: Shows incorrect values in modal
- `bookUpload.js`: Hardcoded TXT check to 3 credits

### 2. Backend Default Values
The backend uses defaults if environment variables aren't found:
```python
CREDIT_COST_AUDIO_UPLOAD = int(os.environ.get('CREDIT_COST_AUDIO_UPLOAD', 2))
CREDIT_COST_DOCX_PROCESSING = int(os.environ.get('CREDIT_COST_DOCX_PROCESSING', 5))
CREDIT_COST_TXT_UPLOAD = int(os.environ.get('CREDIT_COST_TXT_UPLOAD', 3))
CREDIT_COST_PREMIUM_EXPORT = int(os.environ.get('CREDIT_COST_PREMIUM_EXPORT', 15))
```

## Quick Fix - Add Credit Costs to Config API

### 1. Update Backend Config Endpoint
Add credit costs to `/api/auth/config` in `auth_routes.py`:

```python
@auth_bp.route('/config', methods=['GET'])
def get_auth_config():
    """Get public authentication configuration for frontend"""
    try:
        from ..config import Config
        
        # Only return public configuration (not secrets)
        config_data = {
            'supabase_url': Config.SUPABASE_URL,
            'supabase_anon_key': Config.SUPABASE_ANON_KEY,
            'recaptcha_enabled': Config.RECAPTCHA['ENABLED'],
            'recaptcha_site_key': Config.RECAPTCHA['SITE_KEY'] if Config.RECAPTCHA['ENABLED'] else None,
            # Add credit costs
            'credit_costs': {
                'audio_upload': Config.CREDIT_COST_AUDIO_UPLOAD,
                'txt_upload': Config.CREDIT_COST_TXT_UPLOAD,
                'docx_processing': Config.CREDIT_COST_DOCX_PROCESSING,
                'premium_export': Config.CREDIT_COST_PREMIUM_EXPORT
            }
        }
        
        # ... rest of the function
```

### 2. Create Credit Config Module
Create `frontend/js/modules/creditConfig.js`:

```javascript
// Credit cost configuration from backend
let creditCosts = {
    audio_upload: 2,
    txt_upload: 3,
    docx_processing: 5,
    premium_export: 15
};

export async function initializeCreditCosts() {
    try {
        const response = await fetch('/api/auth/config');
        const data = await response.json();
        if (data.success && data.config.credit_costs) {
            creditCosts = data.config.credit_costs;
            console.log('💎 Credit costs loaded:', creditCosts);
        }
    } catch (error) {
        console.warn('Failed to load credit costs, using defaults:', error);
    }
}

export function getCreditCost(action) {
    return creditCosts[action] || 0;
}

export function getAllCreditCosts() {
    return { ...creditCosts };
}
```

### 3. Update Frontend Files

#### export.js
Replace hardcoded values:
```javascript
import { getCreditCost } from './creditConfig.js';

// Replace:
// creditCost = 15; // Premium audio export
// With:
creditCost = getCreditCost('premium_export');
```

#### ui.js
Update the modal display:
```javascript
import { getAllCreditCosts } from './creditConfig.js';

// In showLowCreditsModal function:
const costs = getAllCreditCosts();
const modalHtml = `
    <ul>
        <li><span class="emoji">📄</span> DOCX processing (${costs.docx_processing} credits per document)</li>
        <li><span class="emoji">🎵</span> Audio file upload (${costs.audio_upload} credits per file)</li>
        <li><span class="emoji">📄</span> Text file upload (${costs.txt_upload} credits per file)</li>
        <li><span class="emoji">📤</span> Premium exports (${costs.premium_export} credits per export)</li>
    </ul>
`;
```

#### bookUpload.js
Update hardcoded check:
```javascript
import { getCreditCost } from './creditConfig.js';

// Replace:
// const hasCredits = await checkCreditsForAction(3, 'Text file upload');
// With:
const txtCost = getCreditCost('txt_upload');
const hasCredits = await checkCreditsForAction(txtCost, 'Text file upload');
```

### 4. Initialize on App Start
In `main.js` or `appInitialization.js`:
```javascript
import { initializeCreditCosts } from './modules/creditConfig.js';

// During app initialization:
await initializeCreditCosts();
```

## Production Environment Check

Verify your DigitalOcean environment variables are set correctly:
```bash
CREDIT_COST_AUDIO_UPLOAD=2
CREDIT_COST_TXT_UPLOAD=3
CREDIT_COST_DOCX_PROCESSING=5
CREDIT_COST_PREMIUM_EXPORT=15
```

## Testing
1. Check `/api/auth/config` returns credit costs
2. Verify frontend uses dynamic values
3. Test each upload type consumes correct credits