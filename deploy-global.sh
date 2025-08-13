#!/bin/bash

# Script to build and deploy backlog-md to global installation
# Usage: ./deploy-global.sh

set -e  # Exit on any error

echo "🔨 Building backlog-md..."
bun run build

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
    echo "🎉 Deployment complete! Your custom backlog-md with Sprint Filter is now available globally."
    echo "💡 New features added:"
    echo "   • Sprint Filter in Kanban Board (Web UI & CLI)"
    echo "   • Filter tasks by sprint_source"
    echo "   • Export boards with sprint filtering"
    echo ""
    echo "🚀 Usage examples:"
    echo "   backlog board --sprint 'S01_M02_Database_Core_Models'"
    echo "   backlog board export --sprint 'S01_M02_Database_Core_Models' sprint-board.md"
    echo "   backlog browser  # Web UI with sprint dropdown filter"
else
    echo "❌ Something went wrong - global backlog is not working"
    exit 1
fi