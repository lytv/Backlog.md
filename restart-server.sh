#!/bin/bash

# Script to restart the Backlog.md server
# Usage: ./restart-server.sh

echo "🔄 Restarting Backlog.md Server..."

# Step 1: Kill any existing server processes
echo "⏹️  Stopping existing server processes..."
pkill -f "bun run cli browser" || true
pkill -f "bun.*browser" || true
pkill -f "backlog.*browser" || true

# Wait a moment for processes to clean up
sleep 2

# Step 2: Build the application
echo "🔨 Building application..."
bun run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Exiting..."
    exit 1
fi

echo "✅ Build completed successfully!"

# Step 3: Start the server
echo "🚀 Starting server..."
bun run cli browser

# Note: This will run in foreground. Press Ctrl+C to stop the server.