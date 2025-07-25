# Logger Filtering System

## Overview
The logger (`/frontend/js/utils/logger.js`) filters verbose logs in development and sanitizes sensitive data in production.

## How It Works

### Initialization
```javascript
import { enableSecureLogging } from '/js/utils/logger.js';
enableSecureLogging();  // Call early in app initialization
```

### Filtering Behavior
1. **Development Mode**: Filters verbose logs but shows important ones
2. **Production Mode**: Filters verbose logs AND sanitizes sensitive data (emails, tokens, etc.)

### Filtered Patterns
The logger filters logs that match these patterns:
- Emoji prefixes: 🚀, ✅, 🔧, 🌐, 📋, 🎨, etc.
- Keywords: `initialized`, `initializing`, `auth state`, `router init`, etc.
- Specific messages: `Step X:`, `loaded successfully`, `module loaded`, etc.

### Visible Logs
These are always shown:
- `console.error()` messages (unless they match filter patterns)
- API requests/responses (after removing from filter list)
- Critical errors and warnings
- Custom application logs without filtered patterns

## Common Issues

### All Logs Hidden
- **Cause**: Logger initialized too early before async init completes
- **Fix**: Ensure logger is imported and `enableSecureLogging()` is called after imports

### Logs Showing When They Shouldn't
- **Cause**: Log pattern not in filter list or using `console.error()`
- **Fix**: Add pattern to `verbosePatterns` array in logger.js

### Debugging When Logs Are Hidden
- Use `console.error()` for temporary debug messages
- Or temporarily comment out `enableSecureLogging()` call

## Key Files
- `/frontend/js/utils/logger.js` - Main logger implementation
- `/frontend/pages/app/app.html` - Calls `enableSecureLogging()` at start
- `/frontend/pages/auth/main.js` - Auth pages also use the logger

## Production Sanitization
In production, the logger also removes:
- Supabase URLs
- JWT tokens
- Email addresses
- File paths
- IP addresses
- API keys