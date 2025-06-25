# 🚀 Complete Stripe Local Setup Guide
## AudioBook Organizer - Step-by-Step Local Testing Setup

### 🎯 **Overview**

This guide will get you from Stripe product creation to fully functional local testing in about 30 minutes. We'll set up one-time purchases only (no subscriptions).

---

## 📋 **Step 1: Complete Your Stripe Products**

### **Current Product (Starter Pack) - Fix Your Form**

**In your current Stripe form:**
1. **❌ Change "Recurring" to "One-off"** (click the One-off button)
2. **💰 Change Amount from "0.00" to "4.99"**
3. **✅ Keep Description**: "500 Credits to your Account."
4. **✅ Keep Name**: "Starter Pack"
5. **🔘 Click "Add product"**

**After saving:**
- **📋 Copy the Price ID** (looks like `price_1AbcDef123456789`)
- **📝 Write it down** as: `STRIPE_PRICE_STARTER_PACK`

### **Product 2: Creator Pack**

**Create new product:**
1. Go back to **Products** → **"+ Add product"**
2. **Name**: `Creator Pack`
3. **Description**: `1,500 credits for power users and content creators`
4. **Pricing**: **One-off** ✅
5. **Amount**: `14.99`
6. **Currency**: `USD`
7. **Click "Add product"**
8. **📋 Copy the Price ID** → Write as: `STRIPE_PRICE_CREATOR_PACK`

### **Product 3: Professional Pack**

**Create new product:**
1. **Products** → **"+ Add product"**
2. **Name**: `Professional Pack`
3. **Description**: `3,500 credits for professional users and publishers`
4. **Pricing**: **One-off** ✅
5. **Amount**: `29.99`
6. **Currency**: `USD`
7. **Click "Add product"**
8. **📋 Copy the Price ID** → Write as: `STRIPE_PRICE_PROFESSIONAL_PACK`

---

## 🔑 **Step 2: Collect All Your Keys**

### **API Keys (You Already Have)**
1. Go to **Developers** → **API keys**
2. **Copy Publishable Key** (starts with `pk_test_`)
3. **Copy Secret Key** (starts with `sk_test_`)

### **Webhook Setup (New)**
1. Go to **Developers** → **Webhooks**
2. **Click "+ Add endpoint"**
3. **Endpoint URL**: `http://localhost:5000/api/stripe/webhook`
4. **Description**: `Local testing webhook`
5. **Events to send**: Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
6. **Click "Add endpoint"**
7. **Click on the webhook you just created**
8. **In "Signing secret" section**, click **"Reveal"**
9. **📋 Copy the webhook secret** (starts with `whsec_`)

---

## 📝 **Step 3: Update Your .env File**

### **Open your .env file and add/update these lines:**

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

# Stripe Price IDs (replace with your actual Price IDs)
STRIPE_PRICE_STARTER_PACK=price_YOUR_STARTER_PRICE_ID
STRIPE_PRICE_CREATOR_PACK=price_YOUR_CREATOR_PRICE_ID
STRIPE_PRICE_PROFESSIONAL_PACK=price_YOUR_PROFESSIONAL_PRICE_ID

# Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Payment Settings
PAYMENTS_ENABLED=true
```

### **Example with Real Values:**
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51...your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_51...your_publishable_key_here

# Stripe Price IDs
STRIPE_PRICE_STARTER_PACK=price_1...your_starter_price_id
STRIPE_PRICE_CREATOR_PACK=price_1...your_creator_price_id
STRIPE_PRICE_PROFESSIONAL_PACK=price_1...your_professional_price_id

# Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_1...your_webhook_secret_here

# Payment Settings
PAYMENTS_ENABLED=true
```

---

## 🧪 **Step 4: Test Your Setup**

### **Start Your Application**
```bash
cd C:\Users\tayfu\Desktop\AudioBook
python app.py
```

### **Verify Stripe Integration**
```bash
# Test if Stripe service loads correctly
python -c "
from backend.services.stripe_service import StripeService
service = StripeService()
print('Payment Status:', service.get_payment_status())
packages = service.get_all_packages()
for name, pkg in packages.items():
    print(f'{name}: ${pkg[\"price_cents\"]/100:.2f} - {pkg[\"credits\"]} credits')
"
```

**Expected Output:**
```
Payment Status: {'status': 'enabled', 'packages_configured': True, 'stripe_connected': True}
starter: $4.99 - 500 credits
creator: $14.99 - 1500 credits  
professional: $29.99 - 3500 credits
```

### **Test in Browser**
1. Open `http://localhost:5000` (or your frontend URL)
2. Navigate to credit packages section
3. You should see all 3 packages with correct prices
4. Click "Buy Credits" on any package
5. Payment form should load

---

## 💳 **Step 5: Test Payments**

### **Test Credit Cards**

#### **✅ Successful Payment**
- **Card**: `4242 4242 4242 4242`
- **Expiry**: Any future date (like `12/28`)
- **CVC**: Any 3 digits (like `123`)
- **ZIP**: Any valid ZIP (like `12345`)

#### **❌ Declined Payment**
- **Card**: `4000 0000 0000 0002`
- **Expiry**: Any future date
- **CVC**: Any 3 digits

#### **🔒 3D Secure Test**
- **Card**: `4000 0027 6000 3184`
- **Expiry**: Any future date
- **CVC**: Any 3 digits

### **What Should Happen**
1. **Payment form loads** ✅
2. **Test payment processes** ✅
3. **Credits are added to user account** ✅ (if webhooks work)
4. **Transaction appears in Stripe dashboard** ✅

---

## 🎣 **Step 6: Webhook Testing (Advanced)**

### **Problem with Local Webhooks**
**Issue**: Stripe can't reach `localhost:5000` from the internet.

### **Solution A: Skip Webhooks for Basic Testing**
- Payments will process but credits won't auto-add
- You can manually test credit addition via database
- Good for basic payment flow testing

### **Solution B: Use ngrok for Full Testing (Optional)**
If you want full webhook testing:

1. **Download ngrok**: [https://ngrok.com/download](https://ngrok.com/download)
2. **Start your app**: `python app.py`
3. **In new terminal**: `ngrok http 5000`
4. **Copy the ngrok URL** (like `https://abc123.ngrok.io`)
5. **Update webhook URL** in Stripe to: `https://abc123.ngrok.io/api/stripe/webhook`

**For now, skip this - you can test payments without webhooks.**

---

## 🔍 **Step 7: Troubleshooting**

### **Common Issues & Solutions**

#### **Issue: "No module named 'stripe'"**
```bash
pip install stripe
```

#### **Issue: "Invalid API key"**
- Check you copied keys correctly from Stripe dashboard
- Verify you're in "Test mode" in Stripe
- Remove any extra spaces in .env file

#### **Issue: "Price not found"**
- Go back to Stripe → Products
- Click each product and copy exact Price ID
- Update .env with correct Price IDs
- Restart application

#### **Issue: Packages not showing in UI**
- Check browser console (F12) for errors
- Verify STRIPE_PUBLISHABLE_KEY is correct
- Check that PAYMENTS_ENABLED=true

#### **Issue: Payment form won't load**
- Verify publishable key starts with `pk_test_`
- Check browser network tab for 404 errors
- Restart application after .env changes

---

## 📊 **Step 8: Monitor Test Payments**

### **View Transactions in Stripe**
1. Go to Stripe Dashboard → **Payments**
2. See all test transactions
3. Click any payment for details
4. Verify amounts match your packages

### **Check Logs**
1. **Developers** → **Logs**
2. See API requests and responses
3. Debug any issues

### **Check Events**
1. **Developers** → **Events**
2. See webhook delivery attempts
3. Useful for webhook debugging

---

## 🚀 **Step 9: Prepare for Production**

### **When Ready to Go Live**

#### **Switch to Live Mode**
1. **Toggle to "Live mode"** in Stripe dashboard (top-left)
2. **Create live products** (same process, live mode)
3. **Get live API keys** (will start with `pk_live_` and `sk_live_`)
4. **Create live webhook** pointing to your production domain

#### **Update Production .env**
```bash
# Live Stripe Configuration
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY

# Live Price IDs
STRIPE_PRICE_STARTER_PACK=price_live_starter_id
STRIPE_PRICE_CREATOR_PACK=price_live_creator_id
STRIPE_PRICE_PROFESSIONAL_PACK=price_live_professional_id

# Live Webhook
STRIPE_WEBHOOK_SECRET=whsec_live_webhook_secret

# Enable payments
PAYMENTS_ENABLED=true
```

#### **Production Webhook URL**
Instead of `localhost:5000`, use your production domain:
`https://yourdomain.com/api/stripe/webhook`

---

## ✅ **Complete Checklist**

### **Stripe Setup:**
- [ ] ✅ Create Starter Pack ($4.99, one-off)
- [ ] ✅ Create Creator Pack ($14.99, one-off)  
- [ ] ✅ Create Professional Pack ($29.99, one-off)
- [ ] ✅ Copy all 3 Price IDs
- [ ] ✅ Get API keys (publishable & secret)
- [ ] ✅ Create webhook endpoint
- [ ] ✅ Copy webhook secret

### **Local Setup:**
- [ ] ✅ Update .env file with all keys
- [ ] ✅ Set PAYMENTS_ENABLED=true
- [ ] ✅ Install stripe package (`pip install stripe`)
- [ ] ✅ Start application (`python app.py`)

### **Testing:**
- [ ] ✅ Verify packages load correctly
- [ ] ✅ Test payment form loads
- [ ] ✅ Test successful payment (4242 card)
- [ ] ✅ Test declined payment (0002 card)
- [ ] ✅ Check transactions in Stripe dashboard

### **Production Ready:**
- [ ] ⏳ Create live products in Stripe
- [ ] ⏳ Update production .env with live keys
- [ ] ⏳ Set up live webhook with production URL
- [ ] ⏳ Test with real payment methods

---

## 🎯 **Quick Start Summary**

1. **Fix your current Stripe form** (One-off, $4.99)
2. **Create 2 more products** (Creator $14.99, Professional $29.99)
3. **Copy all 3 Price IDs + API keys + webhook secret**
4. **Update .env file** with all values
5. **Test locally** with 4242 test card
6. **Ready for production** when you're satisfied with testing

**This should take about 30 minutes to complete!** 🚀 