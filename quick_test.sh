#!/bin/bash

echo "Quick API Endpoint Test"
echo "======================"

# Test the basic endpoints that should work without auth
echo -e "\n1. Testing /api/auth/config..."
curl -s http://localhost:3000/api/auth/config | jq '.' 2>/dev/null || echo "Failed - is the server running?"

echo -e "\n2. Testing /api/auth/security-status..."
curl -s http://localhost:3000/api/auth/security-status | jq '.' 2>/dev/null || echo "Failed"

echo -e "\n3. Testing /debug/config..."
curl -s http://localhost:3000/debug/config | jq '.' 2>/dev/null || echo "Failed"

echo -e "\n4. Testing /api/security/csrf-token..."
curl -s http://localhost:3000/api/security/csrf-token | jq '.' 2>/dev/null || echo "Failed"

echo -e "\nIf all tests show 'Failed - is the server running?', start the app with:"
echo "cd backend && python app.py"