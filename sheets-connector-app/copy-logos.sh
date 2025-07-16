#!/bin/bash
# Post-build script to copy logos to dist folder

echo "📸 Copying logos to dist folder..."

# Copy DataPingo logo
cp "/Users/erichuang/Downloads/Files/DataPingo logo_LOGO A3.jpg" "dist/datapingo-logo.jpg"
echo "✅ DataPingo logo copied"

# Copy Sheets Connector logo  
cp "/Users/erichuang/Desktop/Slack App Screenshots/Sheets Connector for Slack Logo.jpg" "dist/sheets-connector-logo.jpg"
echo "✅ Sheets Connector logo copied"

echo "🎨 All logos copied successfully!"
