import React from 'react';
import type { Worktree, Task } from '../../types';

interface WorktreeOverviewProps {
  worktrees: Worktree[];
  tasks: Task[];
  onWorktreeSelect: (worktree: Worktree) => void;
  onDeleteWorktree: (worktreeId: string, force?: boolean) => Promise<void>;
  onSwitchToCommands: () => void;
  isFiltered?: boolean;
  isOperating?: boolean;
}

const WorktreeOverview: React.FC<WorktreeOverviewProps> = ({
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
    return task ? task.title : taskId;
  };

  const getStatusIcon = (worktree: Worktree) => {
    if (!worktree.isActive) {
      return <span className="w-3 h-3 bg-gray-400 rounded-circle"></span>;
    }
    if (!worktree.status.isClean) {
      return <span className="w-3 h-3 bg-yellow-500 rounded-circle"></span>;
    }
    if (worktree.status.aheadCount > 0 || worktree.status.behindCount > 0) {
      return <span className="w-3 h-3 bg-blue-500 rounded-circle"></span>;
    }
    return <span className="w-3 h-3 bg-green-500 rounded-circle"></span>;
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

  const activeWorktrees = worktrees.filter(wt => wt.isActive);
  const inactiveWorktrees = worktrees.filter(wt => !wt.isActive);

  return (
    <div className={`space-y-6 transition-opacity duration-200 ${isOperating ? 'opacity-75 pointer-events-none' : ''}`}>
      {/* Active Worktrees */}
      {activeWorktrees.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Active Worktrees ({activeWorktrees.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeWorktrees.map((worktree) => (
              <ActiveWorktreeCard
                key={worktree.id}
                worktree={worktree}
                tasks={tasks}
                getTaskTitle={getTaskTitle}
                getStatusIcon={getStatusIcon}
                getStatusText={getStatusText}
                onWorktreeSelect={onWorktreeSelect}
                onDeleteWorktree={onDeleteWorktree}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Worktrees */}
      {inactiveWorktrees.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Inactive Worktrees ({inactiveWorktrees.length})
          </h2>
          <div className="space-y-2">
            {inactiveWorktrees.map((worktree) => (
              <InactiveWorktreeCard
                key={worktree.id}
                worktree={worktree}
                getStatusIcon={getStatusIcon}
                onDeleteWorktree={onDeleteWorktree}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {worktrees.length === 0 && (
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
      )}
    </div>
  );
};

// Active Worktree Card Component
interface ActiveWorktreeCardProps {
  worktree: Worktree;
  tasks: Task[];
  getTaskTitle: (taskId: string) => string;
  getStatusIcon: (worktree: Worktree) => JSX.Element;
  getStatusText: (worktree: Worktree) => string;
  onWorktreeSelect: (worktree: Worktree) => void;
  onDeleteWorktree: (worktreeId: string, force?: boolean) => Promise<void>;
}

const ActiveWorktreeCard: React.FC<ActiveWorktreeCardProps> = ({
  worktree,
  tasks,
  getTaskTitle,
  getStatusIcon,
  getStatusText,
  onWorktreeSelect,
  onDeleteWorktree
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 min-w-0">
      <div className="flex items-start mb-4">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {getStatusIcon(worktree)}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 break-words">
              {worktree.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 break-words">
              {worktree.branch}
            </p>
          </div>
        </div>
      </div>

      {/* Linked Tasks */}
      {worktree.taskIds.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Linked Tasks:
          </p>
          <div className="space-y-1">
            {worktree.taskIds.map((taskId) => (
              <div key={taskId} className="text-sm text-blue-600 dark:text-blue-400 break-words">
                {taskId}: {getTaskTitle(taskId)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Path */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Path:
        </p>
        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200 break-all overflow-wrap-anywhere">
          {worktree.path}
        </code>
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={() => onWorktreeSelect(worktree)}
          className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
        >
          View Details
        </button>
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
          className="px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-200"
        >
          Open
        </button>
        <button
          onClick={() => onDeleteWorktree(worktree.id, false)}
          className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

// Inactive Worktree Card Component
interface InactiveWorktreeCardProps {
  worktree: Worktree;
  getStatusIcon: (worktree: Worktree) => JSX.Element;
  onDeleteWorktree: (worktreeId: string, force?: boolean) => Promise<void>;
}

const InactiveWorktreeCard: React.FC<InactiveWorktreeCardProps> = ({
  worktree,
  getStatusIcon,
  onDeleteWorktree
}) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 opacity-75">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon(worktree)}
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {worktree.name}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              ({worktree.branch})
            </span>
          </div>
        </div>
        <button
          onClick={() => onDeleteWorktree(worktree.id, true)}
          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200"
        >
          Cleanup
        </button>
      </div>
    </div>
  );
};

export default React.memo(WorktreeOverview);