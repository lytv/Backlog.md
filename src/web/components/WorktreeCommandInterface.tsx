import React, { useState, useEffect } from 'react';
import type { Worktree, Task, WorktreeCommand, CommandParameter } from '../../types';
import { apiClient } from '../lib/api';

interface WorktreeCommandInterfaceProps {
  onCommandExecute?: (command: WorktreeCommand, result: any) => void;
  onRefreshData?: () => Promise<void>;
}

interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  data?: any;
}

const WorktreeCommandInterface: React.FC<WorktreeCommandInterfaceProps> = ({
  onCommandExecute,
  onRefreshData
}) => {
  const [selectedCommand, setSelectedCommand] = useState<WorktreeCommand | null>(null);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CommandResult | null>(null);
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [commandHistory, setCommandHistory] = useState<Array<{
    command: WorktreeCommand;
    parameters: Record<string, any>;
    result: CommandResult;
    timestamp: string;
  }>>([]);

  // Predefined worktree commands
  const commands: WorktreeCommand[] = [
    {
      id: 'create-worktree',
      name: 'Create Worktree',
      description: 'Create a new git worktree',
      template: 'git worktree add {path} {branch}',
      category: 'create',
      parameters: [
        {
          name: 'name',
          type: 'string',
          required: true,
          validation: '^[a-zA-Z0-9_-]+$'
        },
        {
          name: 'branch',
          type: 'string',
          required: true
        },
        {
          name: 'basePath',
          type: 'path',
          required: false
        },
        {
          name: 'taskId',
          type: 'select',
          required: false,
          options: []
        }
      ]
    },
    {
      id: 'delete-worktree',
      name: 'Delete Worktree',
      description: 'Delete an existing worktree',
      template: 'git worktree remove {worktree}',
      category: 'delete',
      parameters: [
        {
          name: 'worktreeId',
          type: 'select',
          required: true,
          options: []
        },
        {
          name: 'force',
          type: 'boolean',
          required: false,
          defaultValue: false
        }
      ]
    },
    {
      id: 'merge-worktree',
      name: 'Merge Worktree',
      description: 'Merge worktree branch into target branch',
      template: 'git merge {sourceBranch} into {targetBranch}',
      category: 'merge',
      parameters: [
        {
          name: 'worktreeId',
          type: 'select',
          required: true,
          options: []
        },
        {
          name: 'targetBranch',
          type: 'string',
          required: true,
          defaultValue: 'main'
        }
      ]
    },
    {
      id: 'sync-worktree',
      name: 'Sync Worktree',
      description: 'Push or pull worktree changes',
      template: 'git {operation} in {worktree}',
      category: 'sync',
      parameters: [
        {
          name: 'worktreeId',
          type: 'select',
          required: true,
          options: []
        },
        {
          name: 'operation',
          type: 'select',
          required: true,
          options: ['push', 'pull'],
          defaultValue: 'push'
        }
      ]
    },
    {
      id: 'status-worktree',
      name: 'Check Status',
      description: 'Get status of worktree',
      template: 'git status in {worktree}',
      category: 'status',
      parameters: [
        {
          name: 'worktreeId',
          type: 'select',
          required: true,
          options: []
        }
      ]
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Update command options when data changes
    updateCommandOptions();
  }, [worktrees, tasks]);

  const loadData = async () => {
    try {
      const [worktreesData, tasksData] = await Promise.all([
        apiClient.fetchWorktrees(),
        apiClient.fetchTasks()
      ]);
      setWorktrees(worktreesData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const updateCommandOptions = () => {
    // Update worktree options
    const worktreeOptions = worktrees.map(wt => wt.id);
    const taskOptions = tasks.map(task => task.id);

    commands.forEach(cmd => {
      cmd.parameters.forEach(param => {
        if (param.name === 'worktreeId') {
          param.options = worktreeOptions;
        } else if (param.name === 'taskId') {
          param.options = taskOptions;
        }
      });
    });
  };

  const handleCommandSelect = (command: WorktreeCommand) => {
    setSelectedCommand(command);
    setParameters({});
    setResult(null);
    
    // Set default values
    const defaultParams: Record<string, any> = {};
    command.parameters.forEach(param => {
      if (param.defaultValue !== undefined) {
        defaultParams[param.name] = param.defaultValue;
      }
    });
    setParameters(defaultParams);
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const validateParameters = (): string[] => {
    if (!selectedCommand) return ['No command selected'];
    
    const errors: string[] = [];
    
    selectedCommand.parameters.forEach(param => {
      const value = parameters[param.name];
      
      if (param.required && (!value || value === '')) {
        errors.push(`${param.name} is required`);
      }
      
      if (value && param.validation) {
        const regex = new RegExp(param.validation);
        if (!regex.test(value)) {
          errors.push(`${param.name} format is invalid`);
        }
      }
    });
    
    return errors;
  };

  const executeCommand = async () => {
    if (!selectedCommand) return;
    
    const validationErrors = validateParameters();
    if (validationErrors.length > 0) {
      setResult({
        success: false,
        error: validationErrors.join(', ')
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      let commandResult: CommandResult;

      switch (selectedCommand.id) {
        case 'create-worktree':
          const createData = {
            name: parameters.name,
            branch: parameters.branch,
            baseBranch: parameters.branch,
            basePath: parameters.basePath,
            taskId: parameters.taskId
          };
          const newWorktree = await apiClient.createWorktree(createData);
          commandResult = {
            success: true,
            output: `Worktree "${newWorktree.name}" created successfully at ${newWorktree.path}`,
            data: newWorktree
          };
          break;

        case 'delete-worktree':
          await apiClient.deleteWorktree(parameters.worktreeId, parameters.force);
          commandResult = {
            success: true,
            output: `Worktree deleted successfully`
          };
          break;

        case 'merge-worktree':
          const mergeResult = await apiClient.mergeWorktree(parameters.worktreeId, parameters.targetBranch);
          commandResult = {
            success: mergeResult.success,
            output: mergeResult.message,
            data: mergeResult
          };
          break;

        case 'sync-worktree':
          if (parameters.operation === 'push') {
            await apiClient.pushWorktree(parameters.worktreeId);
            commandResult = {
              success: true,
              output: 'Worktree pushed successfully'
            };
          } else {
            await apiClient.pullWorktree(parameters.worktreeId);
            commandResult = {
              success: true,
              output: 'Worktree pulled successfully'
            };
          }
          break;

        case 'status-worktree':
          const status = await apiClient.getWorktreeStatus(parameters.worktreeId);
          commandResult = {
            success: true,
            output: `Status: ${status.isClean ? 'Clean' : 'Modified'} (${status.modifiedFiles} modified, ${status.stagedFiles} staged)`,
            data: status
          };
          break;

        default:
          throw new Error(`Unknown command: ${selectedCommand.id}`);
      }

      setResult(commandResult);
      
      // Add to history
      setCommandHistory(prev => [{
        command: selectedCommand,
        parameters: { ...parameters },
        result: commandResult,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]); // Keep last 10 commands

      // Refresh data if successful
      if (commandResult.success && onRefreshData) {
        await onRefreshData();
        await loadData();
      }

      // Notify parent
      if (onCommandExecute) {
        onCommandExecute(selectedCommand, commandResult);
      }

    } catch (error: any) {
      const errorResult: CommandResult = {
        success: false,
        error: error.message || 'Command execution failed'
      };
      setResult(errorResult);
      
      // Add error to history
      setCommandHistory(prev => [{
        command: selectedCommand,
        parameters: { ...parameters },
        result: errorResult,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderParameterInput = (param: CommandParameter) => {
    const value = parameters[param.name] || '';

    switch (param.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-200"
            disabled={isLoading}
          >
            <option value="">Select {param.name}</option>
            {param.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleParameterChange(param.name, e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              disabled={isLoading}
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {param.name}
            </span>
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            placeholder={`Enter ${param.name}`}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-200"
            disabled={isLoading}
          />
        );
    }
  };

  const getWorktreeName = (worktreeId: string): string => {
    const worktree = worktrees.find(wt => wt.id === worktreeId);
    return worktree ? worktree.name : worktreeId;
  };

  return (
    <div className="space-y-6">
      {/* Command Selection */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Select Command
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {commands.map(command => (
            <button
              key={command.id}
              onClick={() => handleCommandSelect(command)}
              className={`p-3 text-left rounded-lg border transition-colors duration-200 ${
                selectedCommand?.id === command.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="font-medium text-sm">{command.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {command.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Parameters Form */}
      {selectedCommand && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Parameters for "{selectedCommand.name}"
          </h4>
          <div className="space-y-4">
            {selectedCommand.parameters.map(param => (
              <div key={param.name}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {param.name}
                  {param.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderParameterInput(param)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execute Button */}
      {selectedCommand && (
        <div className="flex justify-end">
          <button
            onClick={executeCommand}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-400 dark:focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Executing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Execute Command
              </>
            )}
          </button>
        </div>
      )}

      {/* Command Result */}
      {result && (
        <div className={`p-4 rounded-lg border ${
          result.success
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {result.success ? (
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L10 10.414l1.707-1.707a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium">
                {result.success ? 'Command executed successfully' : 'Command failed'}
              </h4>
              {(result.output || result.error) && (
                <div className="mt-2 text-sm">
                  <pre className="whitespace-pre-wrap font-mono">
                    {result.output || result.error}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Command History */}
      {commandHistory.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Recent Commands
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {commandHistory.map((entry, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {entry.command.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {Object.entries(entry.parameters).map(([key, value]) => (
                    <span key={key} className="mr-3">
                      {key}: {String(value)}
                    </span>
                  ))}
                </div>
                <div className={`text-xs mt-1 ${
                  entry.result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {entry.result.success ? '✓' : '✗'} {entry.result.output || entry.result.error}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorktreeCommandInterface;