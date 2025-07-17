#!/bin/bash

# 🛡️ DataPingo Sheets Connector - Emergency Recovery Script
# Use this script to quickly revert to the perfect working state

echo "🚨 DataPingo Emergency Recovery Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Perfect state information
PERFECT_COMMIT="ccd5769"
PERFECT_TAG="v1.0-perfect-alignment"
REPO_PATH="/Users/erichuang/Desktop/DataPingo Sheets Connector"

echo -e "${BLUE}Perfect State:${NC}"
echo -e "  Commit: ${GREEN}$PERFECT_COMMIT${NC}"
echo -e "  Tag: ${GREEN}$PERFECT_TAG${NC}"
echo -e "  Date: ${GREEN}July 17, 2025${NC}"
echo ""

# Change to repo directory
cd "$REPO_PATH" || {
    echo -e "${RED}❌ Error: Could not find repository at $REPO_PATH${NC}"
    exit 1
}

echo -e "${BLUE}Current Status:${NC}"
git log --oneline -3
echo ""

# Ask user what they want to do
echo -e "${YELLOW}🤔 What would you like to do?${NC}"
echo "1) 🔄 Reset to perfect state (SAFE - keeps backup)"
echo "2) 🚨 Hard reset to perfect state (DESTRUCTIVE - loses changes)"
echo "3) 📊 Show differences from perfect state"
echo "4) 🌟 Create new branch from perfect state"
echo "5) 🏗️ Rebuild and redeploy current state"
echo "6) ❌ Cancel"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo -e "${BLUE}🔄 Creating backup and resetting to perfect state...${NC}"
        
        # Create backup branch
        BACKUP_BRANCH="backup-$(date +%Y%m%d-%H%M%S)"
        git branch "$BACKUP_BRANCH"
        echo -e "${GREEN}✅ Created backup branch: $BACKUP_BRANCH${NC}"
        
        # Reset to perfect state
        git reset --hard "$PERFECT_TAG"
        echo -e "${GREEN}✅ Reset to perfect state${NC}"
        
        # Rebuild
        echo -e "${BLUE}🏗️ Rebuilding application...${NC}"
        npm run build
        
        echo -e "${GREEN}✅ Recovery complete!${NC}"
        echo -e "${YELLOW}💡 Your changes are saved in branch: $BACKUP_BRANCH${NC}"
        ;;
        
    2)
        echo -e "${RED}⚠️  WARNING: This will permanently delete uncommitted changes!${NC}"
        read -p "Are you sure? Type 'YES' to continue: " confirm
        
        if [ "$confirm" = "YES" ]; then
            echo -e "${BLUE}🚨 Hard reset to perfect state...${NC}"
            git reset --hard "$PERFECT_TAG"
            git clean -fd
            npm run build
            echo -e "${GREEN}✅ Hard reset complete!${NC}"
        else
            echo -e "${YELLOW}❌ Cancelled${NC}"
        fi
        ;;
        
    3)
        echo -e "${BLUE}📊 Differences from perfect state:${NC}"
        echo ""
        git diff "$PERFECT_TAG"
        echo ""
        echo -e "${BLUE}Commits since perfect state:${NC}"
        git log "$PERFECT_TAG"..HEAD --oneline
        ;;
        
    4)
        read -p "Enter new branch name: " branch_name
        if [ -n "$branch_name" ]; then
            echo -e "${BLUE}🌟 Creating new branch '$branch_name' from perfect state...${NC}"
            git checkout -b "$branch_name" "$PERFECT_TAG"
            echo -e "${GREEN}✅ Created and switched to branch: $branch_name${NC}"
        else
            echo -e "${RED}❌ No branch name provided${NC}"
        fi
        ;;
        
    5)
        echo -e "${BLUE}🏗️ Rebuilding and redeploying current state...${NC}"
        npm run build
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Build successful${NC}"
            
            read -p "Commit and push changes? (y/n): " push_confirm
            if [ "$push_confirm" = "y" ] || [ "$push_confirm" = "Y" ]; then
                git add .
                git commit -m "🔄 Recovery rebuild - $(date)"
                git push origin main
                echo -e "${GREEN}✅ Deployed to Railway${NC}"
            fi
        else
            echo -e "${RED}❌ Build failed${NC}"
        fi
        ;;
        
    6)
        echo -e "${YELLOW}❌ Recovery cancelled${NC}"
        ;;
        
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        ;;
esac

echo ""
echo -e "${BLUE}🔗 Useful links:${NC}"
echo -e "  GitHub: ${GREEN}https://github.com/erich9673/DataPingo-Sheets-Connector${NC}"
echo -e "  Railway: ${GREEN}https://datapingo-sheets-connector-production.up.railway.app${NC}"
echo -e "  Recovery Guide: ${GREEN}./RECOVERY_GUIDE.md${NC}"
echo ""
echo -e "${GREEN}🎉 DataPingo Recovery Script Complete!${NC}"
