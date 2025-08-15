import React, { useState, useEffect } from 'react';
import type { Task, Worktree } from '../../types';
import { apiClient } from '../lib/api';

interface WorktreeButtonProps {
  task: Task;
  onWorktreeCreated?: (worktree: Worktree) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const WorktreeButton: React.FC<WorktreeButtonProps> = ({ 
  task, 
  onWorktreeCreated, 
  className = '',
  size = 'sm'
}) => {
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load worktrees linked to this task
  useEffect(() => {
    loadTaskWorktrees();
  }, [task.id]);

  const loadTaskWorktrees = async () => {
    try {
      setIsLoading(true);
      const allWorktrees = await apiClient.fetchWorktrees();
      const taskWorktrees = allWorktrees.filter(wt => wt.taskIds.includes(task.id));
      setWorktrees(taskWorktrees);
    } catch (error) {
      console.error('Failed to load task worktrees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorktree = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setIsCreating(true);
      setError(null);

      // Get current branch
      const currentBranch = await getCurrentBranch();
      
      // Generate worktree name from task title
      const worktreeName = generateWorktreeName(task.title);
      
      // Create a feature branch name for the worktree to avoid conflicts
      // Use lowercase for branch name (git convention) but keep worktree name in original format
      const featureBranchName = `feature/${worktreeName.toLowerCase()}`;

      const worktreeDto = {
        name: worktreeName,
        branch: featureBranchName,
        baseBranch: currentBranch,
        taskId: task.id,
        description: `Worktree for task: ${task.title}`,
        tags: ['task', task.priority || 'normal'].filter(Boolean)
      };

      const newWorktree = await apiClient.createWorktree(worktreeDto);
      setWorktrees([...worktrees, newWorktree]);
      onWorktreeCreated?.(newWorktree);
      
      // Clear any previous errors on success
      setError(null);
    } catch (error: any) {
      console.error('Failed to create worktree:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to create worktree';
      if (error.message) {
        if (error.message.includes('already used by worktree')) {
          errorMessage = 'Branch is already used by another worktree';
        } else if (error.message.includes('does not exist')) {
          errorMessage = 'Branch does not exist';
        } else if (error.message.includes('permission denied')) {
          errorMessage = 'Permission denied - check file system permissions';
        } else if (error.message.includes('not a git repository')) {
          errorMessage = 'Not a git repository';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenWorktree = (e: React.MouseEvent, worktree: Worktree) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Open worktree in file explorer or IDE
    if (navigator.platform.includes('Mac')) {
      // macOS
      window.open(`file://${worktree.path}`);
    } else if (navigator.platform.includes('Win')) {
      // Windows
      window.open(`file:///${worktree.path.replace(/\//g, '\\')}`);
    } else {
      // Linux/Unix
      window.open(`file://${worktree.path}`);
    }
  };

  const getCurrentBranch = async (): Promise<string> => {
    try {
      // Try to get current branch from git
      const response = await fetch('/api/bash/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: 'git branch --show-current',
          workingDirectory: '.'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.output.trim()) {
          return result.output.trim();
        }
      }
    } catch (error) {
      console.warn('Failed to get current branch:', error);
    }
    
    // Fallback to 'main'
    return 'main';
  };

  const generateWorktreeName = (title: string): string => {
    // Keep original case and format, just clean up for filesystem
    return title
      .replace(/[^a-zA-Z0-9\s_-]/g, '') // Remove special characters but keep underscores
      .replace(/\s+/g, '_') // Replace spaces with underscores to match original format
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .substring(0, 50); // Limit length
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'md':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-2 py-1 text-xs';
    }
  };

  const activeWorktrees = worktrees.filter(wt => wt.isActive);
  const hasActiveWorktrees = activeWorktrees.length > 0;

  if (isLoading) {
    return (
      <div className={`inline-flex items-center ${getSizeClasses()} bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded transition-colors duration-200 ${className}`}>
        <svg className="w-3 h-3 animate-spin mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Loading...
      </div>
    );
  }

  if (hasActiveWorktrees) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        {activeWorktrees.length === 1 ? (
          <button
            onClick={(e) => handleOpenWorktree(e, activeWorktrees[0])}
            className={`inline-flex items-center ${getSizeClasses()} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors duration-200 cursor-pointer`}
            title={`Open worktree: ${activeWorktrees[0].name}`}
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Worktree
          </button>
        ) : (
          <div className="relative">
            <button
              className={`inline-flex items-center ${getSizeClasses()} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors duration-200 cursor-pointer`}
              title={`${activeWorktrees.length} active worktrees`}
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {activeWorktrees.length} Worktrees
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      <button
        onClick={handleCreateWorktree}
        disabled={isCreating}
        className={`inline-flex items-center ${getSizeClasses()} ${
          isCreating
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 cursor-pointer'
        } rounded transition-colors duration-200`}
        title="Create worktree for this task"
      >
        {isCreating ? (
          <>
            <svg className="w-3 h-3 animate-spin mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Creating...
          </>
        ) : (
          <>
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Worktree
          </>
        )}
      </button>
      
      {error && (
        <div className="ml-2 flex items-center space-x-1">
          <div className="relative group">
            <div className="text-red-500 dark:text-red-400 text-xs cursor-help">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 max-w-xs">
              {error}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setError(null);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
            title="Clear error"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default WorktreeButton;