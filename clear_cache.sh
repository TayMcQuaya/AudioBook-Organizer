#!/bin/bash

echo "Clearing potential caches..."

# Clear Python cache
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete 2>/dev/null

# Touch CSS files to update timestamps
touch frontend/css/*.css

# If using any Flask caching extensions
rm -rf .cache 2>/dev/null
rm -rf instance/cache 2>/dev/null

echo "Cache cleared. Please restart your Flask app with:"
echo "python app.py"
echo ""
echo "Then try these steps:"
echo "1. Open your browser in incognito/private mode"
echo "2. Go to your IP:3000"
echo "3. Open DevTools (F12) → Network tab → Check 'Disable cache'"
echo "4. Hard refresh with Ctrl+Shift+R (or Cmd+Shift+R on Mac)"