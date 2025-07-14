# Gift Credits System Guide

## Implementation Status: PARTIALLY WORKING ⚠️

**Current Status (July 14, 2025):**
- ✅ SQL Script: Fully functional - credits are added to database and appear in history
- ✅ Database Integration: Gifts properly recorded in `credit_transactions` and `usage_logs`
- ✅ Profile Modal: Gifts display correctly as "Gift from us" in usage history
- ❌ **ISSUE**: Backend endpoints returning 500 errors
- ❌ **ISSUE**: Frontend credit display not updating after gift (caching problem)
- ❌ **ISSUE**: Gift notifications not appearing due to API failures

## Overview

The Gift Credits System is designed to allow administrators to gift credits to all users with a one-time notification system. Users should receive a beautiful notification when they log in after a gift has been sent, and the gift appears in their usage history.

## Features

1. **Bulk Credit Gifting**: Gift any amount of credits to all active users at once
2. **One-Time Notifications**: Users see the gift notification only once, even across devices
3. **Gift Tracking**: All gifts are recorded in the database with unique batch IDs
4. **Usage History**: Gifts appear as "Gift from us" in the user's credit history
5. **Duplicate Prevention**: System prevents accidentally running the same gift twice

## How to Gift Credits

### Step 1: Configure the Gift

1. Open the SQL script: `sql/gift_credits_to_all_users.sql`
2. Modify the configuration variables at the top:

```sql
gift_amount INTEGER := 50; -- Change this to desired credit amount
gift_reason TEXT := 'Holiday gift from AudioBook Organizer team! 🎁';
gift_batch_id TEXT := 'holiday_2025_01'; -- Unique ID for this gift batch
```

### Step 2: Run the Script

1. Log into your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire script
4. Click "Run" to execute

The script will:
- Add credits to all active users
- Record the gift in `credit_transactions` table
- Log the gift in `usage_logs` for history display
- Show success message with gift details

### Step 3: Verify the Gift

After running the script, you'll see output like:
```
✅ Successfully gifted 50 credits to all active users!
📊 Gift batch ID: holiday_2025_01
💝 Reason: Holiday gift from AudioBook Organizer team! 🎁

Users will see a one-time notification when they next log in.
```

## User Experience

### Gift Notification

When users log into the app after receiving a gift, they'll see:

1. **Beautiful Notification Modal**:
   - 🎁 Title: "You've received a gift!"
   - Shows the gift reason
   - Displays the credit amount in large, green text
   - Includes a thank you button
   - No auto-close - user must acknowledge

2. **Credit Balance Update**:
   - Credits are immediately added to their balance
   - The new balance is displayed in the header

3. **Usage History**:
   - Gift appears as "Gift from us" with positive credit amount
   - Shows in green color to indicate credit addition
   - Can be filtered in the history view

### One-Time Display Logic

The notification is shown only once per gift through:

1. **LocalStorage Tracking**: `gift_acknowledged_${gift.id}`
2. **Database Tracking**: `metadata.acknowledged` field in credit_transactions
3. **Server Verification**: Backend checks for unacknowledged gifts

## Technical Implementation

### Database Structure

**credit_transactions table**:
```json
{
  "user_id": "uuid",
  "transaction_type": "bonus",
  "credits_amount": 50,
  "status": "completed",
  "metadata": {
    "reason": "Holiday gift...",
    "gift_batch": "holiday_2025_01",
    "acknowledged": false,
    "source": "admin_gift"
  }
}
```

**usage_logs table**:
```json
{
  "user_id": "uuid",
  "action": "gift_credits",
  "credits_used": -50,  // Negative = adding credits
  "metadata": {
    "reason": "Holiday gift...",
    "source": "admin_gift",
    "gift_batch": "holiday_2025_01",
    "display_name": "Gift from us"
  }
}
```

### API Endpoints

1. **GET /api/auth/check-gift**
   - Checks for unacknowledged gifts
   - Returns gift details if found

2. **POST /api/auth/acknowledge-gift/{gift_id}**
   - Marks gift as acknowledged in database
   - Prevents notification from showing again

### Frontend Flow

1. **App Initialization** (`appUI.js`):
   - Calls `checkGiftNotification()` on app page load
   - Checks localStorage for acknowledgment
   - Shows notification if new gift found

2. **Gift Notification** (`notifications.js`):
   - Uses existing notification system
   - Custom styled content for gifts
   - No auto-close duration

3. **Profile Modal** (`profileModal.js`):
   - Shows gifts as "Gift from us" in history
   - Displays with positive credit amount
   - Can be filtered by "Gifts Received"

## Best Practices

1. **Unique Batch IDs**: Always use a unique `gift_batch_id` to prevent duplicates
2. **Clear Reasons**: Write friendly, clear gift reasons that users will appreciate
3. **Test First**: Test with a small amount on development environment
4. **Timing**: Consider user timezones when gifting (notifications appear on next login)
5. **Communication**: Consider sending an email announcement about the gift

## Known Issues & Troubleshooting

### Current Blocking Issues (July 14, 2025)

#### Issue 1: Backend API Endpoints Failing
**Problem**: `/api/auth/check-gift` returns 500 Internal Server Error
**Status**: Under investigation
**Impact**: Gift notifications cannot be displayed
**Attempted Fixes**:
- Fixed route path duplication (`/api/auth/api/auth/` → `/api/auth/`)
- Fixed Supabase query syntax (`desc=True` → `.desc`)
- Fixed metadata boolean query (`'false'` → `False`)
**Current Theory**: Possible JSONB metadata parsing issue or RLS policy conflict

#### Issue 2: Credit Display Not Updating
**Problem**: Database shows correct credits, frontend display shows old amount
**Status**: Caching issue identified
**Impact**: Users don't see new credit balance after gift
**Attempted Fixes**:
- Added force refresh flag (`window._creditRefreshNeeded = true`)
- Called `updateUserCredits(0)` to bypass cache
**Current Theory**: Cache invalidation not working properly

#### Issue 3: Metadata Query Problems
**Problem**: Querying JSONB metadata field may be causing 500 errors
**SQL Used**: `metadata->>acknowledged = False`
**Alternative Approaches to Try**:
- `metadata->>'acknowledged' = 'false'` (string comparison)
- `(metadata->>'acknowledged')::boolean = false` (explicit cast)
- `metadata @> '{"acknowledged": false}'` (JSONB contains)

### Debugging Steps Taken

1. **Route Path Investigation**: ✅ Fixed duplicate prefix issue
2. **Supabase Syntax**: ✅ Fixed order() and limit() calls  
3. **Boolean vs String**: ✅ Attempted fix for metadata query
4. **Cache Invalidation**: ✅ Added force refresh mechanism
5. **Error Logging**: ❌ Need better backend error logging to identify exact failure point

### Next Steps for Resolution

1. **Add detailed error logging** to backend endpoints
2. **Test metadata queries** directly in Supabase SQL editor
3. **Verify RLS policies** don't block credit_transactions access
4. **Create fallback notification** system that doesn't depend on backend API
5. **Test with minimal gift record** to isolate JSONB issues

### Gift Not Showing (General)

1. Check if user has logged in since the gift was sent
2. Verify the gift exists in `credit_transactions` table:
   ```sql
   SELECT * FROM credit_transactions 
   WHERE transaction_type = 'bonus' 
   ORDER BY created_at DESC;
   ```
3. Check if `acknowledged` is still false in metadata
4. Clear localStorage and try again
5. **Check backend logs** for 500 errors

### Duplicate Gift Prevention

If you try to run the same gift batch twice, you'll see:
```
ERROR: Gift batch holiday_2025_01 has already been processed!
```

Simply change the `gift_batch_id` to a new unique value.

### Production Considerations

1. **Database operations work identically in production** ✅
2. **RLS policies are respected for data access** ✅
3. **No user logout required for SQL changes** ✅
4. **Cross-device compatibility** ⚠️ (depends on API fix)
5. **Server restart persistence** ✅

## Example Gift Scenarios

### Holiday Gift
```sql
gift_amount := 100;
gift_reason := '🎄 Happy Holidays from AudioBook Organizer! Enjoy 100 free credits!';
gift_batch_id := 'holiday_2024_12';
```

### New Feature Launch
```sql
gift_amount := 50;
gift_reason := '🚀 Celebrating our new AI features! Here are 50 credits to try them out!';
gift_batch_id := 'feature_launch_2025_01';
```

### Service Disruption Apology
```sql
gift_amount := 25;
gift_reason := '🙏 Sorry for the service interruption. Please accept these credits as our apology.';
gift_batch_id := 'apology_2025_01';
```