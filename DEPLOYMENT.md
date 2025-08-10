# Deployment Guide

Hướng dẫn deploy phiên bản custom của backlog-md (có File Explorer) lên global installation.

## Yêu cầu

- Đã cài đặt backlog-md qua brew: `brew install backlog-md`
- Node.js và npm
- Quyền sudo để ghi đè file global

## Cách sử dụng

### 1. Deployment nhanh (Khuyến nghị)

```bash
make quick
```

Hoặc:

```bash
./deploy.sh --global --force
```

### 2. Deployment với xác nhận

```bash
make deploy
```

Hoặc:

```bash
./deploy.sh --global
```

### 3. Build local only (để test)

```bash
make deploy-local
```

Hoặc:

```bash
./deploy.sh --local
```

### 4. Deployment với test

```bash
make test
```

Hoặc:

```bash
./deploy.sh --global --test
```

## Scripts có sẵn

### 1. `deploy-global.sh` (Đơn giản)
- Script cơ bản để build và deploy
- Tự động tìm vị trí global installation
- Có validation và error handling

### 2. `deploy.sh` (Nâng cao)
- Nhiều tùy chọn deployment
- Confirmation prompts
- Testing capabilities
- Help documentation

### 3. `Makefile` (Tiện lợi nhất)
- Shortcuts cho các tác vụ thường dùng
- `make quick` - deployment nhanh nhất
- `make help` - xem tất cả commands

## Workflow thông thường

1. **Phát triển tính năng**
   ```bash
   # Edit code...
   make build          # Build để test
   ./dist/backlog --version
   ```

2. **Deploy lên global**
   ```bash
   make quick          # Build và deploy nhanh
   ```

3. **Test tính năng**
   ```bash
   cd /any/directory
   backlog browser     # Test File Explorer
   ```

## Troubleshooting

### Lỗi "backlog not found"
```bash
# Cài đặt backlog-md trước
brew install backlog-md
```

### Lỗi permission denied
```bash
# Script sẽ tự động dùng sudo
# Nhập password khi được yêu cầu
```

### Lỗi build failed
```bash
# Cài đặt dependencies
make install-deps
# Hoặc
npm install
```

## Tính năng mới sau deployment

✅ **File Explorer trong sidebar**
- Hiển thị cấu trúc thư mục project
- Expand/collapse directories
- Icons phân biệt file/folder
- Responsive design
- Security validation

## Kiểm tra deployment thành công

```bash
# Kiểm tra version
backlog --version

# Test browser interface
backlog browser --help

# Test File Explorer (mở browser)
backlog browser
# Xem sidebar -> cuối cùng sẽ có "File Explorer"
```

## Rollback (nếu cần)

```bash
# Cài đặt lại từ brew
brew uninstall backlog-md
brew install backlog-md
```