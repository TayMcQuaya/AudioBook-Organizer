

  1. Create New Production Database

  1. Go to https://app.supabase.com
  2. Click "New Project"
  3. Name it: audiobook-organizer-prod (or similar)
  4. Choose same region as your DigitalOcean app
  5. Generate a STRONG database password
  6. Wait for project to be created (~2 minutes)

  2. Run SQL Scripts in Production Database

● 3. Run SQL Scripts in Order

  Go to your new production Supabase project → SQL Editor and run these files in order:

  1. database_schema_cloud.sql - Creates all tables and basic setup
  2. add_stripe_support.sql - Adds payment tables
  3. fix_function_search_paths.sql - Security fixes
  4. fix_security_definer_views.sql - View security fixes
  5. rls_issue_fix.sql - RLS policy fixes
  6. delete_user_account.sql - Account deletion support

  4. Configure Production Database

  In Supabase Dashboard:
  1. Authentication → Providers:
    - Enable Email provider
    - Enable "Confirm email" = ON
    - Enable Google OAuth (add your credentials)
  2. Authentication → URL Configuration:
    - Site URL: https://www.audiobookorganizer.com
    - Redirect URLs: https://www.audiobookorganizer.com/app
  3. Authentication → Email Templates:
    - Customize if needed

  5. Update Environment Variables


● LOCAL (.env) - Keep your TEST database:
  # Keep all your current test database settings
  SUPABASE_URL=https://jvkqeurgsdvaupksguby.supabase.co
  SUPABASE_ANON_KEY=[your_test_anon_key]
  SUPABASE_SERVICE_KEY=[your_test_service_key]
  JWT_SECRET_KEY=[your_test_jwt_secret]

  PRODUCTION (DigitalOcean) - Use NEW database:
  # Get these from your NEW production Supabase project
  SUPABASE_URL=https://[new-project-id].supabase.co
  SUPABASE_ANON_KEY=[new_production_anon_key]
  SUPABASE_SERVICE_KEY=[new_production_service_key]  # ☑️ ENCRYPT
  JWT_SECRET_KEY=[new_production_jwt_secret]  # ☑️ ENCRYPT

  6. Where to Find New Credentials

  In your new production Supabase project:
  1. Go to Settings → API
  2. Copy:
    - Project URL → SUPABASE_URL
    - anon public key → SUPABASE_ANON_KEY
    - service_role secret → SUPABASE_SERVICE_KEY
    - JWT Secret → JWT_SECRET_KEY

  7. Benefits of Separate Databases

  ✅ Test database: Safe for development, testing features
  ✅ Production database: Clean slate, no test data
  ✅ Security: Test credentials never touch production
  ✅ Isolation: Can reset test DB without affecting production

  8. Next Steps

  1. Create the new production Supabase project
  2. Run all SQL scripts in order
  3. Update DigitalOcean with new production credentials
  4. Keep your local .env pointing to test database
  5. Continue with Stripe setup as previously outlined

  This way you can safely test locally without affecting production data!