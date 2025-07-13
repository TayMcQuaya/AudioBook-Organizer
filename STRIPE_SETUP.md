Stripe Setup for Your New Account 💳

  Step 1: Create Products in Stripe Dashboard

  1. Log into your NEW Stripe account at https://dashboard.stripe.com
  2. Go to Products (in the left sidebar)
  3. Click "Add Product" and create these 3 products:

  3. Product 1: Starter Pack
    - Name: Starter Pack
    - Description: 250 credits for AudioBook Organizer
    - Price: $4.99 (one-time)
    - Pricing model: One-time

  Product 2: Creator Pack
    - Name: Creator Pack
    - Description: 1,000 credits for AudioBook Organizer
    - Price: $14.99 (one-time)
    - Pricing model: One-time

  Product 3: Professional Pack
    - Name: Professional Pack
    - Description: 2,500 credits for AudioBook Organizer
    - Price: $29.99 (one-time)
    - Pricing model: One-time
  4. After creating each product, Stripe will show you a Price ID that looks like: price_1ABC123DEF456...

  Step 2: Update Price IDs in DigitalOcean

  Copy the new Price IDs and update these variables in DigitalOcean:

  STRIPE_PRICE_STARTER_PACK=price_[copy your new Starter Pack price ID]
  STRIPE_PRICE_CREATOR_PACK=price_[copy your new Creator Pack price ID]
  STRIPE_PRICE_PROFESSIONAL_PACK=price_[copy your new Professional Pack price ID]

  Step 3: Create Webhook

  1. In Stripe Dashboard, go to Developers → Webhooks
  2. Click "Add endpoint"
  3. Fill in:
    - Endpoint URL: https://www.audiobookorganizer.com/api/stripe/webhook
    - Description: AudioBook Organizer Payment Webhook
  4. Under "Select events", click "Select events" and choose:
    - ✅ payment_intent.succeeded
    - ✅ payment_intent.payment_failed
  5. Click "Add endpoint"
  6. After creation, you'll see a Signing secret that starts with whsec_...
  7. Copy this and update in DigitalOcean:
  STRIPE_WEBHOOK_SECRET=whsec_[your new webhook secret]  # ☑️ ENCRYPT THIS

  Step 4: Update API Keys (if using new account)

  If this is a completely new Stripe account, also update:

  STRIPE_PUBLISHABLE_KEY=pk_test_[your new publishable key]
  STRIPE_SECRET_KEY=sk_test_[your new secret key]  # ☑️ ENCRYPT THIS

  You can find these in Stripe Dashboard → Developers → API keys

  That's it!

  Once you've:
  1. ✅ Created the 3 products
  2. ✅ Updated the Price IDs in DigitalOcean
  3. ✅ Created the webhook
  4. ✅ Updated the webhook secret in DigitalOcean

  Your Stripe setup is complete!