#!/bin/bash

echo "🔄 Refreshing VS Code workspace..."

# Clear any VS Code workspace cache
if [ -d ".vscode" ]; then
    echo "📁 Found .vscode directory, clearing workspace state..."
    rm -rf .vscode/.browse.VC.db* 2>/dev/null || true
    rm -rf .vscode/browse.VC.db* 2>/dev/null || true
fi

# Force git to refresh its status
echo "🔄 Refreshing git status..."
git status --porcelain > /dev/null

# Touch a file to force VS Code file watcher to update
echo "👆 Triggering file watcher..."
touch .vscode-refresh-$(date +%s)
sleep 1
rm .vscode-refresh-* 2>/dev/null || true

echo "✅ Workspace refresh complete!"
echo "💡 If you still see crossed-out files in VS Code, try:"
echo "   1. Ctrl+Shift+P → 'Developer: Reload Window'"
echo "   2. Or close and reopen VS Code"
echo "   3. Or Ctrl+Shift+P → 'Git: Refresh'"
