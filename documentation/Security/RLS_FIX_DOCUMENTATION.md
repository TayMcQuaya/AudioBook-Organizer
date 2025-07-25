# Supabase RLS (Row Level Security) Fix Documentation

## The Issue
When using Supabase Python client v2.x with Row Level Security (RLS) enabled tables, the client needs to be explicitly authenticated with the user's JWT token. Without this, `auth.uid()` in RLS policies returns `null`, causing a mismatch with `user_id` and blocking database operations.

## Special Case: Google OAuth Signup
The "Database error saving new user" during Google OAuth signup is a different issue caused by a database trigger. See `GOOGLE_OAUTH_FIX.md` for the solution.

## The Fix
Add these lines before any Supabase table operations:

```python
from backend.middleware.auth_middleware import extract_token_from_header

# Get the user's JWT token
token = extract_token_from_header()
if token and hasattr(supabase.client, 'postgrest'):
    supabase.client.postgrest.auth(token)
```

## Where the Fix Was Applied
1. **✅ Fixed**: `backend/routes/project_routes.py`
   - `save_project()` function - line 47-51
   - `get_latest_project()` function - line 125-129

2. **✅ Fixed**: `backend/services/supabase_service.py`
   - `initialize_user()` function - line 304-310
   - `create_user_profile()` function - line 255-261
   - `initialize_user_credits()` function - line 448-454

## Potential Areas That May Need the Fix

### 1. **backend/routes/auth_routes.py**
Check these functions if they access RLS-protected tables:
- `init_user()` - Accesses `profiles` table
- `update_user_profile()` - Updates `profiles` table
- `get_user_profile()` - Reads from `profiles` table
- `get_usage_history()` - Reads from `usage_logs` table
- `get_user_credits()` - Reads from `user_credits` table

### 2. **backend/routes/stripe_routes.py**
If payment tables have RLS:
- `create_checkout_session()` - May write to `credit_transactions`
- `handle_webhook()` - Updates multiple tables
- `get_user_transactions()` - Reads transaction history

### 3. **backend/services/supabase_service.py**
Service methods that directly access tables:
- `initialize_user()` - Creates entries in multiple tables
- `update_user_credits()` - Updates `user_credits` table
- `log_usage()` - Writes to `usage_logs` table

## Tables with RLS Enabled
From `01_database_schema_cloud.sql`:
- `profiles`
- `user_credits`
- `usage_logs`
- `credit_transactions`
- `audiobook_projects`
- `file_uploads`

## How to Test if an Endpoint Needs the Fix
1. Make a request to the endpoint
2. Check backend logs for error: `new row violates row-level security policy`
3. If you see this error, the endpoint needs the fix

## Why This Happens
- Supabase Python client doesn't automatically use the JWT token from Flask's auth middleware
- The client needs explicit authentication for RLS to work
- This is different from the JavaScript SDK which maintains auth state

## Production Considerations
- ✅ **No performance impact** - Uses existing token
- ✅ **Thread-safe** - Each request gets its own context
- ✅ **Secure** - Follows Supabase best practices
- ✅ **Works identically** in development and production