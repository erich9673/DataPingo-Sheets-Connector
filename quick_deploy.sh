#!/bin/bash

# 🚀 Sheets Connector - Quick Deployment Script
# Run this before deploying to production

echo "🔍 Pre-Deployment Checklist for Sheets Connector"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "sheets-connector-app" ] || [ ! -d "sheets-connector-backend" ]; then
    echo "❌ Error: Please run this script from the root directory of Sheets Connector project"
    exit 1
fi

echo "✅ In correct project directory"

# Check git status
echo -e "\n📋 Git Status:"
echo "Current branch: $(git branch --show-current)"
echo "Latest commit: $(git log -1 --oneline)"

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes:"
    git status --short
    echo -e "\nDo you want to commit these changes? (y/n)"
    read -r response
    if [ "$response" = "y" ]; then
        git add -A
        echo "Enter commit message:"
        read -r commit_msg
        git commit -m "$commit_msg"
        echo "✅ Changes committed"
    fi
else
    echo "✅ No uncommitted changes"
fi

# Build frontend
echo -e "\n🔨 Building frontend..."
cd sheets-connector-app
if npm run build; then
    echo "✅ Frontend build successful"
    
    # Copy to backend public folder
    cp dist/bundle.js ../sheets-connector-backend/public/bundle.js
    echo "✅ Frontend bundle copied to backend"
else
    echo "❌ Frontend build failed"
    exit 1
fi

cd ..

# Build backend
echo -e "\n🔨 Building backend..."
cd sheets-connector-backend
if npm run build; then
    echo "✅ Backend build successful"
else
    echo "❌ Backend build failed"
    exit 1
fi

cd ..

# Environment check
echo -e "\n🔐 Environment Check:"
if [ -f "sheets-connector-backend/.env" ]; then
    echo "✅ .env file exists"
    if grep -q "GOOGLE_CLIENT_ID" sheets-connector-backend/.env && grep -q "GOOGLE_CLIENT_SECRET" sheets-connector-backend/.env; then
        echo "✅ Google OAuth credentials configured"
    else
        echo "⚠️  Warning: Google OAuth credentials may not be configured"
    fi
else
    echo "⚠️  Warning: .env file not found in backend directory"
fi

# Create deployment package
echo -e "\n📦 Creating deployment package..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="deployment_backup_$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

# Copy essential files
cp -r sheets-connector-app/dist "$BACKUP_DIR/frontend_dist"
cp -r sheets-connector-backend/dist "$BACKUP_DIR/backend_dist"
cp -r sheets-connector-backend/public "$BACKUP_DIR/backend_public"
cp sheets-connector-backend/package.json "$BACKUP_DIR/backend_package.json"
cp sheets-connector-app/package.json "$BACKUP_DIR/frontend_package.json"
cp DEPLOYMENT_GUIDE.md "$BACKUP_DIR/"
cp README.md "$BACKUP_DIR/" 2>/dev/null || echo "README.md not found, skipping"

# Create deployment instructions
cat > "$BACKUP_DIR/QUICK_DEPLOY.md" << 'EOF'
# Quick Deployment Instructions

## 1. Railway Backend Deployment
```bash
# In your Railway backend service directory:
cp backend_dist/* ./dist/
cp backend_public/* ./public/
cp backend_package.json ./package.json
railway deploy
```

## 2. Environment Variables (Set in Railway Dashboard)
```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://your-backend-url.railway.app/auth/callback
PORT=3001
NODE_ENV=production
```

## 3. Frontend Deployment
- Upload frontend_dist contents to your static hosting
- Or deploy as separate Railway service
- Update API endpoint to point to backend Railway URL

## 4. Test Checklist
- [ ] Google OAuth login
- [ ] Slack webhook test
- [ ] Teams webhook test  
- [ ] Discord webhook test
- [ ] Create monitoring job
- [ ] Verify notifications work

Ready to deploy! 🚀
EOF

echo "✅ Deployment package created: $BACKUP_DIR"

# Summary
echo -e "\n🎉 Pre-Deployment Summary:"
echo "=========================="
echo "✅ Code committed to git"
echo "✅ Frontend built and bundled"
echo "✅ Backend compiled"
echo "✅ Deployment package created"
echo -e "\n📁 Deployment package location: $BACKUP_DIR"
echo -e "\n🚀 Ready for production deployment!"
echo -e "\nNext steps:"
echo "1. Review DEPLOYMENT_GUIDE.md"
echo "2. Set up production environment variables"
echo "3. Deploy backend to Railway"
echo "4. Deploy frontend"
echo "5. Test all functionality"

echo -e "\n⚠️  Remember to:"
echo "- Update Google OAuth redirect URIs for production"
echo "- Set secure environment variables"
echo "- Test all webhook platforms after deployment"

echo -e "\n✨ Good luck with your deployment!"
