#!/bin/bash

# Prevent recursive execution
if [[ "$BACKLOG_EXECUTING" == "1" ]]; then
    echo "⚠️  CCRM được gọi từ Backlog server - chuyển sang chế độ an toàn"
    echo "🔄 Thực thi trực tiếp script thay vì qua alias để tránh vòng lặp"
    echo ""
    # Continue execution instead of exiting
fi

# Set execution flag
export BACKLOG_EXECUTING=1

# Get the directory where this script is located
SCRIPT_DIR="/Users/mac/tools/Claude-Code-Remote"
echo "📁 Script directory: $SCRIPT_DIR"

# Check if script directory exists
if [[ ! -d "$SCRIPT_DIR" ]]; then
    echo "❌ Claude Code Remote directory not found: $SCRIPT_DIR"
    exit 1
fi

# Ensure data directory exists
mkdir -p "$SCRIPT_DIR/src/data"

echo "🚀 Tạo phiên làm việc Claude Code Remote mới..."
echo "================================================"
echo "⚙️  Cấu hình: Dangerously Skip Permissions (tự động approve tools)"

# Kill existing sessions with better error handling
echo "🧹 Dọn dẹp sessions cũ..."
if tmux has-session -t claude-session 2>/dev/null; then
    echo "  - Killing existing tmux session..."
    tmux kill-session -t claude-session 2>/dev/null || true
fi

if pgrep -f "claude-code" >/dev/null; then
    echo "  - Killing existing claude processes..."
    pkill -f "claude-code" 2>/dev/null || true
fi

# Wait a moment for cleanup
sleep 3

# Create new tmux session with error handling
echo "📱 Tạo tmux session mới 'claude-session'..."
if ! tmux new-session -d -s claude-session; then
    echo "❌ Không thể tạo tmux session"
    exit 1
fi

# Wait for session to be ready
sleep 2

# Start Claude Code with bypassing permissions in the session
echo "🤖 Khởi động Claude Code với Bypassing Permissions trong tmux session..."
tmux send-keys -t claude-session 'claude --dangerously-skip-permissions' Enter

# Wait for Claude to start with progress indicator
echo "⏳ Đợi Claude Code khởi động..."
for i in {1..10}; do
    echo "  - Đợi... ($i/10)"
    sleep 1
    if ps aux | grep -q "[c]laude"; then
        echo "✅ Claude Code đã khởi động thành công!"
        break
    fi
done

# Final check if Claude is running
if ! ps aux | grep -q "[c]laude"; then
    echo "❌ Claude Code chưa khởi động. Thử lại..."
    tmux send-keys -t claude-session 'claude --dangerously-skip-permissions' Enter
    sleep 5
    
    if ! ps aux | grep -q "[c]laude"; then
        echo "❌ Không thể khởi động Claude Code"
        exit 1
    fi
fi

# Generate new token
echo "🔑 Tạo token mới..."
cd "$SCRIPT_DIR" || exit 1

# Check if claude-hook-notify.js exists
if [[ ! -f "claude-hook-notify.js" ]]; then
    echo "❌ claude-hook-notify.js not found in $SCRIPT_DIR"
    exit 1
fi

node claude-hook-notify.js completed

# Get the new token with better error handling
echo ""
echo "📋 Thông tin session mới:"
node -e "
const fs = require('fs');
const path = require('path');
const sessionFile = path.join('$SCRIPT_DIR', 'src/data/session-map.json');

try {
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
} catch (error) {
    console.error('❌ Error reading session file:', error.message);
    process.exit(1);
}
"

echo ""
echo "✅ Setup hoàn tất!"

# Get current token for monitoring
CURRENT_TOKEN=$(node -e "
const fs = require('fs');
const path = require('path');
const sessionFile = path.join('$SCRIPT_DIR', 'src/data/session-map.json');

try {
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
} catch (error) {
    console.log('ERROR');
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

# Unset execution flag
unset BACKLOG_EXECUTING