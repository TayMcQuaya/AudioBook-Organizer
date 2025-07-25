# Enterprise Pricing Implementation - Session Documentation

## Date: July 19, 2025

## Overview
Added Enterprise/Custom Pricing option across the application - on landing page, in credits modal, and contact form integration.

## Context
- User had Stripe payment working but credits weren't appearing after purchase (webhook configuration issue with friend's production credentials on localhost)
- User wanted to add Enterprise pricing option for bulk purchases and custom pricing

## Changes Made

### 1. Landing Page Enterprise Card
**File: `/frontend/pages/landing/landing.html`**
- Added Enterprise pricing card after Professional Pack in the pricing grid
- Features: Volume discounts, 10,000+ credits packages, priority support, custom invoicing
- Button triggers `navigateToContact('enterprise')`

**File: `/frontend/css/landing.css`**
- Added `.pricing-card.enterprise` styling with gray color scheme (#6b7280)
- Added `.enterprise-badge` styling
- Modified grid to support 4 cards horizontally:
  ```css
  @media (min-width: 1200px) {
      .pricing-grid {
          grid-template-columns: repeat(4, 1fr);
      }
  }
  ```
- Made cards more compact (reduced font sizes, padding)

**File: `/frontend/pages/landing/landing.js`**
- Added `navigateToContact()` function that uses router if available
- Made function globally available: `window.navigateToContact = navigateToContact`

### 2. Credits Modal Enterprise Card
**File: `/frontend/js/modules/stripe.js`**
- Added Enterprise card HTML in `loadPackages()` method (lines 478-503 and 537-562)
- Created `window.navigateToContactFromModal()` function to handle navigation from modal
- Function closes the modal (`lowCreditsModal`) before navigating

**File: `/frontend/css/stripe.css`**
- Added `.package-card.enterprise` styling
- Added responsive grid for 4 columns:
  ```css
  @media (min-width: 1100px) {
      .credit-packages {
          grid-template-columns: repeat(4, 1fr);
      }
  }
  ```

**File: `/frontend/css/main.css`**
- Updated `#creditPurchaseContent .credit-packages` from 3 to 4 columns
- Added specific Enterprise card styling for modal
- Compressed spacing to prevent modal overflow:
  - Reduced padding, margins, font sizes
  - Changed modal position from 50% to 48% top
  - Removed max-height and overflow-y (no scrolling)

### 3. Contact Form Integration
**File: `/frontend/pages/contact/contact.html`**
- Added "Enterprise / Custom Pricing" option to subject dropdown

**File: `/frontend/pages/contact/main.js`**
- Added `handleUrlParameters()` function to:
  - Pre-select dropdown based on `?subject=enterprise` URL parameter
  - Pre-fill message for enterprise inquiries
  - Auto-fill name and email for authenticated users

### 4. Navigation Fixes

#### Issue 1: Modal not closing
- **Problem**: Used wrong modal ID (`creditPurchaseModal` instead of `lowCreditsModal`)
- **Fix**: Updated to correct ID and added `document.body.style.overflow = ''` to restore scrolling

#### Issue 2: Landing page button redirecting to app
- **Problem**: SPA router intercepting navigation
- **Fix**: Updated `navigateToContact()` to use `window.router.navigate()` when available

#### Issue 3: Contact form not pre-filling name
- **Problem**: Complex logic trying to refresh sessions and make API calls
- **Solution**: Simplified to just read from session:
  ```javascript
  userName = session.user.full_name || session.user.user_metadata?.full_name;
  ```

### 5. Layout Fixes

#### Issue: 4 cards not fitting horizontally
- **Landing Page**: Reduced min card width from 320px to 280px, added media queries
- **Credits Modal**: Fixed by updating main.css (not just stripe.css) as it had overriding styles
- **Both**: Made cards more compact, reduced featured card scale

#### Issue: Modal content cut off at bottom
- Compressed all spacing:
  - Section header margin: 1.5rem → 0.8rem
  - Purchase info padding: 1.25rem → 0.8rem
  - Font sizes reduced by ~10%
  - Modal positioned at 48% instead of 50%

## Key Technical Details

### Stripe Webhook Issue (Initial Problem)
- **Root Cause**: Friend's Stripe credentials configured for `audiobookorganizer.com`, not `localhost`
- **Symptom**: Payment succeeds but credits don't update
- **Solution**: Use own Stripe account for local development

### Modal IDs
- Credits modal ID: `lowCreditsModal` (NOT `creditPurchaseModal`)
- Close function: `window.hideLowCreditsModal()`

### Profile Name Storage
- When user updates profile: stored in `session.user.full_name`
- Original signup name: stored in `session.user.user_metadata.full_name`
- Contact form checks `full_name` first (most recent), then falls back to metadata

### CSS Specificity
- `main.css` has specific rules for `#creditPurchaseContent` that override `stripe.css`
- Always check both files when styling credits modal

## Files Modified Summary
1. `/frontend/pages/landing/landing.html` - Added Enterprise card
2. `/frontend/pages/landing/landing.js` - Added navigation function
3. `/frontend/css/landing.css` - Enterprise styling + 4-column grid
4. `/frontend/js/modules/stripe.js` - Enterprise card in modal + navigation
5. `/frontend/css/stripe.css` - Modal Enterprise styling
6. `/frontend/css/main.css` - Modal grid fix + spacing compression
7. `/frontend/pages/contact/contact.html` - Added Enterprise dropdown option
8. `/frontend/pages/contact/main.js` - URL params + form pre-fill

## Testing Notes
- Test with both authenticated and unauthenticated users
- Verify Enterprise buttons work from both landing page and credits modal
- Check that contact form pre-fills correctly with profile-updated names
- Ensure modal fits without scrolling on standard desktop viewport