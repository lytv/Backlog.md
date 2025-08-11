import React, { useState, useEffect } from 'react';
import { type Task } from '../../types';
import ChipInput from './ChipInput';
import DependencyInput from './DependencyInput';
import TmuxTerminal from './TmuxTerminal';
import { apiClient } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
// MDEditor will be passed as prop

interface TaskFormProps {
  task?: Task;
  onSubmit: (taskData: Partial<Task>) => void;
  onCancel: () => void;
  onArchive?: () => void;
  availableStatuses: string[];
  MDEditor: React.ComponentType<any>;
}

const TaskForm: React.FC<TaskFormProps> = ({ 
  task, 
  onSubmit, 
  onCancel, 
  onArchive,
  availableStatuses,
  MDEditor
}) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    title: task?.title || '',
    body: task?.body || '',
    status: task?.status || availableStatuses[0] || '',
    assignee: task?.assignee || [],
    labels: task?.labels || [],
    dependencies: task?.dependencies || [],
    priority: task?.priority || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);
  const [showClaudeCommand, setShowClaudeCommand] = useState(false);
  const [activeClaudeTab, setActiveClaudeTab] = useState<'send' | 'results'>('send');

  // Load available tasks for dependency selection
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const tasks = await apiClient.fetchTasks();
        setAvailableTasks(tasks);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }
    };
    loadTasks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const taskData: Partial<Task> = {
        title: formData.title.trim(),
        body: formData.body.trim(),
        status: formData.status,
        assignee: formData.assignee,
        labels: formData.labels,
        dependencies: formData.dependencies,
        priority: formData.priority as 'high' | 'medium' | 'low' | undefined,
      };

      // Remove empty priority
      if (!taskData.priority) {
        delete taskData.priority;
      }

      await onSubmit(taskData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArchiveClick = () => {
    setShowArchiveConfirm(true);
  };

  const handleArchiveConfirm = () => {
    if (onArchive) {
      onArchive();
    }
    setShowArchiveConfirm(false);
  };

  const handleArchiveCancel = () => {
    setShowArchiveConfirm(false);
  };

  const isValid = formData.title.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
          Title *
        </label>
        <input
          id="task-title"
          type="text"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 focus:border-transparent transition-colors duration-200"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Enter task title"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
          Content
        </label>
        <MDEditor
          value={formData.body}
          onChange={(value: string | undefined) => handleChange('body', value || '')}
          preview="edit"
          hideToolbar={false}
          data-color-mode={theme}
          height={200}
        />
      </div>

      {/* Collapsible Metadata Section */}
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg transition-colors duration-200">
        <button
          type="button"
          onClick={() => setShowMetadata(!showMetadata)}
          className={`w-full flex items-center justify-between p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 ${showMetadata ? 'rounded-t-lg' : 'rounded-lg'}`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Task Metadata
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({showMetadata ? 'Click to hide' : 'Click to show'})
            </span>
          </div>
          <svg 
            className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${showMetadata ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showMetadata && (
          <div className="p-4 space-y-4 border-t border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="task-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
                  Status
                </label>
                <select
                  id="task-status"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 focus:border-transparent transition-colors duration-200"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  {availableStatuses.map(status => (
                    <option key={status} value={status} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
                  Priority
                </label>
                <select
                  id="task-priority"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 focus:border-transparent transition-colors duration-200"
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                >
                  <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">No Priority</option>
                  <option value="low" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Low</option>
                  <option value="medium" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Medium</option>
                  <option value="high" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">High</option>
                </select>
              </div>
            </div>

            <ChipInput
              name="assignee"
              label="Assignee(s)"
              value={formData.assignee}
              onChange={(value) => handleChange('assignee', value)}
              placeholder="Type name and press Enter or comma"
            />

            <ChipInput
              name="labels"
              label="Labels"
              value={formData.labels}
              onChange={(value) => handleChange('labels', value)}
              placeholder="Type label and press Enter or comma"
            />

            <DependencyInput
              value={formData.dependencies}
              onChange={(value) => handleChange('dependencies', value)}
              availableTasks={availableTasks}
              currentTaskId={task?.id}
            />
          </div>
        )}
      </div>

      {/* Collapsible Claude Code Command Section - only show when editing existing task */}
      {task && (
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg transition-colors duration-200">
          <button
            type="button"
            onClick={() => setShowClaudeCommand(!showClaudeCommand)}
            className={`w-full flex items-center justify-between p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 ${showClaudeCommand ? 'rounded-t-lg' : 'rounded-lg'}`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Send Command to Claude Code
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({showClaudeCommand ? 'Click to hide' : 'Click to show'})
              </span>
            </div>
            <svg 
              className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${showClaudeCommand ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showClaudeCommand && (
            <div className="border-t border-gray-200 dark:border-gray-600">
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={() => setActiveClaudeTab('send')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                    activeClaudeTab === 'send'
                      ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Command
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveClaudeTab('results')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                    activeClaudeTab === 'results'
                      ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Results
                  </div>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                <TmuxTerminal activeTab={activeClaudeTab} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div>
          {/* Archive button - only show when editing existing task */}
          {task && onArchive && (
            <button
              type="button"
              onClick={handleArchiveClick}
              className="inline-flex items-center px-4 py-2 bg-red-500 dark:bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-600 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-red-400 dark:focus:ring-red-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              disabled={isSubmitting}
            >
              Archive Task
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-gray-400 dark:focus:ring-gray-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-400 dark:focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </div>

      {/* Archive Confirmation Dialog */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-60 flex items-center justify-center z-50 transition-colors duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 transition-colors duration-200">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 transition-colors duration-200">
              Archive Task
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 transition-colors duration-200">
              Are you sure you want to archive "{task?.title}"? This will move the task to the archive folder.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleArchiveCancel}
                className="inline-flex items-center px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-gray-400 dark:focus:ring-gray-500 transition-colors duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveConfirm}
                className="inline-flex items-center px-4 py-2 bg-red-500 dark:bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-600 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-red-400 dark:focus:ring-red-500 transition-colors duration-200 cursor-pointer"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default TaskForm;