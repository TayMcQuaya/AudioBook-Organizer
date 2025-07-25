# Google OAuth Signup Fix

## The Problem
When users try to sign up with Google OAuth, they get: "Database error saving new user"

## Root Cause
The database has a trigger `handle_new_user()` that runs when a new user is created in `auth.users`. This trigger tries to insert into the `profiles` and `user_credits` tables, but it's configured with `SECURITY INVOKER`, which means it runs with the permissions of the caller.

During Google OAuth signup:
1. Supabase creates the user in `auth.users` with service role permissions
2. The trigger fires but has no authenticated user context
3. The RLS policies on `profiles` and `user_credits` require `auth.uid()` to match
4. Since `auth.uid()` is NULL, the insertions fail

## The Solution
Change the trigger function from `SECURITY INVOKER` to `SECURITY DEFINER` so it runs with elevated permissions that can bypass RLS.

## How to Apply the Fix

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Run the SQL script in `sql/06_fix_oauth_trigger.sql`
4. The script will:
   - Drop the existing trigger and function
   - Recreate them with `SECURITY DEFINER`
   - Add error handling to prevent user creation failures
   - Grant necessary permissions

## Testing
After applying the fix:
1. Try signing up with Google OAuth
2. Check that the user is created successfully
3. Verify that the profile and credits are initialized

## Note
The backend RLS fixes in `supabase_service.py` are still needed for other operations, but they don't solve the OAuth signup issue because the trigger runs before our backend code is involved.