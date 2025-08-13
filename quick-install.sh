#!/bin/bash

# Super quick install script - no testing, just build and copy
# Usage: ./quick-install.sh

set -e

echo "⚡ Quick Install: Backlog.md with Sprint Filter"
echo "=============================================="

# Build
echo "🔨 Building..."
bun run build

# Check build
if [ ! -f "dist/backlog" ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful!"

# Find install location
INSTALL_PATH=""
if command -v backlog >/dev/null 2>&1; then
    INSTALL_PATH=$(which backlog)
elif [ -d "/opt/homebrew/bin" ]; then
    INSTALL_PATH="/opt/homebrew/bin/backlog"
elif [ -d "/usr/local/bin" ]; then
    INSTALL_PATH="/usr/local/bin/backlog"
else
    echo "❌ Could not find installation location"
    echo "💡 Please install backlog-md first: brew install backlog-md"
    exit 1
fi

echo "📍 Installing to: $INSTALL_PATH"

# Install
if [ -w "$(dirname "$INSTALL_PATH")" ]; then
    cp dist/backlog "$INSTALL_PATH"
    chmod +x "$INSTALL_PATH"
    echo "✅ Installed successfully!"
else
    sudo cp dist/backlog "$INSTALL_PATH"
    sudo chmod +x "$INSTALL_PATH"
    echo "✅ Installed successfully (with sudo)!"
fi

echo ""
echo "🎉 Installation Complete!"
echo "========================="
echo ""
echo "💡 New Sprint Filter Features:"
echo "   • Filter Kanban Board by sprint_source"
echo "   • Available in both Web UI and CLI"
echo "   • Export filtered boards to markdown"
echo ""
echo "🚀 Quick Start:"
echo "   backlog board --sprint 'YourSprintName'        # View filtered board"
echo "   backlog board export --sprint 'YourSprintName' # Export filtered board"
echo "   backlog browser                                # Web UI with dropdown filter"
echo ""
echo "📚 Full help: backlog --help"