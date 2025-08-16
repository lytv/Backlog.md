import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Worktree, Task } from '../../types';
import { apiClient } from '../lib/api';

interface WorktreeSidebarProps {
  worktrees: Worktree[];
  onRefresh: () => Promise<void>;
  isCollapsed?: boolean;
}

const WorktreeSidebar: React.FC<WorktreeSidebarProps> = ({ 
  worktrees, 
  onRefresh,
  isCollapsed = false 
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const allTasks = await apiClient.fetchTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTaskTitle = (taskId: string): string => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.title : taskId;
  };

  const getStatusIcon = (worktree: Worktree) => {
    if (!worktree.isActive) {
      return (
        <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }

    if (!worktree.status.isClean) {
      return (
        <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }

    if (worktree.status.aheadCount > 0 || worktree.status.behindCount > 0) {
      return (
        <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    }

    return (
      <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  };

  const getStatusText = (worktree: Worktree): string => {
    if (!worktree.isActive) return 'Inactive';
    if (!worktree.status.isClean) {
      const changes = worktree.status.modifiedFiles + worktree.status.stagedFiles;
      return `${changes} changes`;
    }
    if (worktree.status.aheadCount > 0) return `+${worktree.status.aheadCount}`;
    if (worktree.status.behindCount > 0) return `-${worktree.status.behindCount}`;
    return 'Clean';
  };

  const activeWorktrees = worktrees.filter(wt => wt.isActive);
  const inactiveWorktrees = worktrees.filter(wt => !wt.isActive);

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center space-y-2">
        {activeWorktrees.slice(0, 3).map((worktree) => (
          <button
            key={worktree.id}
            onClick={() => navigate('/worktrees')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors duration-200 cursor-pointer relative"
            title={`${worktree.name} - ${getStatusText(worktree)}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <div className="absolute -top-1 -right-1">
              {getStatusIcon(worktree)}
            </div>
          </button>
        ))}
        {activeWorktrees.length > 3 && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            +{activeWorktrees.length - 3}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Active Worktrees */}
      {activeWorktrees.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              Active ({activeWorktrees.length})
            </h4>
            <button
              onClick={() => onRefresh()}
              className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors duration-200 cursor-pointer"
              title="Refresh worktrees"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-1">
            {activeWorktrees.map((worktree) => (
              <div
                key={worktree.id}
                className="group p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer"
                onClick={() => navigate('/worktrees')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    {getStatusIcon(worktree)}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {worktree.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {worktree.branch}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {getStatusText(worktree)}
                  </div>
                </div>
                
                {/* Linked Tasks */}
                {worktree.taskIds.length > 0 && (
                  <div className="mt-1 ml-5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {worktree.taskIds.length === 1 ? (
                        <span className="truncate block">
                          Task: {getTaskTitle(worktree.taskIds[0])}
                        </span>
                      ) : (
                        <span>
                          {worktree.taskIds.length} linked tasks
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive Worktrees */}
      {inactiveWorktrees.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500 mb-2">
            Inactive ({inactiveWorktrees.length})
          </h4>
          
          <div className="space-y-1">
            {inactiveWorktrees.slice(0, 3).map((worktree) => (
              <div
                key={worktree.id}
                className="group p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer opacity-60"
                onClick={() => navigate('/worktrees')}
              >
                <div className="flex items-center space-x-2">
                  {getStatusIcon(worktree)}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {worktree.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 truncate">
                      {worktree.branch}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {inactiveWorktrees.length > 3 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 pl-2">
                +{inactiveWorktrees.length - 3} more inactive
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {worktrees.length === 0 && (
        <div className="text-center py-4">
          <svg className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">No worktrees</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Create worktrees from tasks
          </p>
        </div>
      )}
    </div>
  );
};

export default WorktreeSidebar;