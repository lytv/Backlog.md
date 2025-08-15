import React, { useState, useEffect } from 'react';
import type { Worktree, Task, MergeResult } from '../../types';
import { apiClient } from '../lib/api';
import Modal from './Modal';
import WorktreeCommandInterface from './WorktreeCommandInterface';

interface WorktreeManagerProps {
  isOpen: boolean;
  onClose: () => void;
  initialWorktreeId?: string;
  onRefreshData?: () => Promise<void>;
}

type TabType = 'overview' | 'commands' | 'settings';

const WorktreeManager: React.FC<WorktreeManagerProps> = ({
  isOpen,
  onClose,
  initialWorktreeId,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedWorktree, setSelectedWorktree] = useState<Worktree | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialWorktreeId && worktrees.length > 0) {
      const worktree = worktrees.find(wt => wt.id === initialWorktreeId);
      if (worktree) {
        setSelectedWorktree(worktree);
      }
    }
  }, [initialWorktreeId, worktrees]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [worktreesData, tasksData] = await Promise.all([
        apiClient.fetchWorktrees(),
        apiClient.fetchTasks()
      ]);
      setWorktrees(worktreesData);
      setTasks(tasksData);
    } catch (error: any) {
      setError(error.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWorktree = async (worktreeId: string, force = false) => {
    try {
      setError(null);
      await apiClient.deleteWorktree(worktreeId, force);
      await loadData();
      if (onRefreshData) {
        await onRefreshData();
      }
      setShowDeleteConfirm(null);
      if (selectedWorktree?.id === worktreeId) {
        setSelectedWorktree(null);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to delete worktree');
    }
  };

  const handleMergeWorktree = async (worktreeId: string, targetBranch: string) => {
    try {
      setError(null);
      const result = await apiClient.mergeWorktree(worktreeId, targetBranch);
      if (result.success) {
        await loadData();
        if (onRefreshData) {
          await onRefreshData();
        }
      } else {
        setError(result.message || 'Merge failed');
      }
      return result;
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to merge worktree';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    }
  };

  const handlePushWorktree = async (worktreeId: string) => {
    try {
      setError(null);
      await apiClient.pushWorktree(worktreeId);
      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to push worktree');
    }
  };

  const handlePullWorktree = async (worktreeId: string) => {
    try {
      setError(null);
      await apiClient.pullWorktree(worktreeId);
      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to pull worktree');
    }
  };

  const getTaskTitle = (taskId: string): string => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.title : taskId;
  };

  const getStatusIcon = (worktree: Worktree) => {
    if (!worktree.isActive) {
      return <span className="w-3 h-3 bg-gray-400 rounded-full"></span>;
    }
    if (!worktree.status.isClean) {
      return <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>;
    }
    if (worktree.status.aheadCount > 0 || worktree.status.behindCount > 0) {
      return <span className="w-3 h-3 bg-blue-500 rounded-full"></span>;
    }
    return <span className="w-3 h-3 bg-green-500 rounded-full"></span>;
  };

  const getStatusText = (worktree: Worktree): string => {
    if (!worktree.isActive) return 'Inactive';
    if (!worktree.status.isClean) {
      const changes = worktree.status.modifiedFiles + worktree.status.stagedFiles;
      return `${changes} changes`;
    }
    if (worktree.status.aheadCount > 0) return `+${worktree.status.aheadCount} ahead`;
    if (worktree.status.behindCount > 0) return `-${worktree.status.behindCount} behind`;
    return 'Clean';
  };

  const renderOverviewTab = () => (
    <div className="flex h-full">
      {/* Worktree List */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Worktrees ({worktrees.length})
            </h3>
            <button
              onClick={loadData}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 73px)' }}>
          {worktrees.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p>No worktrees found</p>
              <p className="text-sm mt-1">Create worktrees from tasks</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {worktrees.map((worktree) => (
                <div
                  key={worktree.id}
                  onClick={() => setSelectedWorktree(worktree)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                    selectedWorktree?.id === worktree.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(worktree)}
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {worktree.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {getStatusText(worktree)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {worktree.branch}
                  </div>
                  {worktree.taskIds.length > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">
                      {worktree.taskIds.length === 1 
                        ? `Task: ${getTaskTitle(worktree.taskIds[0])}`
                        : `${worktree.taskIds.length} linked tasks`
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Worktree Detail */}
      <div className="flex-1">
        {selectedWorktree ? (
          <WorktreeDetail
            worktree={selectedWorktree}
            tasks={tasks}
            onDelete={(force) => handleDeleteWorktree(selectedWorktree.id, force)}
            onMerge={(targetBranch) => handleMergeWorktree(selectedWorktree.id, targetBranch)}
            onPush={() => handlePushWorktree(selectedWorktree.id)}
            onPull={() => handlePullWorktree(selectedWorktree.id)}
            onShowDeleteConfirm={() => setShowDeleteConfirm(selectedWorktree.id)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p>Select a worktree to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCommandsTab = () => (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Worktree Commands
      </h3>
      <WorktreeCommandInterface
        onCommandExecute={(command, result) => {
          console.log('Command executed:', command.name, result);
        }}
        onRefreshData={async () => {
          await loadData();
          if (onRefreshData) {
            await onRefreshData();
          }
        }}
      />
    </div>
  );

  const renderSettingsTab = () => (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Worktree Settings
      </h3>
      <div className="text-gray-600 dark:text-gray-400">
        Settings interface coming soon...
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Worktree Manager
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'overview', label: 'Overview', icon: '📋' },
            { id: 'commands', label: 'Commands', icon: '⚡' },
            { id: 'settings', label: 'Settings', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700 dark:hover:text-red-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading...</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'commands' && renderCommandsTab()}
              {activeTab === 'settings' && renderSettingsTab()}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Delete Worktree</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete this worktree? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteWorktree(showDeleteConfirm, false)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                Delete
              </button>
              <button
                onClick={() => handleDeleteWorktree(showDeleteConfirm, true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-800 rounded-lg hover:bg-red-900 transition-colors duration-200"
              >
                Force Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

// Worktree Detail Component
interface WorktreeDetailProps {
  worktree: Worktree;
  tasks: Task[];
  onDelete: (force: boolean) => void;
  onMerge: (targetBranch: string) => Promise<MergeResult>;
  onPush: () => void;
  onPull: () => void;
  onShowDeleteConfirm: () => void;
}

const WorktreeDetail: React.FC<WorktreeDetailProps> = ({
  worktree,
  tasks,
  onDelete,
  onMerge,
  onPush,
  onPull,
  onShowDeleteConfirm
}) => {
  const [mergeTarget, setMergeTarget] = useState('main');
  const [isOperating, setIsOperating] = useState(false);

  const getTaskTitle = (taskId: string): string => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.title : taskId;
  };

  const handleOperation = async (operation: () => Promise<any>) => {
    try {
      setIsOperating(true);
      await operation();
    } finally {
      setIsOperating(false);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {worktree.name}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Branch: {worktree.branch}</span>
            <span>•</span>
            <span>Base: {worktree.baseBranch}</span>
            <span>•</span>
            <span className={worktree.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {worktree.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Status</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Modified files:</span>
              <span className="ml-2 font-medium">{worktree.status.modifiedFiles}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Staged files:</span>
              <span className="ml-2 font-medium">{worktree.status.stagedFiles}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Ahead:</span>
              <span className="ml-2 font-medium">{worktree.status.aheadCount}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Behind:</span>
              <span className="ml-2 font-medium">{worktree.status.behindCount}</span>
            </div>
          </div>
        </div>

        {/* Linked Tasks */}
        {worktree.taskIds.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Linked Tasks</h4>
            <div className="space-y-2">
              {worktree.taskIds.map((taskId) => (
                <div key={taskId} className="flex items-center space-x-2 text-sm">
                  <span className="text-blue-600 dark:text-blue-400">{taskId}</span>
                  <span className="text-gray-600 dark:text-gray-400">-</span>
                  <span className="text-gray-900 dark:text-gray-100">{getTaskTitle(taskId)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Actions</h4>
          
          {/* Git Operations */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleOperation(onPush)}
              disabled={isOperating || !worktree.isActive}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Push
            </button>
            <button
              onClick={() => handleOperation(onPull)}
              disabled={isOperating || !worktree.isActive}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Pull
            </button>
          </div>

          {/* Merge */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={mergeTarget}
              onChange={(e) => setMergeTarget(e.target.value)}
              placeholder="Target branch"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleOperation(() => onMerge(mergeTarget))}
              disabled={isOperating || !worktree.isActive || !mergeTarget.trim()}
              className="px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Merge
            </button>
          </div>

          {/* Delete */}
          <button
            onClick={onShowDeleteConfirm}
            disabled={isOperating}
            className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Delete Worktree
          </button>
        </div>

        {/* Path */}
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Path</h4>
          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
            {worktree.path}
          </code>
        </div>
      </div>
    </div>
  );
};

export default WorktreeManager;