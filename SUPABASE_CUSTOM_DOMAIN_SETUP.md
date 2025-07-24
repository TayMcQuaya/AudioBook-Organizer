# Supabase Custom Domain Setup Guide

This guide covers setting up a custom domain for Supabase Auth to remove the random string from OAuth screens.

## Overview

When users sign in with Google, they see `your-random-string.supabase.co` in the OAuth consent screen. With a custom domain, they'll see your branded domain instead (e.g., `auth.yourdomain.com`).

## Cost

- **Add-on feature** for paid plans (Pro, Team, Enterprise)
- Charged **hourly** based on usage
- Not included free with Pro plan - it's an additional cost
- Charged for exact hours used (partial hours billed as full hours)

## Prerequisites

- Supabase project on a paid plan (Pro or higher)
- Owner or Admin permissions on the project
- A domain you control
- Must use a subdomain (e.g., `auth.yourdomain.com`, not `yourdomain.com`)
- Supabase CLI v1.11.3 or higher

## Setup Steps

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Add DNS Record

In your domain's DNS settings:
- Type: `CNAME`
- Name: `auth` (or your chosen subdomain)
- Value: `your-project-ref.supabase.co`
- TTL: 3600 (or your preference)

### 4. Create Custom Domain

```bash
supabase domains create --project-ref your-project-ref --custom-hostname auth.yourdomain.com
```

Wait for DNS propagation (5-30 minutes typically).

### 5. Update OAuth Providers

**Critical**: Do this BEFORE activating the domain to avoid downtime.

#### Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to your OAuth 2.0 Client
3. Add to Authorized redirect URIs:
   - `https://auth.yourdomain.com/auth/v1/callback`
4. Keep the old URL during transition:
   - `https://your-project-ref.supabase.co/auth/v1/callback`

### 6. Verify Domain

```bash
supabase domains verify --project-ref your-project-ref
```

### 7. Activate Domain

```bash
supabase domains activate --project-ref your-project-ref
```

SSL certificate via Let's Encrypt is automatic (can take up to 30 minutes).

## Update Your Application

### Frontend Code Update

```javascript
// Old:
const supabase = createClient(
  'https://your-project-ref.supabase.co',
  'your-anon-key'
)

// New:
const supabase = createClient(
  'https://auth.yourdomain.com',
  'your-anon-key'
)
```

### Environment Variables

Update your `.env`:
```bash
# Old:
SUPABASE_URL=https://your-project-ref.supabase.co

# New:
SUPABASE_URL=https://auth.yourdomain.com
```

## Deployment Required?

**Yes**, you need to redeploy after updating:
1. Update frontend code with new domain
2. Update environment variables
3. Deploy to production
4. Test authentication flows

## Important Notes

1. **Both domains remain active** - Old `supabase.co` URL continues to work
2. **OAuth screens update immediately** - Users will see custom domain right away
3. **SAML warning** - If using SAML SSO, identity providers need to be updated
4. **Plan downtime window** - Schedule updates during low-traffic period
5. **Keep both callback URLs** - In OAuth providers during transition period

## Rollback

If needed, you can deactivate the custom domain:
```bash
supabase domains delete --project-ref your-project-ref
```

## Monitoring

Check domain status:
```bash
supabase domains get --project-ref your-project-ref
```

## Benefits

- Professional appearance in OAuth consent screens
- Branded experience for users
- Better for enterprise clients
- Improved trust with custom domain

## Timeline

1. DNS propagation: 5-30 minutes
2. SSL certificate: Up to 30 minutes
3. Total setup time: ~1 hour
4. Recommended: Plan 2-hour maintenance window