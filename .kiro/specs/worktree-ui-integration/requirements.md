# Requirements Document

## Introduction

Nâng cấp giao diện người dùng cho phần quản lý worktree để tích hợp trực tiếp vào trang chính thay vì mở trang mới riêng biệt. Mục tiêu là tạo ra một trải nghiệm người dùng mượt mà và nhất quán, tương tự như trang Statistics hiện tại, với khả năng quản lý worktree đầy đủ trong một giao diện tích hợp.

## Requirements

### Requirement 1

**User Story:** Là một developer, tôi muốn quản lý worktrees trong cùng một giao diện tích hợp thay vì mở trang mới, để có trải nghiệm làm việc mượt mà và không bị gián đoạn.

#### Acceptance Criteria

1. WHEN người dùng click vào một worktree THEN hệ thống SHALL hiển thị chi tiết worktree trong cùng trang thay vì mở trang mới
2. WHEN người dùng đang xem chi tiết worktree THEN hệ thống SHALL cung cấp nút "Back" hoặc breadcrumb để quay lại danh sách worktrees
3. WHEN người dùng thực hiện các thao tác trên worktree THEN giao diện SHALL cập nhật real-time mà không cần reload trang

### Requirement 2

**User Story:** Là một developer, tôi muốn có overview tổng quan về tất cả worktrees với các thống kê quan trọng, để nhanh chóng nắm bắt tình trạng của dự án.

#### Acceptance Criteria

1. WHEN người dùng truy cập trang worktrees THEN hệ thống SHALL hiển thị các thẻ thống kê tổng quan (total, active, modified, inactive)
2. WHEN có thay đổi trong worktrees THEN các thống kê SHALL được cập nhật tự động
3. WHEN người dùng xem overview THEN hệ thống SHALL hiển thị trạng thái của từng worktree với màu sắc và icon phù hợp

### Requirement 3

**User Story:** Là một developer, tôi muốn có thể thực hiện tất cả các thao tác quản lý worktree (tạo, xóa, sync) trong giao diện tích hợp, để không phải chuyển đổi giữa nhiều trang khác nhau.

#### Acceptance Criteria

1. WHEN người dùng chọn một worktree THEN hệ thống SHALL hiển thị panel chi tiết với các thao tác có thể thực hiện
2. WHEN người dùng thực hiện thao tác tạo worktree mới THEN form tạo SHALL hiển thị inline trong cùng trang
3. WHEN người dùng thực hiện thao tác xóa worktree THEN hệ thống SHALL hiển thị confirmation dialog và cập nhật danh sách sau khi xóa thành công

### Requirement 4

**User Story:** Là một developer, tôi muốn giao diện worktree có thiết kế nhất quán với các trang khác trong ứng dụng, để có trải nghiệm người dùng thống nhất.

#### Acceptance Criteria

1. WHEN người dùng xem trang worktrees THEN giao diện SHALL sử dụng cùng design system với trang Statistics
2. WHEN người dùng tương tác với các component THEN chúng SHALL có cùng style, màu sắc và animation với các trang khác
3. WHEN người dùng sử dụng dark mode THEN trang worktrees SHALL hỗ trợ dark mode tương tự các trang khác

### Requirement 5

**User Story:** Là một developer, tôi muốn có thể xem thông tin chi tiết của worktree (linked tasks, git status, path) một cách rõ ràng và có tổ chức, để dễ dàng theo dõi và quản lý.

#### Acceptance Criteria

1. WHEN người dùng xem chi tiết worktree THEN hệ thống SHALL hiển thị thông tin git status với màu sắc phù hợp
2. WHEN worktree có linked tasks THEN hệ thống SHALL hiển thị danh sách tasks với khả năng click để xem chi tiết
3. WHEN người dùng xem path của worktree THEN hệ thống SHALL hiển thị path dưới dạng code block có thể copy
4. WHEN worktree có uncommitted changes THEN hệ thống SHALL hiển thị số lượng changes và loại changes (staged/modified)

### Requirement 6

**User Story:** Là một developer, tôi muốn có khả năng filter và search worktrees, để nhanh chóng tìm được worktree cần thiết khi có nhiều worktrees.

#### Acceptance Criteria

1. WHEN người dùng nhập vào search box THEN hệ thống SHALL filter worktrees theo tên, branch, hoặc linked task
2. WHEN người dùng chọn filter theo status THEN hệ thống SHALL hiển thị chỉ những worktrees có status tương ứng
3. WHEN người dùng clear filter THEN hệ thống SHALL hiển thị lại tất cả worktrees