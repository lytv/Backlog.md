# API Client Fix Summary

## Problem
Khi click "Create Worktree" button, xuất hiện error "this.request is not a function" trong tooltip.

## Root Cause
- **Missing Method**: ApiClient class chỉ có `fetchJson` method
- **Inconsistent API**: Worktree methods đang gọi `this.request()` nhưng method này không tồn tại
- **Legacy Code**: Worktree methods được viết với assumption có `request` method

## Error Details
```javascript
// Worktree methods calling non-existent method
async fetchWorktrees(): Promise<Worktree[]> {
  return this.request<Worktree[]>(`${API_BASE}/worktrees`);  // ❌ this.request is not a function
}

async createWorktree(dto: CreateWorktreeDto): Promise<Worktree> {
  return this.request<Worktree>(`${API_BASE}/worktrees`, {   // ❌ this.request is not a function
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
}
```

## Solution
**File**: `src/web/lib/api.ts`

Added `request` method as an alias to `fetchJson` to maintain compatibility:

```typescript
// Before: Only had fetchJson method
private async fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await this.fetchWithRetry(url, options);
  return response.json();
}

// After: Added request method as alias
private async fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await this.fetchWithRetry(url, options);
  return response.json();
}

// Alias for fetchJson to maintain compatibility with worktree methods
private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
  return this.fetchJson<T>(url, options);
}
```

## Why This Approach
1. **Minimal Change**: Only added one method instead of refactoring all worktree methods
2. **Backward Compatibility**: Existing worktree methods continue to work without changes
3. **Consistency**: Both `fetchJson` and `request` now available for different coding styles
4. **Future Proof**: New methods can use either approach

## Alternative Solutions Considered
1. **Refactor all worktree methods**: Replace `this.request` with `this.fetchJson`
   - ❌ More changes required
   - ❌ Risk of introducing bugs
   
2. **Rename fetchJson to request**: 
   - ❌ Would break existing non-worktree methods
   - ❌ Inconsistent with naming convention

3. **Add request as alias**: ✅ **Chosen solution**
   - ✅ Minimal change
   - ✅ Maintains compatibility
   - ✅ Quick fix

## Testing Results

### ✅ API Methods Working
```
✅ Created worktree successfully:
   Name: test-feature-worktree
   Branch: feature/test-feature-worktree
   Path: /Users/mac/tools/test-feature-worktree
   Task ID: task-004
```

### ✅ All Worktree Operations
- `fetchWorktrees()` ✅
- `createWorktree()` ✅  
- `updateWorktree()` ✅
- `deleteWorktree()` ✅
- `getWorktreeStatus()` ✅
- `mergeWorktree()` ✅
- `pushWorktree()` ✅
- `pullWorktree()` ✅

## Files Modified
- `src/web/lib/api.ts` - Added `request` method alias

## Result
🎉 **WorktreeButton now works perfectly!**

### Before Fix:
- ❌ "this.request is not a function" error
- ❌ Worktree creation failed
- ❌ All worktree operations broken

### After Fix:
- ✅ All worktree API methods work
- ✅ WorktreeButton creates worktrees successfully
- ✅ Error handling works correctly
- ✅ Feature branches created automatically

## Impact
- **Fixed**: All worktree functionality in the UI
- **Maintained**: Existing API method compatibility
- **Improved**: User experience with working worktree creation
- **Enabled**: Full worktree workflow in browser

The API client is now fully functional for worktree operations! 🚀