# 🔑 Stripe Setup Guide (Web Dashboard Only)
## AudioBook Organizer - Complete Setup Without CLI

### 🎯 **Overview**

This guide shows you how to set up Stripe for testing using only the web dashboard. **No software downloads required!** Everything can be done through your browser.

---

## 🚀 **Step 1: Get Your API Keys**

### **Access Your Stripe Dashboard**
1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Log in with your Stripe account
3. **Important**: Make sure you're in **"Test mode"** (toggle in the top-left should show "Test mode")

### **Get Your Test API Keys**
1. In the left sidebar, click **"Developers"**
2. Click **"API keys"**
3. You'll see two keys:

   **🔑 Publishable key** (starts with `pk_test_`):
   ```
   pk_test_51...your_key_here
   ```
   
   **🔐 Secret key** (starts with `sk_test_`):
   ```
   sk_test_51...your_key_here
   ```

4. **Copy both keys** - you'll need them for your `.env` file

---

## 🏷️ **Step 2: Create Your Products & Prices**

### **Create Products**
1. In Stripe dashboard, go to **"Products"** in the left sidebar
2. Click **"+ Add product"**
3. Create **3 products** with these details:

#### **Product 1: Starter Pack**
- **Name**: `Starter Pack`
- **Description**: `500 credits for processing documents and audio files`
- **Pricing**: 
  - **Price**: `$4.99`
  - **Billing**: `One-time`
  - **Currency**: `USD`
- Click **"Save product"**
- **Copy the Price ID** (starts with `price_`) - you'll need this!

#### **Product 2: Creator Pack**
- **Name**: `Creator Pack`
- **Description**: `1,500 credits for power users and content creators`
- **Pricing**: 
  - **Price**: `$14.99`
  - **Billing**: `One-time`
  - **Currency**: `USD`
- Click **"Save product"**
- **Copy the Price ID** (starts with `price_`) - you'll need this!

#### **Product 3: Professional Pack**
- **Name**: `Professional Pack`
- **Description**: `3,500 credits for professional users and publishers`
- **Pricing**: 
  - **Price**: `$29.99`
  - **Billing**: `One-time`
  - **Currency**: `USD`
- Click **"Save product"**
- **Copy the Price ID** (starts with `price_`) - you'll need this!

### **Find Your Price IDs**
After creating products, you can find Price IDs by:
1. Go to **"Products"** in dashboard
2. Click on any product
3. Under **"Pricing"**, you'll see the Price ID (like `price_1abc123xyz`)
4. **Copy all 3 Price IDs** - write them down!

---

## 📝 **Step 3: Update Your Environment File**

### **Edit Your .env File**
1. Open your `.env` file in your AudioBook project
2. Add/update these lines with your actual values:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

# Stripe Price IDs (from the products you just created)
STRIPE_PRICE_STARTER_PACK=price_YOUR_STARTER_PRICE_ID
STRIPE_PRICE_CREATOR_PACK=price_YOUR_CREATOR_PRICE_ID
STRIPE_PRICE_PROFESSIONAL_PACK=price_YOUR_PROFESSIONAL_PRICE_ID

# Payment Settings
PAYMENTS_ENABLED=true
```

### **Example of Complete .env Section**
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51...your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_51...your_publishable_key_here

# Stripe Price IDs
STRIPE_PRICE_STARTER_PACK=price_1...your_starter_price_id
STRIPE_PRICE_CREATOR_PACK=price_1...your_creator_price_id
STRIPE_PRICE_PROFESSIONAL_PACK=price_1...your_professional_price_id

# Payment Settings
PAYMENTS_ENABLED=true
```

---

## 🧪 **Step 4: Test Without Webhooks (Simple Testing)**

### **Start Your Application**
```bash
# In your AudioBook directory
python app.py
```

### **Test the Payment Interface**
1. Open your app in browser (usually `http://localhost:5000` or `http://localhost:3000`)
2. Navigate to where credit packages are shown
3. You should see all 3 packages with correct prices
4. Click "Buy Credits" on any package

### **Use Test Credit Cards**
When prompted for payment, use these **test card numbers**:

#### **✅ Successful Payment**
- **Card**: `4242 4242 4242 4242`
- **Expiry**: Any future date (like `12/28`)
- **CVC**: Any 3 digits (like `123`)
- **ZIP**: Any valid ZIP (like `12345`)

#### **❌ Declined Payment**
- **Card**: `4000 0000 0000 0002`
- **Expiry**: Any future date
- **CVC**: Any 3 digits

#### **🔒 3D Secure (Authentication Required)**
- **Card**: `4000 0027 6000 3184`
- **Expiry**: Any future date
- **CVC**: Any 3 digits

### **What Should Happen**
1. **Payment form loads** ✅
2. **Test payment goes through** ✅  
3. **Credits are NOT added yet** (because no webhooks) ⚠️

**This is normal!** Without webhooks, payments process but credits aren't added. That's the next step.

---

## 🎣 **Step 5: Set Up Webhooks (Web Dashboard Method)**

### **Create a Webhook Endpoint**
1. In Stripe dashboard, go to **"Developers"** → **"Webhooks"**
2. Click **"+ Add endpoint"**
3. **Endpoint URL**: `http://localhost:5000/api/stripe/webhook`
4. **Description**: `Local testing webhook`
5. **Events to send**: Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
6. Click **"Add endpoint"**

### **Get Webhook Secret**
1. After creating the webhook, click on it
2. In the **"Signing secret"** section, click **"Reveal"**
3. Copy the webhook secret (starts with `whsec_`)
4. Add it to your `.env` file:

```bash
# Add this line to your .env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

### **⚠️ Important: Webhook Limitations**
**Local testing with webhooks has a problem**: Stripe can't reach your local computer (`localhost:5000`) from the internet.

**Two Solutions:**

#### **Solution A: Skip Webhook Testing (Easiest)**
- Test payments work, but credits won't be added automatically
- You can manually add credits for testing:
  ```sql
  -- Add credits manually in Supabase for testing
  UPDATE credit_balances 
  SET balance = balance + 500 
  WHERE user_id = 'your_test_user_id';
  ```

#### **Solution B: Use a Tunnel Service (Advanced)**
If you want full webhook testing, you'd need a service like `ngrok` or `localtunnel` to expose your local server to the internet. But this isn't necessary for basic testing.

---

## ✅ **Step 6: Verify Everything Works**

### **Test Checklist**
1. **✅ App starts without errors**
2. **✅ Credit packages display with correct prices**
3. **✅ Payment form loads when clicking "Buy Credits"**
4. **✅ Test payments process successfully**
5. **✅ No console errors in browser developer tools**

### **Quick Verification Commands**
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

---

## 🐛 **Troubleshooting Common Issues**

### **Issue: "No module named 'stripe'"**
**Solution**: Install the Stripe package
```bash
pip install stripe
```

### **Issue: "Invalid API key"**
**Solution**: 
1. Double-check you copied the correct keys from Stripe dashboard
2. Make sure you're in "Test mode" in Stripe dashboard
3. Verify keys in `.env` file don't have extra spaces

### **Issue: "Price not found"**
**Solution**:
1. Go back to Stripe dashboard → Products
2. Click on each product and copy the exact Price ID
3. Update your `.env` file with correct Price IDs

### **Issue: Packages not showing**
**Solution**: Check browser console for errors:
1. Press `F12` in browser
2. Look at Console tab for red error messages
3. Most common: API key or Price ID issues

### **Issue: Payment form won't load**
**Solution**:
1. Check if `STRIPE_PUBLISHABLE_KEY` is set correctly in `.env`
2. Verify the publishable key starts with `pk_test_`
3. Restart your application after changing `.env`

---

## 🎯 **Testing Scenarios**

### **Test 1: Successful Purchase**
1. Use card: `4242 4242 4242 4242`
2. Payment should complete
3. You should get success message

### **Test 2: Failed Purchase**
1. Use card: `4000 0000 0000 0002`
2. Payment should be declined
3. You should get error message

### **Test 3: Different Package Amounts**
1. Try purchasing each of the 3 packages
2. Verify correct amounts show in Stripe dashboard
3. Check in Stripe dashboard → Payments to see test transactions

---

## 📊 **Monitor Test Payments**

### **View Test Transactions**
1. In Stripe dashboard, go to **"Payments"**
2. You'll see all your test payments
3. Click on any payment to see details
4. Verify amounts match your packages

### **Check Logs**
1. Go to **"Developers"** → **"Logs"**
2. See all API requests and responses
3. Helpful for debugging issues

---

## 🚀 **Next Steps After Testing**

### **When Ready for Production**
1. **Switch to Live mode** in Stripe dashboard (toggle top-left)
2. **Create live products** (same process as test)
3. **Get live API keys** (will start with `pk_live_` and `sk_live_`)
4. **Update .env** with live keys and price IDs
5. **Set up live webhooks** pointing to your production domain

### **Production Webhook URL**
Instead of `http://localhost:5000/api/stripe/webhook`, use:
`https://yourdomain.com/api/stripe/webhook`

---

## 💡 **Quick Reference**

### **What You Need from Stripe Dashboard:**
- ✅ **Secret Key** (`sk_test_...`) → `STRIPE_SECRET_KEY`
- ✅ **Publishable Key** (`pk_test_...`) → `STRIPE_PUBLISHABLE_KEY`  
- ✅ **Starter Price ID** (`price_...`) → `STRIPE_PRICE_STARTER_PACK`
- ✅ **Creator Price ID** (`price_...`) → `STRIPE_PRICE_CREATOR_PACK`
- ✅ **Professional Price ID** (`price_...`) → `STRIPE_PRICE_PROFESSIONAL_PACK`
- ⚪ **Webhook Secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET` (optional for basic testing)

### **Test Credit Cards:**
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0027 6000 3184`

**Remember**: Everything can be done through the web dashboard - no software downloads needed! 🎉 