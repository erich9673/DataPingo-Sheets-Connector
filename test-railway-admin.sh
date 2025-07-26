#!/bin/bash

# Test Railway admin page authentication
echo "🧪 Testing Railway Admin Page Authentication"
echo "============================================="

# Replace with your actual Railway URL
RAILWAY_URL="https://sheetsconnectorforslack-production.up.railway.app"

echo "🌐 Testing Railway URL: $RAILWAY_URL"
echo ""

# Test 1: Try to access admin.html without auth (should fail)
echo "Test 1: Access admin.html without authentication"
echo "Expected: 401 Unauthorized"
response=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/admin.html")
echo "Response: $response"
if [ "$response" = "401" ]; then
    echo "✅ PASS: Admin page requires authentication"
else
    echo "❌ FAIL: Admin page is not protected (got $response)"
fi
echo ""

# Test 2: Try to access admin.html with auth (should work)
echo "Test 2: Access admin.html with authentication"
echo "Expected: 200 OK"
echo "Note: This will prompt for username/password"
echo "Username: admin"
echo "Password: (your ADMIN_PASSWORD from Railway variables)"
echo ""
echo "🔗 Try this URL in your browser:"
echo "$RAILWAY_URL/admin.html"
echo ""

# Test 3: Test main app (should work without auth)
echo "Test 3: Access main app (should work without auth)"
echo "Expected: 200 OK"
response=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/")
echo "Response: $response"
if [ "$response" = "200" ]; then
    echo "✅ PASS: Main app is accessible"
else
    echo "❌ FAIL: Main app is not accessible (got $response)"
fi
echo ""

echo "📋 Summary:"
echo "1. If admin.html returns 401: ✅ Password protection is working"
echo "2. If admin.html returns 200: ❌ No password protection (need to redeploy)"
echo "3. Main app should always return 200"
echo ""
echo "🔧 If admin page isn't protected, redeploy Railway with your ADMIN_PASSWORD variable"
