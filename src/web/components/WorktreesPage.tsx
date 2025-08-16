import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Worktree, Task } from '../../types';
import { apiClient } from '../lib/api';
import LoadingSpinner from './LoadingSpinner';
import WorktreeStatsCards from './WorktreeStatsCards';
import WorktreeOverview from './WorktreeOverview';
const WorktreeDetailPanel = React.lazy(() => import('./WorktreeDetailPanel'));
import WorktreeCommandsPanel from './WorktreeCommandsPanel';
import WorktreeToast from './WorktreeToast';

interface WorktreesPageProps {
  tasks: Task[];
  worktrees: Worktree[];
  isLoading?: boolean;
  onRefreshData?: () => Promise<void>;
}

type ViewMode = 'overview' | 'detail' | 'commands';
type FilterMode = 'all' | 'active' | 'inactive' | 'modified';

interface WorktreeViewState {
  selectedWorktree: Worktree | null;
  viewMode: ViewMode;
  searchQuery: string;
  statusFilter: FilterMode;
}

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  id: string;
}

const WorktreesPage: React.FC<WorktreesPageProps> = ({ 
  tasks, 
  worktrees: propWorktrees, 
  isLoading: externalLoading, 
  onRefreshData 
}) => {
  const [viewState, setViewState] = useState<WorktreeViewState>({
    selectedWorktree: null,
    viewMode: 'overview',
    searchQuery: '',
    statusFilter: 'all'
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'commands'>('overview');
  const [error, setError] = useState<string | null>(null);
  const [isOperating, setIsOperating] = useState(false);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(viewState.searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [viewState.searchQuery]);

  // Auto-refresh every 30 seconds when page is visible
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let isMounted = true;
    
    const startAutoRefresh = () => {
      intervalId = setInterval(() => {
        if (isMounted && !document.hidden && !isOperating && onRefreshData) {
          onRefreshData().catch(console.error);
        }
      }, 30000); // 30 seconds
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(intervalId);
      } else if (isMounted) {
        startAutoRefresh();
      }
    };

    startAutoRefresh();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOperating, onRefreshData]);

  const handleRefresh = useCallback(async () => {
    try {
      setIsOperating(true);
      setError(null);
      if (onRefreshData) {
        await onRefreshData();
        showToast('Worktrees refreshed successfully', 'success');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to refresh data';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsOperating(false);
    }
  }, [onRefreshData]);

  const handleWorktreeSelect = useCallback((worktree: Worktree) => {
    setViewState({
      selectedWorktree: worktree,
      viewMode: 'detail'
    });
  }, []);

  const handleBackToOverview = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      selectedWorktree: null,
      viewMode: 'overview'
    }));
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setViewState(prev => ({
      ...prev,
      searchQuery: query
    }));
  }, []);

  const handleFilterChange = useCallback((filter: FilterMode) => {
    setViewState(prev => ({
      ...prev,
      statusFilter: filter
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      searchQuery: '',
      statusFilter: 'all'
    }));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { message, type, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const handleDeleteWorktree = async (worktreeId: string, force = false) => {
    const worktree = propWorktrees.find(wt => wt.id === worktreeId);
    const worktreeName = worktree?.name || worktreeId;
    
    try {
      setIsOperating(true);
      setError(null);
      
      // Optimistic update - remove from view immediately
      if (viewState.selectedWorktree?.id === worktreeId) {
        setViewState(prev => ({
          ...prev,
          selectedWorktree: null,
          viewMode: 'overview'
        }));
      }
      
      await apiClient.deleteWorktree(worktreeId, force);
      showToast(`Worktree "${worktreeName}" ${force ? 'cleaned up' : 'deleted'} successfully`, 'success');
      
      // Refresh data to get updated state
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete worktree';
      setError(errorMessage);
      showToast(`Failed to ${force ? 'cleanup' : 'delete'} worktree "${worktreeName}": ${errorMessage}`, 'error');
      
      // Refresh to restore correct state on error
      if (onRefreshData) {
        await onRefreshData();
      }
    } finally {
      setIsOperating(false);
    }
  };

  // Memoized filtered worktrees calculation
  const filteredWorktrees = useMemo(() => {
    let filtered = propWorktrees;

    // Apply status filter
    if (viewState.statusFilter !== 'all') {
      switch (viewState.statusFilter) {
        case 'active':
          filtered = filtered.filter(wt => wt.isActive);
          break;
        case 'inactive':
          filtered = filtered.filter(wt => !wt.isActive);
          break;
        case 'modified':
          filtered = filtered.filter(wt => wt.isActive && !wt.status.isClean);
          break;
      }
    }

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(wt => {
        // Search in worktree name
        if (wt.name.toLowerCase().includes(query)) return true;
        
        // Search in branch name
        if (wt.branch.toLowerCase().includes(query)) return true;
        
        // Search in linked task titles
        const hasMatchingTask = wt.taskIds.some(taskId => {
          const task = tasks.find(t => t.id === taskId);
          return task && (
            task.title.toLowerCase().includes(query) ||
            taskId.toLowerCase().includes(query)
          );
        });
        
        return hasMatchingTask;
      });
    }

    return filtered;
  }, [propWorktrees, viewState.statusFilter, debouncedSearchQuery, tasks]);



  if (externalLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // Show detail view if worktree is selected
  if (viewState.viewMode === 'detail' && viewState.selectedWorktree) {
    return (
      <React.Suspense fallback={
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      }>
        <WorktreeDetailPanel
          worktree={viewState.selectedWorktree}
          tasks={tasks}
          onBack={handleBackToOverview}
          onRefresh={handleRefresh}
          onDelete={handleDeleteWorktree}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Worktrees
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your git worktrees and development environments
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <p className="text-red-700 dark:text-red-400 font-medium">Error</p>
              <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={handleRefresh}
                disabled={isOperating}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Retry
              </button>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <WorktreeStatsCards worktrees={propWorktrees} />

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search worktrees by name, branch, or linked task..."
                value={viewState.searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</label>
            <select
              value={viewState.statusFilter}
              onChange={(e) => handleFilterChange(e.target.value as FilterMode)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            >
              <option value="all">All Worktrees</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="modified">Modified Only</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(viewState.searchQuery || viewState.statusFilter !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Results Info */}
        {(viewState.searchQuery || viewState.statusFilter !== 'all') && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredWorktrees.length} of {propWorktrees.length} worktrees
            {viewState.searchQuery && (
              <span> matching "{viewState.searchQuery}"</span>
            )}
            {viewState.statusFilter !== 'all' && (
              <span> with status "{viewState.statusFilter}"</span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('commands')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'commands'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Commands
            </button>
          </nav>
        </div>
      </div>

      {/* Loading Indicator */}
      {isOperating && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <div className="animate-spin rounded-circle h-4 w-4 border-b-2 border-white"></div>
          <span className="text-sm">Processing...</span>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <WorktreeOverview
          worktrees={filteredWorktrees}
          tasks={tasks}
          onWorktreeSelect={handleWorktreeSelect}
          onDeleteWorktree={handleDeleteWorktree}
          onSwitchToCommands={() => setActiveTab('commands')}
          isFiltered={viewState.searchQuery !== '' || viewState.statusFilter !== 'all'}
          isOperating={isOperating}
        />
      )}

      {activeTab === 'commands' && (
        <WorktreeCommandsPanel
          onCommandExecute={(command, result) => {
            console.log('Command executed:', command.name, result);
          }}
          onRefreshData={handleRefresh}
          onShowToast={showToast}
        />
      )}

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <WorktreeToast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  );
};



export default React.memo(WorktreesPage);