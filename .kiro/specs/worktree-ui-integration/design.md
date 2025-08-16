# Design Document

## Overview

Thiết kế này sẽ chuyển đổi WorktreesPage từ một trang riêng biệt sang một component tích hợp trực tiếp vào layout chính, tương tự như Statistics component. Thay vì mở trang mới khi click vào worktree, người dùng sẽ có trải nghiệm seamless với navigation state-based và detail view tích hợp.

## Architecture

### Current State
- WorktreesPage là một trang riêng biệt được render qua React Router
- WorktreeSidebar trong SideNavigation gọi `onWorktreeSelect` để mở WorktreeManager modal
- Không có route cho worktrees trong App.tsx

### Target State
- Tạo route `/worktrees` trong App.tsx tương tự như `/statistics`
- WorktreesPage sẽ được refactor thành integrated component
- Thêm detail view state management trong WorktreesPage
- Loại bỏ WorktreeManager modal, tích hợp functionality vào main view

## Components and Interfaces

### 1. Enhanced WorktreesPage Component

```typescript
interface WorktreesPageProps {
  tasks: Task[];
  worktrees: Worktree[];
  isLoading?: boolean;
  onRefreshData?: () => Promise<void>;
}

interface WorktreesPageState {
  selectedWorktree: Worktree | null;
  viewMode: 'overview' | 'detail' | 'commands';
  searchQuery: string;
  statusFilter: 'all' | 'active' | 'inactive' | 'modified';
}
```

### 2. Worktree Detail Panel Component

```typescript
interface WorktreeDetailPanelProps {
  worktree: Worktree;
  tasks: Task[];
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onDelete: (worktreeId: string, force?: boolean) => Promise<void>;
}
```

### 3. Worktree Commands Panel Component

```typescript
interface WorktreeCommandsPanelProps {
  onCommandExecute: (command: any, result: any) => void;
  onRefreshData: () => Promise<void>;
}
```

### 4. Worktree Statistics Cards Component

```typescript
interface WorktreeStatsProps {
  worktrees: Worktree[];
}
```

## Data Models

### Enhanced Worktree Interface
Sử dụng interface Worktree hiện tại, không cần thay đổi:

```typescript
interface Worktree {
  id: string;
  name: string;
  path: string;
  branch: string;
  isActive: boolean;
  taskIds: string[];
  status: {
    isClean: boolean;
    aheadCount: number;
    behindCount: number;
    modifiedFiles: number;
    stagedFiles: number;
  };
}
```

### View State Management
```typescript
type ViewMode = 'overview' | 'detail' | 'commands';
type FilterMode = 'all' | 'active' | 'inactive' | 'modified';

interface WorktreeViewState {
  selectedWorktree: Worktree | null;
  viewMode: ViewMode;
  searchQuery: string;
  statusFilter: FilterMode;
}
```

## Error Handling

### API Error Handling
- Graceful degradation khi worktree API không available
- Error boundaries cho từng component section
- Retry mechanism cho failed operations
- User-friendly error messages với action suggestions

### State Error Handling
- Validation cho worktree selection state
- Fallback khi selected worktree không tồn tại
- Recovery từ invalid view states

## Testing Strategy

### Unit Tests
- WorktreesPage component với các view modes khác nhau
- WorktreeDetailPanel component với different worktree states
- Filter và search functionality
- Error handling scenarios

### Integration Tests
- Navigation flow từ overview đến detail view
- API integration với worktree operations
- Real-time updates khi worktree state changes
- Cross-component communication

### E2E Tests
- Complete user journey từ sidebar đến detail management
- Worktree creation và deletion workflows
- Multi-worktree management scenarios

## Implementation Details

### 1. Layout Integration Pattern
Sử dụng pattern tương tự Statistics component:
- Tích hợp trực tiếp vào main content area
- Không sử dụng modal hoặc separate window
- Responsive design với mobile support
- Consistent styling với existing components

### 2. Navigation State Management
```typescript
// Trong WorktreesPage component
const [viewState, setViewState] = useState<WorktreeViewState>({
  selectedWorktree: null,
  viewMode: 'overview',
  searchQuery: '',
  statusFilter: 'all'
});

// Navigation functions
const handleWorktreeSelect = (worktree: Worktree) => {
  setViewState(prev => ({
    ...prev,
    selectedWorktree: worktree,
    viewMode: 'detail'
  }));
};

const handleBackToOverview = () => {
  setViewState(prev => ({
    ...prev,
    selectedWorktree: null,
    viewMode: 'overview'
  }));
};
```

### 3. Component Structure
```
WorktreesPage
├── WorktreeStatsCards (overview stats)
├── WorktreeFilters (search + status filter)
├── WorktreeOverview (grid view của worktrees)
│   ├── ActiveWorktreeCard
│   └── InactiveWorktreeCard
├── WorktreeDetailPanel (khi selected)
│   ├── WorktreeInfo
│   ├── LinkedTasks
│   ├── GitStatus
│   └── WorktreeActions
└── WorktreeCommandsPanel (commands tab)
```

### 4. Styling Consistency
- Sử dụng cùng color scheme và spacing với Statistics
- Card-based layout với shadows và borders
- Consistent typography và icon usage
- Dark mode support đầy đủ
- Responsive breakpoints tương tự

### 5. Real-time Updates
- WebSocket hoặc polling để update worktree status
- Optimistic updates cho user actions
- Loading states cho async operations
- Success/error toast notifications

### 6. Performance Considerations
- Lazy loading cho worktree details
- Memoization cho expensive calculations
- Virtual scrolling nếu có nhiều worktrees
- Debounced search input

## Migration Strategy

### Phase 1: Route Setup
1. Thêm `/worktrees` route vào App.tsx
2. Pass worktrees data từ Layout xuống WorktreesPage
3. Update SideNavigation để navigate đến route thay vì mở modal

### Phase 2: Component Refactoring
1. Refactor WorktreesPage để support integrated view
2. Tạo WorktreeDetailPanel component
3. Implement state management cho view modes

### Phase 3: Feature Integration
1. Integrate WorktreeCommandInterface vào commands panel
2. Add search và filter functionality
3. Implement real-time updates

### Phase 4: Polish & Testing
1. Styling consistency với design system
2. Error handling và loading states
3. Comprehensive testing
4. Performance optimization

## Design Mockup Structure

### Overview Mode
```
┌─────────────────────────────────────────────────────────────┐
│ Worktrees                                    [Refresh]      │
│ Manage your git worktrees and development environments      │
├─────────────────────────────────────────────────────────────┤
│ [Total: 5] [Active: 3] [Modified: 1] [Inactive: 2]         │
├─────────────────────────────────────────────────────────────┤
│ [Search...] [Filter: All ▼]                                │
├─────────────────────────────────────────────────────────────┤
│ Active Worktrees (3)                                        │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ ● feature-x │ │ ⚠ hotfix-y  │ │ ● main      │            │
│ │ main        │ │ develop     │ │ develop     │            │
│ │ Task: #123  │ │ 2 changes   │ │ Clean       │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
├─────────────────────────────────────────────────────────────┤
│ Inactive Worktrees (2)                                      │
│ ○ old-feature (cleanup available)                           │
│ ○ archived-branch (cleanup available)                       │
└─────────────────────────────────────────────────────────────┘
```

### Detail Mode
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Worktrees    feature-x                            │
├─────────────────────────────────────────────────────────────┤
│ Branch: main                    Status: ● Clean             │
│ Path: /path/to/worktree                                     │
├─────────────────────────────────────────────────────────────┤
│ Linked Tasks (1)                                            │
│ • #123: Implement feature X                                 │
├─────────────────────────────────────────────────────────────┤
│ Git Status                                                  │
│ • Clean working directory                                   │
│ • Up to date with origin/main                               │
├─────────────────────────────────────────────────────────────┤
│ Actions                                                     │
│ [Open in Explorer] [Sync] [Delete]                          │
└─────────────────────────────────────────────────────────────┘
```