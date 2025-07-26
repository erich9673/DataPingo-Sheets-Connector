#!/bin/bash

# 🧪 DataPingo Security Test Script
echo "🧪 Testing DataPingo Sheets Connector Security..."

# Set test port
PORT=3001
BASE_URL="http://localhost:$PORT"
ADMIN_PASSWORD="datapingo-admin-2024-secure"

echo "📍 Testing on: $BASE_URL"
echo "🔑 Admin password: $ADMIN_PASSWORD"
echo ""

# Start server in background
echo "🚀 Starting secure server on port $PORT..."
PORT=$PORT node railway-server.js &
SERVER_PID=$!
echo "📍 Server PID: $SERVER_PID"

# Wait for server to start
sleep 3

echo ""
echo "=== SECURITY TESTS ==="

# Test 1: Health check (should work)
echo "1️⃣ Testing health endpoint..."
curl -s "$BASE_URL/health" | grep -q "healthy" && echo "✅ Health check PASSED" || echo "❌ Health check FAILED"

# Test 2: Main page (should work)
echo "2️⃣ Testing main page..."
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" | grep -q "200" && echo "✅ Main page PASSED" || echo "❌ Main page FAILED"

# Test 3: Admin page without auth (should fail with 401)
echo "3️⃣ Testing admin page without auth (should be blocked)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin.html")
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Admin protection PASSED (401 Unauthorized)"
else
    echo "❌ Admin protection FAILED (got $HTTP_CODE, expected 401)"
fi

# Test 4: Admin page with wrong auth (should fail with 401)
echo "4️⃣ Testing admin page with wrong password..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -u "admin:wrongpassword" "$BASE_URL/admin.html")
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Wrong password PASSED (401 Unauthorized)"
else
    echo "❌ Wrong password FAILED (got $HTTP_CODE, expected 401)"
fi

# Test 5: Admin page with correct auth (should work)
echo "5️⃣ Testing admin page with correct password..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -u "admin:$ADMIN_PASSWORD" "$BASE_URL/admin.html")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Correct password PASSED (200 OK)"
else
    echo "❌ Correct password FAILED (got $HTTP_CODE, expected 200)"
fi

# Test 6: Check security headers
echo "6️⃣ Testing security headers..."
HEADERS=$(curl -s -I "$BASE_URL/")
echo "$HEADERS" | grep -q "X-Frame-Options: DENY" && echo "✅ X-Frame-Options header PASSED" || echo "❌ X-Frame-Options header MISSING"
echo "$HEADERS" | grep -q "X-Content-Type-Options: nosniff" && echo "✅ X-Content-Type-Options header PASSED" || echo "❌ X-Content-Type-Options header MISSING"

# Test 7: Test other protected files
echo "7️⃣ Testing other protected files..."
for file in "oauth-debug.html" "frontend-debug.html" "manual-entry.html"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/$file")
    if [ "$HTTP_CODE" = "401" ]; then
        echo "✅ $file protection PASSED"
    else
        echo "❌ $file protection FAILED (got $HTTP_CODE)"
    fi
done

echo ""
echo "=== API TESTS ==="

# Test 8: API health check
echo "8️⃣ Testing API health..."
curl -s "$BASE_URL/api/health" | grep -q "healthy\|backend" && echo "✅ API health PASSED" || echo "❌ API health FAILED"

echo ""
echo "=== CLEANUP ==="
echo "🛑 Stopping test server..."
kill $SERVER_PID 2>/dev/null
sleep 2

echo ""
echo "🎉 Security tests completed!"
echo ""
echo "📝 Next steps:"
echo "   1. If all tests passed, deploy to Railway"
echo "   2. Set environment variables in Railway dashboard"
echo "   3. Test live deployment with same commands"
echo ""
echo "🚀 Ready for Railway deployment!"
