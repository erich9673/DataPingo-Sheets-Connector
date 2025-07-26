#!/bin/bash

# 🚂 Quick Railway Deployment Test
echo "🚂 Testing Railway Deployment..."

if [ -z "$1" ]; then
    echo "❌ Please provide your Railway app URL"
    echo "Usage: ./test-railway.sh https://your-app.railway.app"
    exit 1
fi

RAILWAY_URL="$1"
echo "🌐 Testing: $RAILWAY_URL"

# Remove trailing slash
RAILWAY_URL="${RAILWAY_URL%/}"

echo ""
echo "=== RAILWAY DEPLOYMENT TESTS ==="

# Test 1: App is online
echo "1️⃣ Testing if app is online..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ App is ONLINE (200 OK)"
else
    echo "❌ App is OFFLINE or ERROR (got $HTTP_CODE)"
fi

# Test 2: Health check
echo "2️⃣ Testing health endpoint..."
HEALTH=$(curl -s "$RAILWAY_URL/health" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ "$HEALTH" = "healthy" ]; then
    echo "✅ Health check PASSED"
else
    echo "❌ Health check FAILED (got: $HEALTH)"
fi

# Test 3: Admin protection
echo "3️⃣ Testing admin protection..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/admin.html")
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Admin protection ACTIVE (401 Unauthorized)"
else
    echo "❌ Admin protection FAILED (got $HTTP_CODE, expected 401)"
fi

# Test 4: Security headers
echo "4️⃣ Testing security headers..."
HEADERS=$(curl -s -I "$RAILWAY_URL/")
if echo "$HEADERS" | grep -q "X-Frame-Options: DENY"; then
    echo "✅ Security headers PRESENT"
else
    echo "❌ Security headers MISSING"
fi

# Test 5: API endpoint
echo "5️⃣ Testing API health..."
API_HEALTH=$(curl -s "$RAILWAY_URL/api/health")
if echo "$API_HEALTH" | grep -q "healthy\|backend"; then
    echo "✅ API endpoint WORKING"
else
    echo "❌ API endpoint FAILED"
fi

# Test 6: Railway test endpoint
echo "6️⃣ Testing Railway-specific endpoint..."
RAILWAY_TEST=$(curl -s "$RAILWAY_URL/test-railway")
if echo "$RAILWAY_TEST" | grep -q "running on Railway"; then
    echo "✅ Railway integration WORKING"
else
    echo "❌ Railway integration FAILED"
fi

echo ""
echo "=== ADMIN ACCESS TEST ==="
echo "🔑 To test admin access manually:"
echo "   1. Visit: $RAILWAY_URL/admin.html"
echo "   2. Username: admin"
echo "   3. Password: [your ADMIN_PASSWORD from Railway env vars]"
echo ""

echo "=== GOOGLE OAUTH TEST ==="
echo "🔐 To test Google OAuth:"
echo "   1. Visit: $RAILWAY_URL"
echo "   2. Click 'Connect to Google Sheets'"
echo "   3. Complete OAuth flow"
echo "   4. Should return successfully"
echo ""

echo "=== SLACK INTEGRATION TEST ==="
echo "💬 To test Slack integration:"
echo "   1. Access admin panel with credentials"
echo "   2. Set up monitoring job with Slack webhook"
echo "   3. Test notification delivery"
echo ""

echo "🎉 Railway deployment tests completed!"
echo ""
echo "📝 Next steps if tests passed:"
echo "   ✅ Update Google OAuth redirect URI to: $RAILWAY_URL/api/auth/google/callback"
echo "   ✅ Test full Slack integration workflow"
echo "   ✅ Monitor Railway logs for any issues"
echo "   ✅ Ready for production use!"
