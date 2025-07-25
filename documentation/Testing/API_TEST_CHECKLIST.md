# API Endpoint Test Checklist

## ✅ Already Working (as you mentioned)
- [x] **Login** - `/api/auth/login`
- [x] **User initialization** - `/api/auth/init-user` 
- [x] **Credits display** - `/api/auth/credits`
- [x] **Project loading** - `/api/projects/latest`

## 🧪 Additional Tests to Verify

### Authentication & Profile
1. [ ] **Logout** - Click logout button
2. [ ] **Profile Modal** - Click on user dropdown → Profile
   - Should load user profile data
   - Should show usage history
   - Should display current credits
3. [ ] **Google Sign In** - Try Google OAuth (if configured in Supabase)

### File Operations
4. [ ] **Upload a file** - Try uploading a .txt or .docx file
   - Endpoints: `/api/upload/txt`, `/api/upload/docx`
5. [ ] **Export** - After uploading, try exporting
   - Endpoint: `/api/export`

### Project Management
6. [ ] **Auto-save** - Make changes to a document
   - Should auto-save every 30 seconds
   - Endpoint: `/api/projects/save`

### Payment System (if Stripe is configured)
7. [ ] **View packages** - Click "Buy Credits" or credits display
   - Endpoint: `/api/stripe/packages`
8. [ ] **Purchase credits** - Try buying a package
   - Endpoint: `/api/stripe/create-checkout-session`

### Security
9. [ ] **CSRF Token** - Should be fetched automatically
   - Endpoint: `/api/security/csrf-token`
10. [ ] **reCAPTCHA** - Should work on login/signup
    - Endpoint: `/api/auth/security-status`

## 🚀 Production Deployment

The same fixes will work in production because:

1. **API Base URL Logic**: Both environments use `/api` prefix
   ```javascript
   // Local: returns '/api'
   // Production: returns '/api'
   ```

2. **All endpoints are consistent**: 
   - Frontend calls: `/auth/login`
   - `apiFetch` adds: `/api` → `/api/auth/login`
   - Backend expects: `/api/auth/login` ✅

3. **Domain redirect middleware**: Already in place for www redirect

## 📝 Quick Local Test Commands

```bash
# Test auth endpoints
curl http://localhost:3000/api/auth/config
curl http://localhost:3000/api/auth/security-status

# Test debug endpoint
curl http://localhost:3000/debug/config
```

## ⚠️ Before Deploying to Production

1. **Commit all changes**:
   ```bash
   git add -A
   git commit -m "Fix API endpoint routing - remove double /api prefix"
   git push origin main
   ```

2. **DigitalOcean will auto-deploy** from main branch

3. **Test immediately** after deployment using the checklist above

The API routing should work identically in production now!