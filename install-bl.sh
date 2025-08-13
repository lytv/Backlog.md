#!/bin/bash

# Fixed install script that handles homebrew symlinks properly
# Usage: ./install-fixed.sh

set -e

echo "🚀 Fixed Install: Backlog.md with Sprint Filter"
echo "==============================================="

# Build
echo "🔨 Building..."
bun run build

if [ ! -f "dist/backlog" ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful!"

# Check if backlog exists and is homebrew installation
if command -v backlog >/dev/null 2>&1; then
    BACKLOG_PATH=$(which backlog)
    echo "📍 Found existing backlog at: $BACKLOG_PATH"
    
    # Check if it's a homebrew symlink
    if [[ "$BACKLOG_PATH" == *"/homebrew/"* ]] && [ -L "$BACKLOG_PATH" ]; then
        echo "🍺 Detected Homebrew installation (symlink)"
        echo "💡 Installing as 'bl' to avoid conflicts"
        
        # Install as bl
        INSTALL_PATH="/usr/local/bin/bl"
        sudo cp dist/backlog "$INSTALL_PATH"
        sudo chmod +x "$INSTALL_PATH"
        
        echo "✅ Installed as 'bl'"
        echo ""
        echo "🎉 Installation Complete!"
        echo "========================="
        echo ""
        echo "💡 Usage: Use 'bl' command (short for backlog)"
        echo ""
        echo "🚀 Quick Start:"
        echo "   bl board --sprint 'YourSprintName'"
        echo "   bl board export --sprint 'YourSprintName' file.md"
        echo "   bl browser --port 3000"
        echo ""
        echo "📚 Full help: bl --help"
        
    else
        echo "📦 Regular installation detected"
        echo "⚠️  Replacing existing installation..."
        
        if [ -w "$(dirname "$BACKLOG_PATH")" ]; then
            cp dist/backlog "$BACKLOG_PATH"
            chmod +x "$BACKLOG_PATH"
        else
            sudo cp dist/backlog "$BACKLOG_PATH"
            sudo chmod +x "$BACKLOG_PATH"
        fi
        
        echo "✅ Replaced existing installation"
        echo ""
        echo "🎉 Installation Complete!"
        echo "========================="
        echo ""
        echo "🚀 Quick Start:"
        echo "   bl board --sprint 'YourSprintName'"
        echo "   bl board export --sprint 'YourSprintName' file.md"
        echo "   bl browser --port 3000"
    fi
else
    echo "❌ No existing backlog installation found"
    echo "💡 Installing as 'bl'"
    
    INSTALL_PATH="/usr/local/bin/bl"
    sudo cp dist/backlog "$INSTALL_PATH"
    sudo chmod +x "$INSTALL_PATH"
    
    echo "✅ Installed as 'bl'"
    echo ""
    echo "🎉 Installation Complete!"
    echo "========================="
    echo ""
    echo "💡 Usage: Use 'bl' command (short for backlog)"
    echo ""
    echo "🚀 Quick Start:"
    echo "   bl board --sprint 'YourSprintName'"
    echo "   bl board export --sprint 'YourSprintName' file.md"
    echo "   bl browser --port 3000"
fi

echo ""
echo "💡 New Sprint Filter Features:"
echo "   • Filter Kanban Board by sprint_source"
echo "   • Available in both Web UI and CLI"
echo "   • Export filtered boards to markdown"