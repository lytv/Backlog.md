import React, { useState, useEffect } from 'react';
import type { Worktree, MergeResult } from '../../types';
import { apiClient } from '../lib/api';

interface MergeInterfaceProps {
  worktree: Worktree;
  onMergeComplete?: (result: MergeResult) => void;
  onCancel?: () => void;
}

const MergeInterface: React.FC<MergeInterfaceProps> = ({
  worktree,
  onMergeComplete,
  onCancel
}) => {
  const [targetBranch, setTargetBranch] = useState('main');
  const [isLoading, setIsLoading] = useState(false);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [availableBranches, setAvailableBranches] = useState<string[]>(['main', 'develop', 'master']);

  useEffect(() => {
    // In a real implementation, we would fetch available branches from git
    // For now, we'll use common branch names
    setAvailableBranches(['main', 'develop', 'master', 'staging', 'production']);
  }, []);

  const handleMerge = async () => {
    if (!targetBranch.trim()) {
      return;
    }

    setIsLoading(true);
    setMergeResult(null);

    try {
      const result = await apiClient.mergeWorktree(worktree.id, targetBranch);
      setMergeResult(result);
      
      if (onMergeComplete) {
        onMergeComplete(result);
      }
    } catch (error: any) {
      setMergeResult({
        success: false,
        message: error.message || 'Merge operation failed',
        suggestions: ['Check network connectivity', 'Verify repository access']
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderConflictDetails = () => {
    if (!mergeResult?.conflicts || mergeResult.conflicts.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
          Merge Conflicts Detected
        </h4>
        <div className="space-y-2">
          {mergeResult.conflicts.map((file, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <code className="text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-800/30 px-2 py-1 rounded">
                {file}
              </code>
              {mergeResult.conflictDetails && (
                <span className="text-yellow-600 dark:text-yellow-400 text-xs">
                  ({mergeResult.conflictDetails.find(c => c.file === file)?.status || 'conflict'})
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSuggestions = () => {
    if (!mergeResult?.suggestions || mergeResult.suggestions.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          Suggested Actions
        </h4>
        <ul className="space-y-1">
          {mergeResult.suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start space-x-2 text-sm text-blue-700 dark:text-blue-300">
              <span className="text-blue-500 dark:text-blue-400 mt-0.5">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderMergedFiles = () => {
    if (!mergeResult?.success || !mergeResult.mergedFiles || mergeResult.mergedFiles.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
          Files Merged ({mergeResult.mergedFiles.length})
        </h4>
        <div className="max-h-32 overflow-y-auto">
          {mergeResult.mergedFiles.map((file, index) => (
            <div key={index} className="text-sm text-green-700 dark:text-green-300">
              <code className="bg-green-100 dark:bg-green-800/30 px-2 py-1 rounded text-xs">
                {file}
              </code>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Merge Worktree
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Merge branch "{worktree.branch}" into target branch
        </p>
      </div>

      {/* Merge Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Source Branch
          </label>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <code className="text-sm font-mono text-gray-900 dark:text-gray-100">
                {worktree.branch}
              </code>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                (from {worktree.name})
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Branch
          </label>
          <div className="flex space-x-2">
            <select
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              disabled={isLoading}
            >
              {availableBranches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
            <input
              type="text"
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              placeholder="Or enter custom branch"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Merge Preview */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Merge Preview
        </h4>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <code className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
            {worktree.branch}
          </code>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <code className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded">
            {targetBranch}
          </code>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          This will merge all changes from {worktree.branch} into {targetBranch}
        </p>
      </div>

      {/* Worktree Status Warning */}
      {!worktree.status.isClean && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Uncommitted Changes
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                This worktree has {worktree.status.modifiedFiles} modified and {worktree.status.stagedFiles} staged files. 
                Consider committing these changes before merging.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleMerge}
          disabled={isLoading || !targetBranch.trim() || targetBranch === worktree.branch}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Merging...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Start Merge
            </>
          )}
        </button>
      </div>

      {/* Merge Result */}
      {mergeResult && (
        <div className={`p-4 rounded-lg border ${
          mergeResult.success
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 mt-0.5">
              {mergeResult.success ? (
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L10 10.414l1.707-1.707a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h4 className={`text-sm font-medium ${
                mergeResult.success 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {mergeResult.success ? 'Merge Successful' : 'Merge Failed'}
              </h4>
              <p className={`text-sm mt-1 ${
                mergeResult.success 
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {mergeResult.message}
              </p>
            </div>
          </div>

          {renderConflictDetails()}
          {renderMergedFiles()}
          {renderSuggestions()}
        </div>
      )}
    </div>
  );
};

export default MergeInterface;