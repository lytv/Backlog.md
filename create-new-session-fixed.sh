#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="/Users/mac/tools/Claude-Code-Remote"
echo "📁 Script directory: $SCRIPT_DIR"

# Ensure data directory exists
mkdir -p "$SCRIPT_DIR/src/data"

echo "🚀 Tạo phiên làm việc Claude Code Remote mới..."
echo "================================================"
echo "⚙️  Cấu hình: Dangerously Skip Permissions (tự động approve tools)"

# Kill existing sessions
echo "🧹 Dọn dẹp sessions cũ..."
tmux kill-session -t claude-session 2>/dev/null || true
pkill -f "claude-code" 2>/dev/null || true

# Wait a moment
sleep 2

# Create new tmux session
echo "📱 Tạo tmux session mới 'claude-session'..."
tmux new-session -d -s claude-session

# Wait for session to be ready
sleep 1

# Start Claude Code with bypassing permissions in the session
echo "🤖 Khởi động Claude Code với Bypassing Permissions trong tmux session..."
tmux send-keys -t claude-session 'claude --dangerously-skip-permissions' Enter

# Wait for Claude to start
echo "⏳ Đợi Claude Code khởi động (10 giây)..."
sleep 10

# Check if Claude is running
if ps aux | grep -q "[c]laude"; then
    echo "✅ Claude Code đã khởi động thành công!"
else
    echo "❌ Claude Code chưa khởi động. Thử lại với bypass permissions..."
    tmux send-keys -t claude-session 'claude --dangerously-skip-permissions' Enter
    sleep 5
fi

# Generate new token
echo "🔑 Tạo token mới..."
cd "$SCRIPT_DIR"
node claude-hook-notify.js completed

# Get the new token
echo ""
echo "📋 Thông tin session mới:"
node -e "
const fs = require('fs');
const path = require('path');
const sessionFile = path.join('$SCRIPT_DIR', 'src/data/session-map.json');

// Create empty session file if it doesn't exist
if (!fs.existsSync(sessionFile)) {
    fs.writeFileSync(sessionFile, '{}');
    console.log('⚠️  No sessions found yet. Please wait for notification to generate token.');
    process.exit(0);
}

const sessions = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
const tokens = Object.keys(sessions);

if (tokens.length === 0) {
    console.log('⚠️  No sessions found yet. Please wait for notification to generate token.');
    process.exit(0);
}

const latestToken = tokens[tokens.length - 1];
const latestSession = sessions[latestToken];
console.log('🔑 TOKEN MỚI:', latestToken);
console.log('📋 Type:', latestSession.type);
console.log('🖥️ Tmux session:', latestSession.tmuxSession);
console.log('📅 Created:', new Date(latestSession.createdAt * 1000).toLocaleString());
console.log('');
console.log('📱 Sử dụng trong Telegram:');
console.log('/cmd', latestToken, 'your command here');
"

echo ""
echo "✅ Setup hoàn tất!"

# Get current token for monitoring
CURRENT_TOKEN=$(node -e "
const fs = require('fs');
const path = require('path');
const sessionFile = path.join('$SCRIPT_DIR', 'src/data/session-map.json');

if (!fs.existsSync(sessionFile)) {
    console.log('PENDING');
    process.exit(0);
}

const sessions = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
const tokens = Object.keys(sessions);
if (tokens.length === 0) {
    console.log('PENDING');
} else {
    console.log(tokens[tokens.length - 1]);
}
")

echo ""
echo "📋 Các bước tiếp theo:"
echo "1. Kiểm tra Telegram để nhận notification với token mới"
echo "2. Sử dụng token mới để gửi commands"
echo "3. Claude sẽ tự động approve tool permissions (bypass mode)"
echo ""
echo "🔍 Để kiểm tra tmux session:"
echo "tmux list-sessions"
echo "tmux attach-session -t claude-session"
echo "tmux capture-pane -t claude-session -p"
echo ""
echo "📊 Current token: $CURRENT_TOKEN"