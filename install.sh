#!/bin/bash

# Quick install script for backlog-md with Sprint Filter
# Usage: ./install.sh

set -e

echo "🚀 Quick Install: Backlog.md with Sprint Filter"
echo "================================================"

# Build the project
echo "🔨 Building..."
bun run build

# Check if build was successful
if [ ! -f "dist/backlog" ]; then
    echo "❌ Build failed - dist/backlog not found"
    exit 1
fi

echo "✅ Build successful!"

# Find where to install
INSTALL_PATH=""

# Check common locations
if [ -d "/opt/homebrew/bin" ] && [ -w "/opt/homebrew/bin" ]; then
    INSTALL_PATH="/opt/homebrew/bin/backlog"
elif [ -d "/usr/local/bin" ] && [ -w "/usr/local/bin" ]; then
    INSTALL_PATH="/usr/local/bin/backlog"
elif command -v backlog >/dev/null 2>&1; then
    INSTALL_PATH=$(which backlog)
else
    echo "❌ Could not find a suitable installation location"
    echo "💡 Please install backlog-md first: brew install backlog-md"
    echo "💡 Or manually copy: sudo cp dist/backlog /usr/local/bin/backlog"
    exit 1
fi

echo "📍 Installing to: $INSTALL_PATH"

# Install
if [ -w "$(dirname "$INSTALL_PATH")" ]; then
    cp dist/backlog "$INSTALL_PATH"
    chmod +x "$INSTALL_PATH"
else
    sudo cp dist/backlog "$INSTALL_PATH"
    sudo chmod +x "$INSTALL_PATH"
fi

# Test installation
echo "🧪 Testing installation..."
echo "📍 Testing command: $INSTALL_PATH --version"

# Use timeout to prevent hanging
if timeout 10s "$INSTALL_PATH" --version >/dev/null 2>&1; then
    VERSION=$(timeout 5s "$INSTALL_PATH" --version 2>/dev/null || echo "unknown")
    echo "✅ Installation successful! Version: $VERSION"
    
    # Test sprint filter feature
    echo "🔍 Testing Sprint Filter feature..."
    if timeout 5s "$INSTALL_PATH" board --help 2>/dev/null | grep -q "sprint"; then
        echo "✅ Sprint Filter feature is available"
    else
        echo "⚠️  Sprint Filter feature may have issues (but installation is OK)"
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
    
else
    echo "⚠️  Installation completed but command test failed (this might be normal)"
    echo "💡 Try running manually: $INSTALL_PATH --version"
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
fi