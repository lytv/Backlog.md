import React from 'react';
import WorktreeCommandInterface from './WorktreeCommandInterface';

interface WorktreeCommandsPanelProps {
  onCommandExecute: (command: any, result: any) => void;
  onRefreshData: () => Promise<void>;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const WorktreeCommandsPanel: React.FC<WorktreeCommandsPanelProps> = ({
  onCommandExecute,
  onRefreshData,
  onShowToast
}) => {
  
  const handleCommandExecute = (command: any, result: any) => {
    onCommandExecute(command, result);
    
    if (onShowToast) {
      if (result.success) {
        onShowToast(`Command "${command.name}" executed successfully`, 'success');
      } else {
        onShowToast(`Command "${command.name}" failed: ${result.message || 'Unknown error'}`, 'error');
      }
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Worktree Commands
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Create, manage, and configure your git worktrees
        </p>
      </div>

      {/* Command Interface */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <WorktreeCommandInterface
          onCommandExecute={handleCommandExecute}
          onRefreshData={onRefreshData}
        />
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          Quick Tips
        </h3>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Create worktrees from existing tasks to work on features in parallel</span>
          </div>
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Each worktree maintains its own working directory and branch state</span>
          </div>
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Use the overview tab to monitor status and manage existing worktrees</span>
          </div>
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Clean up inactive worktrees regularly to save disk space</span>
          </div>
        </div>
      </div>

      {/* Common Commands Reference */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Common Worktree Commands
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Creation</h4>
            <div className="space-y-1 text-gray-600 dark:text-gray-400">
              <div><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">git worktree add</code> - Create new worktree</div>
              <div><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">git worktree add -b</code> - Create with new branch</div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Management</h4>
            <div className="space-y-1 text-gray-600 dark:text-gray-400">
              <div><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">git worktree list</code> - List all worktrees</div>
              <div><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">git worktree remove</code> - Remove worktree</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorktreeCommandsPanel;