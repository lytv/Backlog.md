# Cải tiến Bash Command Execution

## Vấn đề ban đầu
- Lệnh `ccrm` (alias) gây ra vòng lặp vô hạn khi thực thi từ server
- Sử dụng `zsh -i -c` load toàn bộ interactive shell có thể gây conflict
- Không có cơ chế ngăn chặn duplicate execution
- Thiếu timeout và cleanup process tốt

## Các cải tiến đã thực hiện

### 1. Ngăn chặn vòng lặp vô hạn
- **Environment flag**: Thêm `BACKLOG_EXECUTING=1` để detect recursive calls
- **Script replacement**: Thay thế `ccrm` bằng đường dẫn trực tiếp đến script an toàn
- **Safe script**: Tạo `create-new-session-safe.sh` với các biện pháp bảo vệ

### 2. Cải thiện process management
- **Spawn thay vì exec**: Sử dụng `spawn` để kiểm soát tốt hơn child process
- **Proper timeout**: Timeout 30s với graceful termination (SIGTERM) trước khi force kill (SIGKILL)
- **Process tracking**: Track các command đang chạy để tránh duplicate execution

### 3. Better error handling
- **Exit code tracking**: Theo dõi exit code của process
- **Combined output**: Kết hợp stdout và stderr
- **Detailed logging**: Log chi tiết cho debugging

### 4. Command detection logic
- **Shell expansion detection**: Detect các command cần shell expansion
- **Direct execution**: Execute simple command trực tiếp không qua shell
- **Alias handling**: Xử lý riêng cho các alias như `ccrm`

## Files đã thay đổi

### `src/server/index.ts`
- Thay đổi từ `exec` sang `spawn` approach
- Thêm command tracking với `runningCommands` Set
- Cải thiện timeout và cleanup logic
- Thêm logging chi tiết

### `create-new-session-safe.sh`
- Script an toàn với recursive protection
- Better error handling và validation
- Loại bỏ auto-opening terminal windows
- Improved progress indicators

## Cách test

1. **Start server**: `bun run browser`
2. **Run test script**: `node test-bash-execution.js`
3. **Manual test**: Thử các command qua web interface

## Các command test được

- ✅ Simple commands: `ls`, `echo`
- ✅ Shell expansions: `ls *.js`
- ✅ Aliases: `ccrm` (now safe)
- ✅ Duplicate prevention
- ✅ Timeout handling

## Lưu ý quan trọng

1. **Environment variable**: `BACKLOG_EXECUTING=1` được set để ngăn recursive calls
2. **Script path**: `ccrm` được replace bằng `/Users/mac/tools/Claude-Code-Remote/create-new-session-safe.sh`
3. **Timeout**: 30 giây timeout với graceful cleanup
4. **Duplicate prevention**: Cùng một command không thể chạy song song

## Monitoring

- Check server logs để thấy `[BASH]` messages
- Monitor process với `ps aux | grep node`
- Check tmux sessions với `tmux list-sessions`