# 🔄 Monthly Subscription Setup Guide
## AudioBook Organizer - Switching to Subscription Model

### 🎯 **Overview**

This guide explains how to set up monthly subscriptions instead of one-time credit purchases. **Important**: This requires significant code changes to your existing system.
Current codebase is set as one-time purchase. 

---

## 🏗️ **Subscription Model Design**

### **How Monthly Subscriptions Work:**
1. **User subscribes** to a monthly plan
2. **Credits auto-refill** each month
3. **Automatic billing** until canceled
4. **Subscription management** needed (pause, cancel, upgrade)

### **Recommended Subscription Tiers:**
```javascript
{
    'starter_monthly': {
        'name': 'Starter Monthly',
        'credits_per_month': 500,
        'price_monthly': 4.99,
        'description': '500 credits every month'
    },
    'creator_monthly': {
        'name': 'Creator Monthly', 
        'credits_per_month': 1500,
        'price_monthly': 12.99,
        'description': '1,500 credits every month'
    },
    'professional_monthly': {
        'name': 'Professional Monthly',
        'credits_per_month': 3500,
        'price_monthly': 24.99,
        'description': '3,500 credits every month'
    }
}
```

---

## 🔧 **Stripe Product Setup for Subscriptions**

### **Product 1: Starter Monthly**
- **Name**: `Starter Monthly`
- **Description**: `500 credits every month with automatic renewal`
- **Pricing Model**: **Recurring** ✅
- **Amount**: `$4.99`
- **Billing period**: **Monthly**
- **Currency**: `USD`

### **Product 2: Creator Monthly**
- **Name**: `Creator Monthly`
- **Description**: `1,500 credits every month with automatic renewal`
- **Pricing Model**: **Recurring** ✅
- **Amount**: `$12.99`
- **Billing period**: **Monthly**
- **Currency**: `USD`

### **Product 3: Professional Monthly**
- **Name**: `Professional Monthly`
- **Description**: `3,500 credits every month with automatic renewal`
- **Pricing Model**: **Recurring** ✅
- **Amount**: `$24.99`
- **Billing period**: **Monthly**
- **Currency**: `USD`

---

## 💾 **Required Database Changes**

### **New Tables Needed:**
```sql
-- Subscription tracking
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    plan_type TEXT NOT NULL, -- 'starter', 'creator', 'professional'
    status TEXT NOT NULL, -- 'active', 'canceled', 'past_due', 'paused'
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    credits_per_month INTEGER NOT NULL,
    monthly_price_cents INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit refill history
CREATE TABLE credit_refills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    credits_added INTEGER NOT NULL,
    refill_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    billing_period_start TIMESTAMP WITH TIME ZONE,
    billing_period_end TIMESTAMP WITH TIME ZONE
);

-- Subscription events log
CREATE TABLE subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES subscriptions(id),
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    event_data JSONB,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔄 **Backend Code Changes Required**

### **1. New Subscription Service**
```python
# backend/services/subscription_service.py
class SubscriptionService:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.stripe = stripe
        
    def create_subscription(self, user_id, price_id):
        """Create new subscription for user"""
        # Create Stripe customer
        # Create subscription
        # Save to database
        pass
        
    def cancel_subscription(self, subscription_id):
        """Cancel user subscription"""
        # Cancel in Stripe
        # Update database status
        pass
        
    def refill_monthly_credits(self, subscription_id):
        """Add monthly credits to user account"""
        # Get subscription details
        # Add credits to balance
        # Log refill event
        pass
        
    def handle_subscription_webhook(self, event):
        """Process subscription webhooks from Stripe"""
        # Handle subscription events:
        # - customer.subscription.created
        # - customer.subscription.updated  
        # - customer.subscription.deleted
        # - invoice.payment_succeeded
        # - invoice.payment_failed
        pass
```

### **2. Updated Stripe Routes**
```python
# backend/routes/stripe_routes.py - Additional endpoints needed

@stripe_bp.route('/create-subscription', methods=['POST'])
@require_auth
def create_subscription():
    """Create new subscription for user"""
    pass

@stripe_bp.route('/cancel-subscription', methods=['POST'])
@require_auth  
def cancel_subscription():
    """Cancel user's subscription"""
    pass

@stripe_bp.route('/subscription-status', methods=['GET'])
@require_auth
def get_subscription_status():
    """Get user's current subscription status"""
    pass

@stripe_bp.route('/subscription-webhook', methods=['POST'])
def handle_subscription_webhook():
    """Handle subscription-related webhooks"""
    pass
```

### **3. Credit Management Updates**
```python
# Modified credit system to handle monthly refills
def refill_subscription_credits():
    """Daily job to refill credits for active subscriptions"""
    # Get all active subscriptions due for refill
    # Add monthly credits
    # Update next refill date
    pass
```

---

## 🎨 **Frontend Changes Required**

### **1. Subscription Management UI**
```javascript
// New subscription management interface needed
- View current subscription
- Upgrade/downgrade plans  
- Cancel subscription
- View billing history
- Manage payment methods
```

### **2. Credit Display Updates**
```javascript
// Show subscription status alongside credits
"Credits: 450 / 500 (Starter Plan)"
"Next refill: January 15, 2024"
"Manage subscription"
```

### **3. Payment Flow Changes**
```javascript
// Change from one-time purchase to subscription signup
- Subscription selection interface
- Customer portal integration
- Cancellation flow
```

---

## ⚠️ **Important Considerations**

### **Complexity Increase:**
- ✅ **Current System**: Simple one-time purchases
- ❌ **Subscription System**: Complex recurring billing, cancellations, refunds

### **User Experience:**
- ✅ **One-time**: Pay when needed, full control
- ❌ **Subscription**: Monthly commitment, cancellation friction

### **Revenue Model:**
- ✅ **One-time**: Higher per-transaction value
- ✅ **Subscription**: Predictable recurring revenue

### **Support Burden:**
- ✅ **One-time**: Minimal billing support needed
- ❌ **Subscription**: Cancellation requests, billing disputes

---

## 🚀 **Implementation Timeline**

### **Phase 1: Database & Backend (1-2 weeks)**
1. Create subscription tables
2. Build subscription service
3. Add subscription webhooks
4. Create subscription endpoints

### **Phase 2: Frontend Integration (1 week)**  
1. Build subscription UI
2. Update credit displays
3. Add subscription management
4. Test user flows

### **Phase 3: Testing & Deployment (1 week)**
1. Test subscription flows
2. Test webhook handling
3. Test edge cases (failed payments, cancellations)
4. Deploy to production

---

## 💡 **Recommendation**

### **Stick with One-Time Purchases** 

Given your current setup and user base, I recommend:

1. **Keep the current one-time model** - it's simpler and working
2. **Set up products as "One-off" payments** in Stripe
3. **Consider subscriptions later** when you have more users

### **Hybrid Approach (Best of Both)**
```javascript
// Offer both options:
{
    'starter_pack': { price: 4.99, credits: 500 },      // One-time
    'starter_monthly': { price: 4.99, credits: 500 },   // Monthly
    'creator_pack': { price: 14.99, credits: 1500 },    // One-time  
    'creator_monthly': { price: 12.99, credits: 1500 }  // Monthly (discount)
}
```

---

## 🎯 **Next Steps**

1. **For now**: Set up **"One-off"** payments as planned
2. **Get one-time purchases working first**
3. **Gather user feedback** about subscription interest
4. **Add subscriptions later** if there's demand

The subscription model adds significant complexity. Start simple with one-time purchases, then expand to subscriptions once your core system is stable and you understand user preferences better. 