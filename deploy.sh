#!/bin/bash

# Advanced deployment script for backlog-md
# Usage: ./deploy.sh [options]
# Options:
#   --global, -g    Deploy to global installation (default)
#   --local, -l     Deploy to local ./dist only
#   --test, -t      Run tests after deployment
#   --force, -f     Force deployment without confirmation
#   --help, -h      Show this help

set -e

# Default options
DEPLOY_GLOBAL=true
DEPLOY_LOCAL=false
RUN_TESTS=false
FORCE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --global|-g)
            DEPLOY_GLOBAL=true
            DEPLOY_LOCAL=false
            shift
            ;;
        --local|-l)
            DEPLOY_LOCAL=true
            DEPLOY_GLOBAL=false
            shift
            ;;
        --test|-t)
            RUN_TESTS=true
            shift
            ;;
        --force|-f)
            FORCE=true
            shift
            ;;
        --help|-h)
            echo "Advanced deployment script for backlog-md"
            echo ""
            echo "Usage: ./deploy.sh [options]"
            echo ""
            echo "Options:"
            echo "  --global, -g    Deploy to global installation (default)"
            echo "  --local, -l     Deploy to local ./dist only"
            echo "  --test, -t      Run tests after deployment"
            echo "  --force, -f     Force deployment without confirmation"
            echo "  --help, -h      Show this help"
            echo ""
            echo "Examples:"
            echo "  ./deploy.sh                 # Build and deploy globally"
            echo "  ./deploy.sh --local         # Build locally only"
            echo "  ./deploy.sh --global --test # Deploy globally and run tests"
            echo "  ./deploy.sh --force         # Deploy without confirmation"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "🔨 Building backlog-md..."
npm run build

if [ ! -f "dist/backlog" ]; then
    echo "❌ Build failed - dist/backlog not found"
    exit 1
fi

echo "✅ Build successful!"

if [ "$DEPLOY_LOCAL" = true ]; then
    echo "📦 Local build completed at ./dist/backlog"
    echo "💡 You can run: ./dist/backlog --version"
    exit 0
fi

if [ "$DEPLOY_GLOBAL" = true ]; then
    echo "📍 Finding global backlog installation..."
    BACKLOG_PATH=$(which backlog 2>/dev/null || echo "")

    if [ -z "$BACKLOG_PATH" ]; then
        echo "❌ Global backlog installation not found"
        echo "💡 Please install backlog-md first: brew install backlog-md"
        exit 1
    fi

    echo "📂 Found backlog at: $BACKLOG_PATH"

    # Confirmation prompt (unless --force is used)
    if [ "$FORCE" = false ]; then
        echo ""
        echo "⚠️  This will replace your global backlog installation with the custom version."
        echo "📍 Target: $BACKLOG_PATH"
        echo ""
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ Deployment cancelled"
            exit 1
        fi
    fi

    echo "🚀 Deploying to global installation..."
    sudo cp dist/backlog "$BACKLOG_PATH"
    sudo chmod +x "$BACKLOG_PATH"

    echo "✅ Successfully deployed!"
fi

# Test the installation
if [ "$DEPLOY_GLOBAL" = true ] || [ "$RUN_TESTS" = true ]; then
    echo "🧪 Testing installation..."
    
    if backlog --version >/dev/null 2>&1; then
        VERSION=$(backlog --version)
        echo "✅ Global backlog is working - Version: $VERSION"
        
        # Test File Explorer feature
        echo "🔍 Testing File Explorer feature..."
        if backlog browser --help | grep -q "browser interface"; then
            echo "✅ Browser interface command is available"
        else
            echo "⚠️  Browser interface command may have issues"
        fi
        
        echo ""
        echo "🎉 Deployment complete! Your custom backlog-md with File Explorer is now available globally."
        echo "💡 Features added:"
        echo "   • File Explorer in sidebar"
        echo "   • Tree view of project structure"
        echo "   • Expand/collapse directories"
        echo ""
        echo "🚀 You can now run 'backlog browser' from any directory to use the updated version."
    else
        echo "❌ Something went wrong - global backlog is not working"
        exit 1
    fi
fi