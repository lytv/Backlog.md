import React, { useState } from 'react';
import type { Worktree, Task } from '../../types';
import { apiClient } from '../lib/api';

interface WorktreeDetailPanelProps {
  worktree: Worktree;
  tasks: Task[];
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onDelete: (worktreeId: string, force?: boolean) => Promise<void>;
}

const WorktreeDetailPanel: React.FC<WorktreeDetailPanelProps> = ({
  worktree,
  tasks,
  onBack,
  onRefresh,
  onDelete
}) => {
  const [isOperating, setIsOperating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTaskTitle = (taskId: string): string => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.title : taskId;
  };

  const handleOperation = async (operation: () => Promise<any>) => {
    try {
      setIsOperating(true);
      setError(null);
      await operation();
    } catch (error: any) {
      setError(error.message || 'Operation failed');
    } finally {
      setIsOperating(false);
    }
  };

  const handlePush = async () => {
    try {
      await apiClient.pushWorktree(worktree.id);
      await onRefresh();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to push worktree');
    }
  };

  const handlePull = async () => {
    try {
      await apiClient.pullWorktree(worktree.id);
      await onRefresh();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to pull worktree');
    }
  };

  const handleSync = async () => {
    try {
      await apiClient.pullWorktree(worktree.id);
      await apiClient.pushWorktree(worktree.id);
      await onRefresh();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sync worktree');
    }
  };

  const getStatusColor = (worktree: Worktree) => {
    if (!worktree.isActive) return 'text-gray-500 dark:text-gray-400';
    if (!worktree.status.isClean) return 'text-yellow-600 dark:text-yellow-400';
    if (worktree.status.aheadCount > 0 || worktree.status.behindCount > 0) return 'text-blue-600 dark:text-blue-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getStatusText = (worktree: Worktree): string => {
    if (!worktree.isActive) return 'Inactive';
    if (!worktree.status.isClean) {
      const changes = worktree.status.modifiedFiles + worktree.status.stagedFiles;
      return `${changes} uncommitted changes`;
    }
    if (worktree.status.aheadCount > 0 && worktree.status.behindCount > 0) {
      return `${worktree.status.aheadCount} ahead, ${worktree.status.behindCount} behind`;
    }
    if (worktree.status.aheadCount > 0) return `${worktree.status.aheadCount} commits ahead`;
    if (worktree.status.behindCount > 0) return `${worktree.status.behindCount} commits behind`;
    return 'Up to date';
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200 self-start"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Worktrees</span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 break-words">
            {worktree.name}
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
            <p className="text-gray-600 dark:text-gray-400 break-words">
              Branch: <span className="font-medium">{worktree.branch}</span>
            </p>
            <span className="hidden sm:inline text-gray-400">•</span>
            <p className={`font-medium ${getStatusColor(worktree)}`}>
              {worktree.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-700 dark:text-red-400">{error}</span>
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

      {/* Worktree Info Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Git Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Git Status</h3>
            <div className={`px-2 py-1 rounded-circle text-xs font-medium self-start sm:self-auto break-words ${
              worktree.status.isClean 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
            }`}>
              {getStatusText(worktree)}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Working Directory:</span>
              <span className={`font-medium ${
                worktree.status.isClean 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {worktree.status.isClean ? 'Clean' : 'Modified'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Modified files:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {worktree.status.modifiedFiles}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Staged files:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {worktree.status.stagedFiles}
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Commits ahead:</span>
                <span className={`font-medium ${
                  worktree.status.aheadCount > 0 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {worktree.status.aheadCount}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600 dark:text-gray-400">Commits behind:</span>
                <span className={`font-medium ${
                  worktree.status.behindCount > 0 
                    ? 'text-orange-600 dark:text-orange-400' 
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {worktree.status.behindCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Linked Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Linked Tasks ({worktree.taskIds.length})
          </h3>
          {worktree.taskIds.length > 0 ? (
            <div className="space-y-3">
              {worktree.taskIds.map((taskId) => {
                const task = tasks.find(t => t.id === taskId);
                return (
                  <div key={taskId} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors duration-200">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 break-words">
                        {getTaskTitle(taskId)}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="break-words">{taskId}</span>
                        {task && (
                          <span className={`inline-block px-2 py-0.5 rounded-circle text-xs font-medium self-start ${
                            task.status === 'Done' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                              : task.status === 'In Progress'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}>
                            {task.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No linked tasks</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                Link tasks to track work in this worktree
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Path Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Worktree Path</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <code className="flex-1 text-sm bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded text-gray-800 dark:text-gray-200 font-mono break-all overflow-hidden">
            {worktree.path}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(worktree.path);
            }}
            className="px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-200 flex-shrink-0 self-start"
            title="Copy path to clipboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* File System Actions */}
          <button
            onClick={() => {
              // Open in file explorer
              if (navigator.platform.includes('Mac')) {
                window.open(`file://${worktree.path}`);
              } else if (navigator.platform.includes('Win')) {
                window.open(`file:///${worktree.path.replace(/\//g, '\\')}`);
              } else {
                window.open(`file://${worktree.path}`);
              }
            }}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>Open Explorer</span>
          </button>
          
          {/* Git Actions - Only for active worktrees */}
          {worktree.isActive && (
            <>
              <button
                onClick={() => handleOperation(handlePull)}
                disabled={isOperating}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4l-8 8h6v8h4v-8h6l-8-8z" />
                </svg>
                <span>Pull</span>
              </button>
              
              <button
                onClick={() => handleOperation(handlePush)}
                disabled={isOperating}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20l8-8h-6V4h-4v8H4l8 8z" />
                </svg>
                <span>Push</span>
              </button>
              
              <button
                onClick={() => handleOperation(handleSync)}
                disabled={isOperating}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Sync</span>
              </button>
            </>
          )}
          
          {/* Delete Action */}
          <button
            onClick={() => onDelete(worktree.id, !worktree.isActive)}
            disabled={isOperating}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>{worktree.isActive ? 'Delete' : 'Cleanup'}</span>
          </button>
        </div>
        
        {isOperating && (
          <div className="mt-4 flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400">
            <div className="animate-spin rounded-circle h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(WorktreeDetailPanel);