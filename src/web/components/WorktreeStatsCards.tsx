import React from 'react';
import type { Worktree } from '../../types';

interface WorktreeStatsCardsProps {
  worktrees: Worktree[];
}

const WorktreeStatsCards: React.FC<WorktreeStatsCardsProps> = ({ worktrees }) => {
  const activeWorktrees = worktrees.filter(wt => wt.isActive);
  const inactiveWorktrees = worktrees.filter(wt => !wt.isActive);
  const modifiedWorktrees = activeWorktrees.filter(wt => !wt.status.isClean);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Worktrees */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{worktrees.length}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total</p>
          </div>
        </div>
      </div>

      {/* Active Worktrees */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeWorktrees.length}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Active</p>
          </div>
        </div>
      </div>

      {/* Modified Worktrees */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{modifiedWorktrees.length}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Modified</p>
          </div>
        </div>
      </div>

      {/* Inactive Worktrees */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center">
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{inactiveWorktrees.length}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Inactive</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(WorktreeStatsCards);