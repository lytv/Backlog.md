# WorktreeButton Event Handling Fix

## Problem
Khi nhấn nút "Create Worktree" trong TaskCard, thay vì tạo worktree thì lại mở task detail. Điều này xảy ra do event bubbling.

## Root Cause
- WorktreeButton được đặt bên trong TaskCard
- TaskCard có `onClick={() => onEdit(task)}` để mở task detail
- Khi click vào WorktreeButton, event bubble lên TaskCard và trigger `onEdit(task)`
- Kết quả: Task detail mở thay vì tạo worktree

## Solution
Thêm event handling để prevent event bubbling trong WorktreeButton:

### 1. Updated handleCreateWorktree
```typescript
// Before
const handleCreateWorktree = async () => {
  // ... worktree creation logic
};

// After  
const handleCreateWorktree = async (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  // ... worktree creation logic
};
```

### 2. Updated handleOpenWorktree
```typescript
// Before
const handleOpenWorktree = (worktree: Worktree) => {
  // ... open worktree logic
};

// After
const handleOpenWorktree = (e: React.MouseEvent, worktree: Worktree) => {
  e.preventDefault();
  e.stopPropagation();
  // ... open worktree logic
};
```

### 3. Updated button onClick handlers
```typescript
// Create Worktree button
<button onClick={handleCreateWorktree}>

// Open Worktree button  
<button onClick={(e) => handleOpenWorktree(e, activeWorktrees[0])}>
```

## Testing
- ✅ Server starts and serves API correctly
- ✅ Worktree API endpoints work as expected  
- ✅ Frontend loads and renders WorktreeButton
- ✅ Event handling prevents task detail from opening
- ✅ WorktreeButton functions independently

## Files Modified
- `src/web/components/WorktreeButton.tsx` - Added event handling
- `test-worktree-button.js` - Created test to verify functionality

## Result
- ✅ **Fixed**: Clicking "Create Worktree" now creates worktree instead of opening task
- ✅ **Fixed**: Clicking "Open Worktree" now opens worktree instead of opening task  
- ✅ **Maintained**: TaskCard still opens task detail when clicking elsewhere
- ✅ **Improved**: Better user experience with proper event handling

## Usage
Bây giờ users có thể:
1. Click vào TaskCard để mở task detail
2. Click vào "Create Worktree" button để tạo worktree cho task
3. Click vào "Open Worktree" button để mở worktree trong file explorer
4. Tất cả hoạt động độc lập và không conflict với nhau

WorktreeButton bây giờ hoạt động chính xác như thiết kế! 🎉