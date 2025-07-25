# API Endpoint Testing with CURL

## Prerequisites
1. **Start the app first**:
   ```bash
   cd backend
   python app.py
   ```
   The app should be running on `http://localhost:3000`

2. **Get CSRF token first** (required for POST requests):
   ```bash
   # Get CSRF token and save cookies
   curl -c cookies.txt http://localhost:3000/api/security/csrf-token
   ```
   Save the token from the response for use in POST requests.

## 🔧 Endpoints We Changed (Priority Tests)

### 1. Authentication Config & Security Status
```bash
# Test auth config endpoint
curl http://localhost:3000/api/auth/config

# Test security status (reCAPTCHA config)
curl http://localhost:3000/api/auth/security-status
```

### 2. Login Flow (Full Test)
```bash
# First get CSRF token
CSRF_TOKEN=$(curl -s -c cookies.txt http://localhost:3000/api/security/csrf-token | jq -r '.csrf_token')

# Login (replace with your test credentials)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -b cookies.txt \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "your-password",
    "recaptcha_token": "test-token"
  }'
```

### 3. User Initialization (requires auth)
```bash
# After login, get the auth token from the login response
# Then use it for authenticated requests

# Init user (using token from login response)
curl -X POST http://localhost:3000/api/auth/init-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -b cookies.txt \
  -d '{
    "email": "test@example.com",
    "name": "Test User"
  }'
```

### 4. Credits Endpoint
```bash
# Get user credits (requires auth)
curl http://localhost:3000/api/auth/credits \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -b cookies.txt
```

### 5. Projects Endpoints
```bash
# Get latest project
curl http://localhost:3000/api/projects/latest \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -b cookies.txt

# Save a project (example)
curl -X POST http://localhost:3000/api/projects/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -b cookies.txt \
  -d '{
    "title": "Test Project",
    "content": "Test content"
  }'
```

### 6. Profile & Usage History
```bash
# Get user profile
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -b cookies.txt

# Get usage history
curl http://localhost:3000/api/auth/usage-history?page=1&per_page=10 \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -b cookies.txt
```

### 7. Stripe Endpoints (if configured)
```bash
# Get Stripe config
curl http://localhost:3000/api/stripe/config \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -b cookies.txt

# Get credit packages
curl http://localhost:3000/api/stripe/packages \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -b cookies.txt
```

## 🚀 Quick Test Script

Create a file `test_api.sh`:

```bash
#!/bin/bash

# Base URL
BASE_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    echo -e "\n${GREEN}Testing: $1${NC}"
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$2")
    http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_status" = "200" ]; then
        echo -e "${GREEN}✓ Success (200)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ Failed (HTTP $http_status)${NC}"
        echo "$body"
    fi
}

# Test public endpoints (no auth required)
echo "=== Testing Public Endpoints ==="
test_endpoint "Auth Config" "$BASE_URL/api/auth/config"
test_endpoint "Security Status" "$BASE_URL/api/auth/security-status"
test_endpoint "Debug Config" "$BASE_URL/debug/config"

# Get CSRF token
echo -e "\n=== Getting CSRF Token ==="
CSRF_RESPONSE=$(curl -s -c cookies.txt "$BASE_URL/api/security/csrf-token")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.csrf_token')
echo "CSRF Token: $CSRF_TOKEN"

echo -e "\n${GREEN}Basic endpoints are working!${NC}"
echo "To test authenticated endpoints, you need to:"
echo "1. Login with valid credentials"
echo "2. Use the returned auth token in subsequent requests"
```

Make it executable:
```bash
chmod +x test_api.sh
./test_api.sh
```

## 📝 Expected Responses

### Successful responses should look like:
```json
// Auth config
{
  "success": true,
  "config": {
    "supabase_url": "https://...",
    "supabase_anon_key": "...",
    "google_client_id": "..."
  }
}

// Security status
{
  "success": true,
  "security_status": {
    "recaptcha_enabled": true,
    "recaptcha_site_key": "..."
  }
}

// Credits
{
  "success": true,
  "credits": 100
}
```

### Common errors:
- `404` - Endpoint not found (likely the double `/api/api/` issue)
- `401` - Unauthorized (need valid auth token)
- `405` - Method not allowed
- `422` - Missing CSRF token