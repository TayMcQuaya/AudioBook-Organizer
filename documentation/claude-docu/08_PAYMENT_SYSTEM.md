# Payment System - AudioBook Organizer

## Overview
The payment system handles:
1. Credit-based usage model
2. Stripe payment integration
3. Credit package purchases
4. Usage tracking and history
5. Webhook processing

## Credit System Architecture

### Credit Model
```javascript
// Credit costs per action
const CREDIT_COSTS = {
  UPLOAD_AUDIO: 2,
  UPLOAD_TEXT: 1,
  PROCESS_DOCX: 5,
  EXPORT_AUDIO: 5,
  EXPORT_DATA: 0
};

// Credit packages
const CREDIT_PACKAGES = [
  { credits: 100, price: 999, name: "Starter" },
  { credits: 500, price: 3999, name: "Professional" },
  { credits: 1000, price: 6999, name: "Enterprise" }
];
```

### Database Schema
```sql
-- User credits table
CREATE TABLE user_credits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    balance INTEGER DEFAULT 10,
    total_purchased INTEGER DEFAULT 0,
    total_consumed INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Credit transactions
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    amount INTEGER NOT NULL,
    type VARCHAR(50), -- 'purchase', 'consume', 'bonus'
    description TEXT,
    stripe_payment_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Usage logs
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(50),
    credits_consumed INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Backend Payment Components

### Stripe Service (`backend/services/stripe_service.py`)
- **Lines**: 372
- **Key Functions**:
  - `create_checkout_session()` - Payment initiation
  - `handle_webhook()` - Event processing
  - `verify_webhook_signature()` - Security
  - `process_successful_payment()` - Credit addition

### Stripe Routes (`backend/routes/stripe_routes.py`)
- **Lines**: 365
- **Endpoints**:
  - `GET /api/stripe/packages` - Available packages
  - `POST /api/stripe/create-checkout-session` - Start payment
  - `POST /api/stripe/webhook` - Handle events
  - `GET /api/stripe/transactions` - Payment history

### Credit Management (in `supabase_service.py`)
```python
def consume_credits(user_id, amount, action, metadata=None):
    # 1. Check current balance
    current = get_user_credits(user_id)
    
    # 2. Verify sufficient credits
    if current < amount:
        raise InsufficientCreditsError()
    
    # 3. Deduct credits
    new_balance = current - amount
    update_user_credits(user_id, new_balance)
    
    # 4. Log usage
    log_usage(user_id, action, amount, metadata)
    
    return new_balance
```

## Frontend Payment Integration

### Stripe Module (`frontend/js/modules/stripe.js`)
- **Lines**: 731
- **Features**:
  - Package selection UI
  - Checkout flow
  - Payment status handling
  - Transaction history display

### Payment Flow
```javascript
// 1. Select package
async function selectPackage(packageId) {
  const package = CREDIT_PACKAGES.find(p => p.id === packageId);
  
  // 2. Create checkout session
  const session = await api.post('/api/stripe/create-checkout-session', {
    package_id: packageId,
    credits: package.credits,
    amount: package.price
  });
  
  // 3. Redirect to Stripe
  window.location.href = session.checkout_url;
}

// 4. Handle return
async function handlePaymentReturn() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  
  if (sessionId) {
    const result = await verifyPayment(sessionId);
    if (result.success) {
      showSuccess('Payment successful! Credits added.');
      updateCreditDisplay();
    }
  }
}
```

## Webhook Processing

### Webhook Security
```python
# backend/routes/stripe_routes.py
@stripe_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    # 1. Get raw body for signature verification
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')
    
    # 2. Verify webhook signature
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError:
        return jsonify({'error': 'Invalid signature'}), 400
    
    # 3. Process event
    if event['type'] == 'checkout.session.completed':
        process_successful_payment(event['data']['object'])
    
    return jsonify({'received': True}), 200
```

### Event Handling
```python
def process_successful_payment(session):
    # 1. Extract payment details
    user_id = session['client_reference_id']
    credits = session['metadata']['credits']
    amount_paid = session['amount_total']
    
    # 2. Add credits to user
    add_credits_to_user(user_id, credits)
    
    # 3. Create transaction record
    create_transaction_record({
        'user_id': user_id,
        'amount': credits,
        'type': 'purchase',
        'stripe_payment_id': session['payment_intent'],
        'amount_paid_cents': amount_paid
    })
    
    # 4. Send confirmation email (optional)
    send_purchase_confirmation(user_id, credits)
```

## Credit Consumption

### Middleware Integration
```python
# backend/middleware/auth_middleware.py
def consume_credits(amount, action):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Run the function first
            result = f(*args, **kwargs)
            
            # If successful, consume credits
            if result.status_code < 400:
                user_id = g.current_user['id']
                supabase_service.consume_credits(
                    user_id, amount, action
                )
            
            return result
        return decorated_function
    return decorator

# Usage
@require_auth
@consume_credits(5, 'docx_upload')
def upload_docx():
    # Process DOCX file
    pass
```

### Frontend Credit Checks
```javascript
// Check before action
async function checkCreditsBeforeAction(action, requiredCredits) {
  const credits = await api.get('/api/auth/credits');
  
  if (credits.balance < requiredCredits) {
    showCreditWarning(requiredCredits, credits.balance);
    return false;
  }
  
  return true;
}

// Credit warning UI
function showCreditWarning(required, current) {
  showWarning(`
    This action requires ${required} credits.
    You currently have ${current} credits.
    <button onclick="showPurchaseOptions()">Buy Credits</button>
  `);
}
```

## Usage Tracking

### Usage History
```javascript
// Frontend display
async function displayUsageHistory() {
  const history = await api.get('/api/auth/usage-history');
  
  const table = history.map(entry => `
    <tr>
      <td>${formatDate(entry.created_at)}</td>
      <td>${entry.action}</td>
      <td>${entry.credits_consumed}</td>
      <td>${entry.remaining_balance}</td>
    </tr>
  `).join('');
  
  document.querySelector('#usage-table').innerHTML = table;
}
```

### Analytics
```sql
-- Common queries
-- Daily usage by user
SELECT 
    DATE(created_at) as day,
    SUM(credits_consumed) as total_credits,
    COUNT(*) as action_count
FROM usage_logs
WHERE user_id = $1
GROUP BY DATE(created_at)
ORDER BY day DESC;

-- Most common actions
SELECT 
    action,
    COUNT(*) as count,
    SUM(credits_consumed) as total_credits
FROM usage_logs
WHERE user_id = $1
GROUP BY action
ORDER BY count DESC;
```

## Testing Mode Behavior

### Credit Bypass
```python
# No credits consumed in testing mode
if app.config.get('TESTING_MODE'):
    # Skip credit checks
    return True

# Normal credit consumption
return consume_credits(user_id, amount, action)
```

### Payment Routes Disabled
```javascript
// Frontend check
if (isTestingMode()) {
  document.querySelector('.purchase-credits').style.display = 'none';
  showInfo('Credit purchases disabled in testing mode');
}
```

## Error Handling

### Payment Errors
```javascript
// Common error scenarios
const PAYMENT_ERRORS = {
  'card_declined': 'Your card was declined. Please try another card.',
  'insufficient_funds': 'Insufficient funds on your card.',
  'processing_error': 'Payment processing error. Please try again.',
  'session_expired': 'Payment session expired. Please start over.'
};

// Error handling
function handlePaymentError(error) {
  const message = PAYMENT_ERRORS[error.code] || 
    'Payment failed. Please contact support.';
  
  showError(message);
  logPaymentError(error);
}
```

### Credit System Errors
```python
class InsufficientCreditsError(Exception):
    def __init__(self, required, available):
        self.required = required
        self.available = available
        super().__init__(
            f"Insufficient credits. Required: {required}, "
            f"Available: {available}"
        )

class CreditSystemError(Exception):
    """Base class for credit system errors"""
    pass
```

## Configuration

### Stripe Configuration
```python
# backend/config.py
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY')
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')
STRIPE_SUCCESS_URL = f"{FRONTEND_URL}/payment/success"
STRIPE_CANCEL_URL = f"{FRONTEND_URL}/payment/cancelled"
```

### Credit Configuration
```python
# Initial credits for new users
INITIAL_USER_CREDITS = 10

# Bonus credits for referrals
REFERRAL_BONUS_CREDITS = 20

# Maximum credit balance
MAX_CREDIT_BALANCE = 10000
```

## Security Considerations

### Payment Security
1. Webhook signature verification
2. HTTPS-only endpoints
3. CSRF protection on checkout
4. No credit card data stored
5. Idempotency keys for retries

### Credit Security
1. Transaction logging
2. Balance validation
3. Rate limiting on purchases
4. Audit trail for all changes
5. Database constraints