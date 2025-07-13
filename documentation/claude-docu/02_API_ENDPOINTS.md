# API Endpoints Reference - AudioBook Organizer

## Authentication System (`/api/auth/*`)

### Public Endpoints (No Auth Required)
| Endpoint | Method | Purpose | Key Parameters |
|----------|---------|---------|----------------|
| `/api/auth/config` | GET | Get public auth configuration | None |
| `/api/auth/login` | POST | User login | email, password, recaptchaToken |
| `/api/auth/signup` | POST | User registration | email, password, recaptchaToken |
| `/api/auth/verify` | POST | Verify JWT token | token |
| `/api/auth/reset-password` | POST | Send password reset email | email |
| `/api/auth/google-callback` | GET/POST | Handle Google OAuth | code, state |
| `/api/auth/security-status` | GET | Get security config status | None |

### Protected Endpoints (JWT Required)
| Endpoint | Method | Purpose | Credits Required |
|----------|---------|---------|------------------|
| `/api/auth/profile` | GET | Get user profile | 0 |
| `/api/auth/profile` | PUT | Update user profile | 0 |
| `/api/auth/credits` | GET | Get credit balance | 0 |
| `/api/auth/usage-history` | GET | Get usage history | 0 |
| `/api/auth/init-user` | POST | Initialize new user | 0 |
| `/api/auth/account` | DELETE | Delete user account | 0 |

### Testing Mode Endpoints
| Endpoint | Method | Purpose | Available In |
|----------|---------|---------|--------------|
| `/api/auth/temp-login` | POST | Temporary password auth | Testing Mode Only |
| `/api/auth/temp-logout` | POST | Clear temp session | Testing Mode Only |
| `/api/auth/temp-status` | GET | Check temp auth status | Testing Mode Only |
| `/api/auth/temp-refresh` | POST | Refresh temp session | Testing Mode Only |
| `/api/auth/debug-session` | GET | Debug session info | Testing Mode Only |

## File Processing (`/api/upload/*`)

### Upload Endpoints
| Endpoint | Method | Auth | Credits | File Types |
|----------|---------|------|---------|------------|
| `/api/upload` | POST | Required* | 2 | Audio (MP3, WAV, M4A) |
| `/api/upload/txt` | POST | Required* | 1 | Text (TXT) |
| `/api/upload/docx` | POST | Required* | 5 | Document (DOCX) |
| `/api/upload/docx/validate` | POST | None | 0 | DOCX validation only |

*In testing mode: temp auth required; Normal mode: JWT auth required

### Export Endpoints
| Endpoint | Method | Auth | Credits | Options |
|----------|---------|------|---------|---------|
| `/api/export` | POST | Required* | 0-5 | format, includeAudio, chapters |

Credits: 5 for audio export, 0 for data-only export

## Project Management (`/api/projects/*`)

| Endpoint | Method | Auth | Purpose |
|----------|---------|------|---------|
| `/api/projects/save` | POST | Required | Save project to database |
| `/api/projects/latest` | GET | Required | Get user's latest project |
| `/api/projects/status` | GET | Required | Get project status info |
| `/api/projects/debug` | GET | None | Debug service configuration |

## Payment System (`/api/stripe/*`)

### Stripe Endpoints (Normal Mode Only)
| Endpoint | Method | Auth | Purpose |
|----------|---------|------|---------|
| `/api/stripe/config` | GET | None | Get Stripe public config |
| `/api/stripe/packages` | GET | Required | Get available credit packages |
| `/api/stripe/create-checkout-session` | POST | Required + CSRF | Create payment session |
| `/api/stripe/session/<id>` | GET | Required | Get session details |
| `/api/stripe/webhook` | POST | None | Handle Stripe webhooks |
| `/api/stripe/transactions` | GET | Required | Get transaction history |

## Static Pages & Assets

### Page Routes
| Route | Auth | Purpose |
|-------|------|---------|
| `/` | None | Root (redirects based on mode) |
| `/app` | Conditional* | Main application |
| `/auth` | None | Login/signup page |
| `/profile` | None | User profile page |
| `/auth/reset-password` | None | Password reset |
| `/payment/success` | None | Payment success |
| `/payment/cancelled` | None | Payment cancelled |
| `/temp-auth` | None | Testing mode auth |
| `/privacy` | None | Privacy Policy page |
| `/terms` | None | Terms of Service page |
| `/contact` | None | Contact Us page |

*Requires temp auth in testing mode

### Asset Routes
| Pattern | Purpose |
|---------|---------|
| `/css/<file>` | Serve CSS files |
| `/js/<file>` | Serve JavaScript files |
| `/pages/<path>` | Serve page components |
| `/public/<file>` | Serve public assets |
| `/uploads/<file>` | Serve uploaded files (CORS enabled) |
| `/exports/<id>/<file>` | Serve exported files |

## Security Features

### Rate Limiting
```python
# Default limits (configurable)
- Auth endpoints: 5/minute, 20/hour
- Upload endpoints: 10/minute, 50/hour
- General API: 30/minute, 200/hour
```

### CSRF Protection
Required on:
- `/api/stripe/create-checkout-session`
- All state-changing operations

Get CSRF token: `GET /api/security/csrf-token`

### Authentication Headers
```javascript
// JWT Bearer token
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

// CSRF token (when required)
X-CSRF-Token: your-csrf-token
```

## Account Deletion

### DELETE /api/auth/account
Permanently deletes user account and all associated data.

**Request Body:**
```json
{
  "password": "current_password",
  "confirmation_text": "DELETE"
}
```

**Security Features:**
- Requires current password verification
- Must type "DELETE" exactly (case-sensitive)
- Rate limited using standard auth limits
- Deletes all user data from database
- Automatically removes all uploaded audio files

**Response:**
- 200: Account deleted successfully
- 401: Invalid password
- 400: Invalid confirmation text
- 429: Rate limit exceeded

## Error Response Format

### Standard Error Response
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {} // Optional additional info
}
```

### Common Error Codes
| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid auth |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits |
| `RATE_LIMITED` | 429 | Too many requests |
| `INVALID_FILE` | 400 | File validation failed |
| `SERVER_ERROR` | 500 | Internal server error |

## Credit System

### Credit Costs
| Action | Credits | Endpoint |
|--------|---------|----------|
| Upload Audio | 2 | `/api/upload` |
| Upload Text | 1 | `/api/upload/txt` |
| Process DOCX | 5 | `/api/upload/docx` |
| Export with Audio | 5 | `/api/export` (includeAudio=true) |
| Export Data Only | 0 | `/api/export` (includeAudio=false) |

### Credit Management
- Check balance: `GET /api/auth/credits`
- Purchase credits: Via Stripe checkout
- Track usage: `GET /api/auth/usage-history`

## Testing & Development

### Test Endpoints
| Endpoint | Purpose |
|----------|---------|
| `/api/test` | Test API connectivity |
| `/debug/config` | View configuration |

### Testing Mode
Enable with: `TESTING_MODE=true`
- Bypasses Supabase auth
- Uses temporary password
- Disables credit requirements
- Enables debug endpoints

### CORS Configuration
- Allowed origins configured in `backend/config.py`
- Credentials allowed for auth endpoints
- Special handling for `/uploads/*` routes