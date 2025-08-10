#!/bin/bash

# Script to build and deploy backlog-md to global installation
# Usage: ./deploy-global.sh

set -e  # Exit on any error

echo "🔨 Building backlog-md..."
npm run build

if [ ! -f "dist/backlog" ]; then
    echo "❌ Build failed - dist/backlog not found"
    exit 1
fi

echo "📍 Finding global backlog installation..."
BACKLOG_PATH=$(which backlog 2>/dev/null || echo "")

if [ -z "$BACKLOG_PATH" ]; then
    echo "❌ Global backlog installation not found"
    echo "💡 Please install backlog-md first: brew install backlog-md"
    exit 1
fi

echo "📂 Found backlog at: $BACKLOG_PATH"

echo "🚀 Deploying to global installation..."
sudo cp dist/backlog "$BACKLOG_PATH"
sudo chmod +x "$BACKLOG_PATH"

echo "✅ Successfully deployed!"
echo "🧪 Testing installation..."

# Test the installation
if backlog --version >/dev/null 2>&1; then
    VERSION=$(backlog --version)
    echo "✅ Global backlog is working - Version: $VERSION"
    echo ""
    echo "🎉 Deployment complete! Your custom backlog-md with File Explorer is now available globally."
    echo "💡 You can now run 'backlog browser' from any directory to use the updated version."
else
    echo "❌ Something went wrong - global backlog is not working"
    exit 1
fi