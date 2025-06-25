# 💰 Pricing Management Guide
## AudioBook Organizer - How to Update Prices & Packages

### 🎯 **Overview**

This guide explains how to modify pricing for your credit packages in the future. The system is designed to be flexible and allows for various pricing strategies without breaking existing functionality.

---

## 🏗️ **Current Pricing Architecture**

### **How Pricing Works**
Your pricing system has **3 levels** of configuration:

1. **Stripe Products/Prices** (External) - The actual payment processing
2. **Backend Configuration** (Code) - Package definitions and price IDs
3. **Environment Variables** (Config) - Price ID mappings

### **Current Package Structure**
```javascript
// Located in: backend/services/stripe_service.py
{
    'starter': {
        'name': 'Starter Pack',
        'credits': 500,
        'price_cents': 499,  // $4.99
        'price_id': 'price_stripe_id_here',
        'description': '500 credits for processing documents and audio files'
    },
    'creator': {
        'name': 'Creator Pack', 
        'credits': 1500,
        'price_cents': 1499,  // $14.99
        'price_id': 'price_stripe_id_here',
        'description': '1,500 credits for power users and content creators'
    },
    'professional': {
        'name': 'Professional Pack',
        'credits': 3500,
        'price_cents': 2999,  // $29.99
        'price_id': 'price_stripe_id_here',
        'description': '3,500 credits for professional users and publishers'
    }
}
```

---

## 🔄 **Price Change Methods**

### **Method 1: Simple Price Updates (Easiest)**
**Use Case**: Small price adjustments (±$5), same credit amounts
**Difficulty**: ⭐ Very Easy
**Downtime**: None
**Backwards Compatible**: Yes

#### **Steps:**
1. **Create New Stripe Prices** (keep same products):
   ```bash
   # Update Starter Pack from $4.99 to $5.99
   stripe prices create \
     --product=prod_existing_starter_id \
     --unit-amount=599 \
     --currency=usd
   
   # Copy new price ID: price_new_id_here
   ```

2. **Update Environment Variables**:
   ```bash
   # In your .env file
   STRIPE_PRICE_STARTER_PACK=price_new_id_here  # Changed this line
   STRIPE_PRICE_CREATOR_PACK=price_existing_creator_id
   STRIPE_PRICE_PROFESSIONAL_PACK=price_existing_professional_id
   ```

3. **Update Backend Code**:
   ```python
   # In backend/services/stripe_service.py - line ~40
   'starter': {
       'name': 'Starter Pack',
       'credits': 500,
       'price_cents': 599,  # Changed from 499 to 599
       'price_id': self.starter_pack_price_id,
       'description': '500 credits for processing documents and audio files'
   },
   ```

4. **Restart Application**:
   ```bash
   # Backend restart required to load new prices
   python app.py
   ```

**✅ Result**: New users see updated price, existing functionality unchanged.

---

### **Method 2: Package Restructuring (Medium)**
**Use Case**: Change credit amounts, add/remove packages, major pricing overhaul
**Difficulty**: ⭐⭐ Moderate
**Downtime**: Brief restart required
**Backwards Compatible**: Yes (with planning)

#### **Example: Adding a Premium Pack**

1. **Create New Stripe Product & Price**:
   ```bash
   stripe products create \
     --name="Premium Pack" \
     --description="5,000 credits for enterprise users"
   
   stripe prices create \
     --product=prod_new_premium_id \
     --unit-amount=4999 \  # $49.99
     --currency=usd
   ```

2. **Add Environment Variable**:
   ```bash
   # Add to .env
   STRIPE_PRICE_PREMIUM_PACK=price_new_premium_id
   ```

3. **Update Backend Service**:
   ```python
   # In backend/services/stripe_service.py
   
   # Add to __init__ method around line 30:
   self.premium_pack_price_id = os.environ.get('STRIPE_PRICE_PREMIUM_PACK')
   
   # Add to credit_packages dict around line 50:
   'premium': {
       'name': 'Premium Pack',
       'credits': 5000,
       'price_cents': 4999,  # $49.99
       'price_id': self.premium_pack_price_id,
       'description': '5,000 credits for enterprise users and bulk processing'
   }
   
   # Update packages_configured check around line 65:
   'packages_configured': bool(
       self.starter_pack_price_id and 
       self.creator_pack_price_id and 
       self.professional_pack_price_id and
       self.premium_pack_price_id  # Add this line
   )
   ```

4. **Update Frontend (Optional)**:
   ```javascript
   // In frontend/js/modules/stripe.js - line ~342
   // Change which package shows as "Most Popular"
   const isPopular = packageData.id === 'premium';  // Changed from 'professional'
   ```

**✅ Result**: New package available, all existing packages continue working.

---

### **Method 3: Complete Pricing Overhaul (Advanced)**
**Use Case**: New business model, complete package restructure
**Difficulty**: ⭐⭐⭐ Advanced
**Downtime**: Planned maintenance window
**Backwards Compatible**: Requires migration strategy

#### **Example: Moving to Subscription Model**

1. **Plan Migration Strategy**:
   ```bash
   # Phase 1: Add subscription options alongside one-time
   # Phase 2: Deprecate one-time purchases (6 month notice)
   # Phase 3: Remove one-time purchases
   ```

2. **Create Subscription Products**:
   ```bash
   stripe products create \
     --name="Monthly Pro Subscription" \
     --description="800 credits per month with rollover"
   
   stripe prices create \
     --product=prod_subscription_id \
     --unit-amount=999 \  # $9.99/month
     --currency=usd \
     --recurring[interval]=month
   ```

3. **Extended Backend Changes**:
   ```python
   # Would require new subscription handling logic
   # New database fields for subscription tracking
   # Modified credit refresh logic
   # Subscription management endpoints
   ```

**⚠️ Note**: This level of change requires careful planning and testing.

---

## 📂 **Files You'll Need to Modify**

### **Always Required:**
1. **Environment Variables** (`.env`):
   ```bash
   STRIPE_PRICE_STARTER_PACK=price_new_id
   STRIPE_PRICE_CREATOR_PACK=price_new_id
   STRIPE_PRICE_PROFESSIONAL_PACK=price_new_id
   ```

2. **Backend Service** (`backend/services/stripe_service.py`):
   ```python
   # Lines ~38-55: Update credit_packages dict
   # Lines ~65: Update packages_configured check (if adding packages)
   ```

### **Sometimes Required:**
3. **Frontend JavaScript** (`frontend/js/modules/stripe.js`):
   ```javascript
   // Line ~342: Change "Most Popular" badge
   // Only needed if changing which package to highlight
   ```

4. **Documentation** (Update guides):
   - `PAYMENT_TEST_GUIDE.md`
   - `STRIPE_PAYMENT_INTEGRATION_PLAN.md`

---

## 🚀 **Deployment Process**

### **For Production (Live Users):**

1. **Test in Development First**:
   ```bash
   # Create test prices in Stripe test mode
   # Update .env with test price IDs
   # Test thoroughly with test cards
   ```

2. **Create Live Prices**:
   ```bash
   # Switch to live mode in Stripe dashboard
   # Create new prices in live mode
   # Copy live price IDs
   ```

3. **Deploy Changes**:
   ```bash
   # Update production environment variables
   # Deploy code changes
   # Restart backend application
   ```

4. **Monitor & Verify**:
   ```bash
   # Check payment flow works
   # Verify webhook processing
   # Monitor error logs
   ```

### **Zero-Downtime Strategy:**
1. **Prepare new prices** in Stripe (don't activate yet)
2. **Deploy code changes** with new price IDs
3. **Update environment variables** to activate new prices
4. **No restart required** if only changing environment variables

---

## 💡 **Pricing Strategy Examples**

### **Scenario 1: Economic Adjustment**
**Goal**: Increase all prices by 20% due to costs
```bash
# Current: $4.99, $14.99, $29.99
# New:     $5.99, $17.99, $35.99

# Create 3 new prices, update 3 environment variables
# Update 3 price_cents values in code
# Total time: 15 minutes
```

### **Scenario 2: Value-Based Pricing**
**Goal**: More credits for same price to increase value
```bash
# Current: 500, 1500, 3500 credits
# New:     600, 1800, 4200 credits (20% more)

# Keep same prices, update credit amounts in code
# Users get more value for same cost
# Total time: 10 minutes
```

### **Scenario 3: Market Expansion**
**Goal**: Add budget and enterprise tiers
```bash
# Add: Basic Pack ($2.99, 200 credits)
# Add: Enterprise Pack ($99.99, 20,000 credits)

# Create 2 new products/prices
# Add 2 new environment variables
# Add 2 new packages to backend code
# Total time: 30 minutes
```

---

## 🔧 **Tools & Commands**

### **Stripe CLI Commands**:
```bash
# List current products
stripe products list

# List prices for a product
stripe prices list --product=prod_xxx

# Create new price
stripe prices create --product=prod_xxx --unit-amount=599 --currency=usd

# Update product details (name, description)
stripe products update prod_xxx --name="New Name"

# Deactivate old price (optional)
stripe prices update price_old_id --active=false
```

### **Testing Commands**:
```bash
# Test package loading
python -c "
from backend.services.stripe_service import StripeService
service = StripeService()
packages = service.get_all_packages()
for pkg_id, pkg in packages.items():
    print(f'{pkg_id}: {pkg[\"price_cents\"]/100:.2f} USD')
"

# Test payment status
python -c "
from backend.services.stripe_service import StripeService
service = StripeService()
print(service.get_payment_status())
"
```

---

## ⚠️ **Important Considerations**

### **Stripe Limitations**:
- ❌ **Cannot modify existing prices** - must create new ones
- ✅ **Can update product details** (name, description, images)
- ✅ **Can deactivate old prices** (prevents new purchases)
- ✅ **Old prices remain valid** for existing customers

### **Backwards Compatibility**:
- 🔄 **Existing users unaffected** by price changes
- 🔄 **Webhook processing continues** with old price IDs
- 🔄 **Transaction history preserved** with original prices
- 🔄 **Database structure unchanged** for price updates

### **Best Practices**:
1. **Always test in development** before production
2. **Keep old price IDs** for 30+ days (webhook delays)
3. **Update documentation** when changing prices
4. **Monitor metrics** after price changes
5. **Announce changes** to users in advance

---

## 📊 **Quick Reference Matrix**

| Change Type | Stripe Work | Code Changes | Env Variables | Restart Required | Difficulty |
|-------------|-------------|--------------|---------------|-----------------|------------|
| Price Adjustment | New Price | 1 line | 1 variable | Yes | ⭐ |
| Credit Amounts | None | 1 line | None | Yes | ⭐ |
| Add Package | New Product+Price | ~10 lines | 1 variable | Yes | ⭐⭐ |
| Remove Package | Deactivate Price | ~5 lines | Remove variable | Yes | ⭐⭐ |
| Rename Package | Update Product | 1 line | None | Yes | ⭐ |
| New Business Model | Multiple Products | Many lines | Multiple | Yes | ⭐⭐⭐ |

---

## 🎯 **Summary**

**Changing prices is designed to be simple:**

1. **Small Changes**: 5-15 minutes, no downtime
2. **Medium Changes**: 30-60 minutes, brief restart
3. **Major Changes**: Plan carefully, test thoroughly

**Your pricing system is built for flexibility** - you can adjust prices, credit amounts, add packages, or completely restructure your offerings without breaking existing functionality.

**The key principle**: Stripe prices are immutable, so you create new ones and update your configuration to use them. This ensures existing customers and transactions continue working while new customers get the updated pricing.

**Need help?** Each method includes step-by-step instructions and can be completed without technical expertise using the Stripe dashboard and simple text file edits. 