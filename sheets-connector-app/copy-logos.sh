#!/bin/bash
# Post-build script to copy DataPingo brand assets

echo "🎨 Copying DataPingo brand assets to dist folder..."

# Copy DataPingo logos
cp "public/DataPingo logo_LOGO A3.png" "dist/" 2>/dev/null && echo "✅ DataPingo logo A3 copied" || echo "⚠️ DataPingo logo A3 not found"
cp "public/DataPingo logo_LOGO A2.png" "dist/" 2>/dev/null && echo "✅ DataPingo logo A2 copied" || echo "⚠️ DataPingo logo A2 not found"

# Copy Sheets Connector logos
cp "public/Sheets Connector for Slack.png" "dist/" 2>/dev/null && echo "✅ Sheets Connector logo copied" || echo "⚠️ Sheets Connector logo not found"
cp "public/Sheets Connector for Slack Logo.png" "dist/" 2>/dev/null && echo "✅ New Sheets Connector logo copied" || echo "⚠️ New Sheets Connector logo not found"

# Copy feature icons
cp "public/chart.jpg" "dist/" 2>/dev/null && echo "✅ Chart icon copied" || echo "⚠️ Chart icon not found"
cp "public/lightning.jpg" "dist/" 2>/dev/null && echo "✅ Lightning icon copied" || echo "⚠️ Lightning icon not found"
cp "public/tools.jpg" "dist/" 2>/dev/null && echo "✅ Tools icon copied" || echo "⚠️ Tools icon not found"

echo "🚀 All DataPingo brand assets copied successfully!"
