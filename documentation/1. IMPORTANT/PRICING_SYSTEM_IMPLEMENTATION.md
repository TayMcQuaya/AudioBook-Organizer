# Dynamic Pricing System Implementation Guide

## Overview

This document explains the dynamic pricing system implemented for the AudioBook Organizer, allowing centralized price management through environment variables.

## Problem We Solved

Previously, prices were hardcoded in multiple places:
- Backend: `stripe_service.py` (hardcoded values like 499, 1499, 2999)
- Frontend: Landing page HTML (hardcoded $4.99, $14.99, $29.99)
- No single source of truth for pricing

## Solution Implemented

Created a centralized pricing system using environment variables that automatically propagates prices throughout the application.

## Implementation Details

### 1. Environment Variables Added

Added to both `.env` and `env.example`:

```env
# Credit Package Pricing (in cents - 499 = $4.99)
PRICE_STARTER_CENTS=499
PRICE_CREATOR_CENTS=1499
PRICE_PROFESSIONAL_CENTS=2999
```

### 2. Backend Changes

**File**: `backend/services/stripe_service.py`

Updated to read prices from environment variables:

```python
# Get prices from environment variables (with fallbacks for backward compatibility)
starter_price = int(os.getenv('PRICE_STARTER_CENTS', '499'))
creator_price = int(os.getenv('PRICE_CREATOR_CENTS', '1499'))
professional_price = int(os.getenv('PRICE_PROFESSIONAL_CENTS', '2999'))

# Use in credit packages configuration
'price_cents': starter_price,  # Instead of hardcoded 499
```

### 3. Public Pricing API Endpoint

**File**: `backend/routes/stripe_routes.py`

Created a new public endpoint (no authentication required):

```python
@stripe_bp.route('/public/pricing', methods=['GET'])
def get_public_pricing():
    """Get pricing information - no authentication required"""
    # Returns JSON with all package prices
```

**Endpoint**: `/api/stripe/public/pricing`

**Response**:
```json
{
  "success": true,
  "packages": [
    {
      "id": "starter",
      "name": "Starter Pack",
      "price_display": "$4.99",
      "credits": 500
    }
    // ... other packages
  ]
}
```

### 4. Frontend Changes

**File**: `frontend/pages/landing/landing.html`

Added data attributes to price elements:
```html
<span class="price-amount" data-package="starter">$4.99</span>
<span class="price-amount" data-package="creator">$14.99</span>
<span class="price-amount" data-package="professional">$29.99</span>
```

**File**: `frontend/pages/landing/landing.js`

Added dynamic price fetching:
```javascript
async function fetchAndUpdatePricing() {
    // Fetches prices from /api/stripe/public/pricing
    // Updates DOM elements with data-package attributes
    // Caches prices in localStorage for offline use
    // Falls back to hardcoded values if API fails
}
```

## How Pricing Works Now

### Display Prices (Our System)
1. Prices defined in environment variables
2. Backend reads from env variables
3. Frontend fetches via API
4. Displays updated prices everywhere

### Actual Charges (Stripe's System)
1. Stripe has its own price configuration
2. Uses Stripe Price IDs (e.g., `price_1RdtDl...`)
3. Controls what customers actually pay
4. Must be manually kept in sync

## Important: Stripe Synchronization

**Environment variables do NOT change Stripe's prices!**

You must:
1. Update prices in Stripe Dashboard
2. Update matching prices in environment variables
3. Keep them synchronized manually

**Example**:
- Your env says: `PRICE_STARTER_CENTS=599` ($5.99)
- Stripe configured at: $4.99
- Customer sees: $5.99 on your site
- Customer charged: $4.99 by Stripe
- Result: Confusion! ⚠️

## How to Update Prices

### Local Development
1. Edit `.env` file:
   ```env
   PRICE_STARTER_CENTS=599  # Change from 499 to 599
   ```
2. Restart backend server
3. Prices update automatically

### Production (DigitalOcean)
1. Go to DigitalOcean Dashboard
2. Navigate to App → Settings → Environment Variables
3. Update:
   - `PRICE_STARTER_CENTS`
   - `PRICE_CREATOR_CENTS`
   - `PRICE_PROFESSIONAL_CENTS`
4. Save and deploy

### Stripe Dashboard
1. Create new price products in Stripe
2. Update Price IDs in environment variables:
   - `STRIPE_PRICE_STARTER_PACK`
   - `STRIPE_PRICE_CREATOR_PACK`
   - `STRIPE_PRICE_PROFESSIONAL_PACK`

## Security Considerations

The public pricing endpoint (`/api/stripe/public/pricing`) is:
- ✅ **Safe** - Only exposes public pricing information
- ✅ **Read-only** - Cannot modify any data
- ✅ **Industry standard** - Common practice for SaaS
- ✅ **No sensitive data** - No API keys, user data, or secrets

## Benefits of This System

1. **Single Source of Truth**: Change prices in one place
2. **No Code Changes**: Update prices without modifying code
3. **Automatic Propagation**: Prices update everywhere
4. **Offline Support**: Cached pricing for reliability
5. **API Access**: Third parties can check pricing
6. **Better Performance**: No need to call Stripe for every page load

## Testing the Implementation

1. **Check API endpoint**:
   ```
   https://your-domain.com/api/stripe/public/pricing
   ```

2. **Verify landing page** loads prices dynamically

3. **Change a price** in env variables and confirm it updates

4. **Test offline** - Prices should still display from cache

## Future Enhancements

Consider:
1. Webhook from Stripe to auto-sync prices
2. Admin panel to update prices
3. A/B testing different price points
4. Regional pricing support

## Summary

This implementation provides a flexible, centralized pricing system that makes price updates simple while maintaining compatibility with Stripe's payment processing. Remember to always keep your display prices synchronized with Stripe's actual prices!