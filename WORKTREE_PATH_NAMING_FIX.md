# Worktree Path and Naming Fix Summary

## Requirements
Bạn yêu cầu thay đổi:

1. **Path**: Từ `/Users/mac/tools/t06s01databasemigrations` → `.tree/T06_S01_Database_Migrations` trong project directory
2. **Naming**: Giữ nguyên format gốc `T06_S01_Database_Migrations` thay vì lowercase
3. **Directory**: Tạo thư mục `.tree` trong project để chứa tất cả worktrees

## Changes Made

### 1. Updated Worktree Path Location
**Files Modified**: 
- `src/core/git-worktree-service.ts`
- `src/core/worktree-storage.ts`

```typescript
// Before: Worktrees created outside project directory
const worktreePath = basePath ? join(basePath, name) : join(this.projectRoot, '..', name);

// After: Worktrees created in .tree directory within project
const worktreePath = basePath ? join(basePath, name) : join(this.projectRoot, '.tree', name);
```

### 2. Preserve Original Task Name Format
**File Modified**: `src/web/components/WorktreeButton.tsx`

```typescript
// Before: Converted to lowercase
const generateWorktreeName = (title: string): string => {
  return title
    .toLowerCase()  // ❌ Lost original case
    .replace(/[^a-z0-9\s-]/g, '') // ❌ Lost underscores
    .replace(/\s+/g, '-') // ❌ Used hyphens instead of underscores
    // ...
};

// After: Preserve original format
const generateWorktreeName = (title: string): string => {
  return title
    .replace(/[^a-zA-Z0-9\s_-]/g, '') // ✅ Keep underscores and original case
    .replace(/\s+/g, '_') // ✅ Use underscores to match original format
    .replace(/_+/g, '_') // ✅ Clean up multiple underscores
    .replace(/^_|_$/g, '') // ✅ Remove leading/trailing underscores
    .substring(0, 50);
};
```

### 3. Git Branch Naming Convention
```typescript
// Branch names still use lowercase (git convention)
const featureBranchName = `feature/${worktreeName.toLowerCase()}`;
```

## Results

### ✅ Path Structure
```
Before: /Users/mac/tools/t06s01databasemigrations
After:  /Users/mac/tools/Backlog.md/.tree/T06_S01_Database_Migrations
```

### ✅ Name Preservation
```
Task Title: "T06_S01_Database_Migrations"
→ Worktree Name: "T06_S01_Database_Migrations" (preserves original)
→ Branch Name: "feature/t06_s01_database_migrations" (git convention)
```

### ✅ Directory Organization
```
Project Root/
├── .tree/                          ← New directory for all worktrees
│   ├── T06_S01_Database_Migrations/
│   ├── User_Authentication_System/
│   └── API-Gateway-Setup/
├── backlog/
│   └── worktrees/                  ← Metadata storage
└── src/
```

## Testing Results

### ✅ Path Verification
```
✅ Created worktree successfully:
   Name: T06_S01_Database_Migrations
   Branch: feature/t06_s01_database_migrations
   Path: /Users/mac/tools/Backlog.md/.tree/T06_S01_Database_Migrations
   Task ID: task-004
✅ Path correctly uses .tree directory
✅ Name preserves original format: T06_S01_Database_Migrations
```

### ✅ Naming Logic Examples
```
Title: "T06_S01_Database_Migrations"
→ Worktree name: "T06_S01_Database_Migrations"
→ Branch name: "feature/t06_s01_database_migrations"
→ Path: .tree/T06_S01_Database_Migrations

Title: "User Authentication System"
→ Worktree name: "User_Authentication_System"
→ Branch name: "feature/user_authentication_system"
→ Path: .tree/User_Authentication_System

Title: "API-Gateway-Setup"
→ Worktree name: "API-Gateway-Setup"
→ Branch name: "feature/api-gateway-setup"
→ Path: .tree/API-Gateway-Setup

Title: "Fix Bug #123"
→ Worktree name: "Fix_Bug_123"
→ Branch name: "feature/fix_bug_123"
→ Path: .tree/Fix_Bug_123
```

## Case Sensitivity

**Git Branches**: Case-insensitive by default on most systems, so using lowercase is safer
**Worktree Names**: Preserve original case for better readability
**File System**: Works on both case-sensitive and case-insensitive file systems

## Benefits

### 1. **Organization**
- ✅ All worktrees in one `.tree` directory
- ✅ Easy to find and manage
- ✅ Keeps project root clean

### 2. **Name Preservation**
- ✅ Maintains original task naming convention
- ✅ Better readability and recognition
- ✅ Consistent with task titles

### 3. **Git Compatibility**
- ✅ Branch names follow git conventions (lowercase)
- ✅ Filesystem-safe characters only
- ✅ Works across different operating systems

### 4. **User Experience**
- ✅ Intuitive worktree names matching task titles
- ✅ Organized directory structure
- ✅ Easy navigation and identification

## Files Modified

1. **`src/core/git-worktree-service.ts`** - Updated default worktree path
2. **`src/core/worktree-storage.ts`** - Updated storage path logic
3. **`src/web/components/WorktreeButton.tsx`** - Updated name generation logic
4. **`test-worktree-path.js`** - Created comprehensive test

## Result

🎉 **Perfect Implementation!**

### Before:
- ❌ Worktrees scattered outside project directory
- ❌ Names converted to lowercase
- ❌ Lost original task format

### After:
- ✅ All worktrees organized in `.tree/` directory
- ✅ Names preserve original case and format
- ✅ Git branches follow conventions
- ✅ Filesystem-safe and cross-platform compatible

**Example**: Task "T06_S01_Database_Migrations" now creates:
- **Worktree**: `.tree/T06_S01_Database_Migrations/`
- **Branch**: `feature/t06_s01_database_migrations`
- **Perfect organization and naming!** 🚀