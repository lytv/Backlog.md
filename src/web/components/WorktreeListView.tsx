import React from 'react';
import type { Worktree, Task } from '../../types';

interface WorktreeListViewProps {
  worktrees: Worktree[];
  tasks: Task[];
  onWorktreeSelect: (worktree: Worktree) => void;
  onDeleteWorktree: (worktreeId: string, force?: boolean) => Promise<void>;
  onSwitchToCommands: () => void;
  isFiltered?: boolean;
  isOperating?: boolean;
}

const WorktreeListView: React.FC<WorktreeListViewProps> = ({
  worktrees,
  tasks,
  onWorktreeSelect,
  onDeleteWorktree,
  onSwitchToCommands,
  isFiltered = false,
  isOperating = false
}) => {
  const getTaskTitle = (taskId: string): string => {
    const task = tasks.find(t => t.id === taskId);
    return task && task.title ? task.title : taskId;
  };

  const getStatusBadge = (worktree: Worktree) => {
    if (!worktree || !worktree.isActive) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-circle text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
          <span className="w-2 h-2 bg-gray-400 rounded-circle mr-1"></span>
          Inactive
        </span>
      );
    }
    
    if (!worktree.status || !worktree.status.isClean) {
      const modifiedFiles = worktree.status?.modifiedFiles || 0;
      const stagedFiles = worktree.status?.stagedFiles || 0;
      const changes = modifiedFiles + stagedFiles;
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-circle text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
          <span className="w-2 h-2 bg-yellow-500 rounded-circle mr-1"></span>
          {changes} changes
        </span>
      );
    }
    
    const aheadCount = worktree.status?.aheadCount || 0;
    const behindCount = worktree.status?.behindCount || 0;
    
    if (aheadCount > 0 || behindCount > 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-circle text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
          <span className="w-2 h-2 bg-blue-500 rounded-circle mr-1"></span>
          {aheadCount > 0 && `+${aheadCount}`} {behindCount > 0 && `-${behindCount}`}
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-circle text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
        <span className="w-2 h-2 bg-green-500 rounded-circle mr-1"></span>
        Clean
      </span>
    );
  };

  const activeWorktrees = worktrees.filter(wt => wt && wt.isActive);
  const inactiveWorktrees = worktrees.filter(wt => wt && !wt.isActive);

  if (worktrees.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No worktrees found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {isFiltered 
            ? "No worktrees match your current search criteria"
            : "Create worktrees from tasks to get started with parallel development"
          }
        </p>
        <button
          onClick={onSwitchToCommands}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Worktree
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 transition-opacity duration-200 ${isOperating ? 'opacity-75 pointer-events-none' : ''}`}>
      {/* Active Worktrees */}
      {activeWorktrees.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Active Worktrees ({activeWorktrees.length})
          </h2>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name & Branch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Linked Tasks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Path
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {activeWorktrees.map((worktree) => (
                    <tr key={worktree.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                            {worktree.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 break-words">
                            {worktree.branch}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(worktree)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {worktree.taskIds.length > 0 ? (
                            worktree.taskIds.slice(0, 2).map((taskId) => (
                              <div key={taskId} className="text-sm text-blue-600 dark:text-blue-400 break-words">
                                {taskId}: {getTaskTitle(taskId)}
                              </div>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">No linked tasks</span>
                          )}
                          {worktree.taskIds.length > 2 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              +{worktree.taskIds.length - 2} more...
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200 break-all">
                          {worktree.path}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => onWorktreeSelect(worktree)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                          >
                            View
                          </button>
                          <button
                            onClick={() => {
                              if (navigator.platform.includes('Mac')) {
                                window.open(`file://${worktree.path}`);
                              } else if (navigator.platform.includes('Win')) {
                                window.open(`file:///${worktree.path.replace(/\//g, '\\')}`);
                              } else {
                                window.open(`file://${worktree.path}`);
                              }
                            }}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => onDeleteWorktree(worktree.id, false)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inactive Worktrees */}
      {inactiveWorktrees.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Inactive Worktrees ({inactiveWorktrees.length})
          </h2>
          
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name & Branch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-50 dark:bg-gray-800/50 divide-y divide-gray-200 dark:divide-gray-700">
                  {inactiveWorktrees.map((worktree) => (
                    <tr key={worktree.id} className="opacity-75">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 break-words">
                            {worktree.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 break-words">
                            {worktree.branch}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(worktree)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => onDeleteWorktree(worktree.id, true)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                        >
                          Cleanup
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(WorktreeListView);