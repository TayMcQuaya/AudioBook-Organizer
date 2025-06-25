# Payment Testing Guide

This guide provides detailed instructions for testing Stripe payments locally.

## Payment System Toggle

You can enable/disable payments using environment variables:

```bash
# In your .env file
PAYMENTS_ENABLED=true   # Enable payments (default)
PAYMENTS_ENABLED=false  # Disable payments
```

## Database Schema Safety

It's completely safe to update your database schema even if you turn off payments. The new schema only adds optional columns and standalone tables.

## Local Testing Setup

### Step 1: Get Stripe API Keys

1. Create/Login to Stripe Account: https://dashboard.stripe.com/register
2. Get Test API Keys from Dashboard → Developers → API Keys
3. Add to your .env file

### Step 2: Create Stripe Products

Go to Dashboard → Products → Add Product and create:
- Starter Pack: $4.99 for 500 credits
- Creator Pack: $14.99 for 1,500 credits
- Professional Pack: $29.99 for 3,500 credits

### Step 3: Test Payment Flow

Use test cards:
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- 3D Secure: 4000 0025 0000 3155

## **🧪 Local Testing Instructions**

### **Prerequisites:**
1. **Stripe Account**: Sign up at [stripe.com](https://stripe.com)
2. **Stripe CLI**: Download from [stripe.com/docs/stripe-cli](https://docs.stripe.com/stripe-cli)

### **Setup Steps:**

#### **1. Configure Stripe Products & Prices**
```bash
# Login to Stripe CLI
stripe login

# Create products and prices (run these once)
stripe products create --name="Starter Pack" --description="500 credits for document processing"
stripe prices create --unit-amount=499 --currency=usd --product=prod_XXX

stripe products create --name="Creator Pack" --description="1,500 credits for power users"  
stripe prices create --unit-amount=1499 --currency=usd --product=prod_YYY

stripe products create --name="Professional Pack" --description="3,500 credits for professional users"
stripe prices create --unit-amount=2999 --currency=usd --product=prod_ZZZ
```

#### **2. Update Environment Variables**
Create/update your `.env` file:
```bash
# Add these Stripe configurations
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_PRICE_STARTER_PACK=price_YOUR_STARTER_PRICE_ID
STRIPE_PRICE_CREATOR_PACK=price_YOUR_CREATOR_PRICE_ID
STRIPE_PRICE_PROFESSIONAL_PACK=price_YOUR_PROFESSIONAL_PRICE_ID

# Ensure Normal Mode (not testing mode)
TESTING_MODE=false

# Frontend URL for redirects
FRONTEND_URL=http://localhost:3000
```

#### **3. Run Database Migration**
In Supabase SQL Editor, run:
```sql
-- Copy and paste contents of sql/add_stripe_support.sql
```

#### **4. Start Local Development**
```bash
# Terminal 1: Start backend (runs on localhost:5000)
python app.py

# Terminal 2: Start webhook forwarding
stripe listen --forward-to localhost:5000/api/stripe/webhook

# Terminal 3: Frontend is already served by backend
# Navigate to http://localhost:3000
```

### **Testing Scenarios:**

#### **💳 Test Cards (No Real Money):**
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`  
- **3D Secure**: `4000 0025 0000 3155`

#### **🔬 Test Cases:**
1. **Normal Mode Purchase** - Should show payment interface
2. **Testing Mode** - Should show "Payment unavailable" message
3. **Successful Payment** - Credits added after webhook
4. **Failed Payment** - Proper error handling
5. **Duplicate Prevention** - Same webhook processed once
6. **Transaction History** - Shows completed purchases

### **Expected Flow:**
1. User clicks "Purchase Credits" → Stripe Checkout opens
2. User completes payment → Redirected to success page
3. Webhook processes → Credits added to database
4. UI updates → New credit balance shown

---

## **🚀 Next Steps (Steps 9-12):**

9. **Security Hardening** - Rate limiting, input validation
10. **Error Handling** - Comprehensive error responses
11. **Testing & Validation** - Full integration testing
12. **Production Configuration** - Live keys, monitoring

**Your Stripe payment system is now ready for local testing!** 
