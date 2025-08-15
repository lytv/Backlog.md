import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import BoardPage from './components/BoardPage';
import DocumentationDetail from './components/DocumentationDetail';
import MilestoneDetail from './components/MilestoneDetail';
import SprintDetail from './components/SprintDetail';
import DecisionDetail from './components/DecisionDetail';
import TaskList from './components/TaskList';
import DraftsList from './components/DraftsList';
import Settings from './components/Settings';
import Statistics from './components/Statistics';
import Modal from './components/Modal';
import TaskForm from './components/TaskForm';
import { SuccessToast } from './components/SuccessToast';
import { ThemeProvider } from './contexts/ThemeContext';
import { type Task, type Document, type Decision, type Milestone, type Sprint, type Worktree } from '../types';
import { apiClient } from './lib/api';
import { useHealthCheckContext } from './contexts/HealthCheckContext';
import { getWebVersion } from './utils/version';
import MDEditor from '@uiw/react-md-editor';

function App() {
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [projectName, setProjectName] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [taskConfirmation, setTaskConfirmation] = useState<{task: Task, isDraft: boolean} | null>(null);
  
  // Centralized data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { isOnline } = useHealthCheckContext();
  const previousOnlineRef = useRef<boolean | null>(null);
  const hasBeenRunningRef = useRef(false);

  // Set version data attribute on body
  React.useEffect(() => {
    getWebVersion().then(version => {
      if (version) {
        document.body.setAttribute('data-version', `Backlog.md - v${version}`);
      }
    });
  }, []);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [statusesData, configData, tasksData, docsData, milestonesData, sprintsData, decisionsData] = await Promise.all([
          apiClient.fetchStatuses(),
          apiClient.fetchConfig(),
          apiClient.fetchTasks(),
          apiClient.fetchDocs(),
          apiClient.fetchMilestones(),
          apiClient.fetchSprints(),
          apiClient.fetchDecisions()
        ]);
        
        setStatuses(statusesData);
        setProjectName(configData.projectName);
        setTasks(tasksData);
        setDocs(docsData);
        setMilestones(milestonesData);
        setSprints(sprintsData);
        setDecisions(decisionsData);

        // Load worktrees separately with error handling
        try {
          const worktreesData = await apiClient.fetchWorktrees();
          setWorktrees(worktreesData);
        } catch (error) {
          console.warn('Failed to load worktrees:', error);
          setWorktrees([]); // Set empty array as fallback
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Reload data when connection is restored
  React.useEffect(() => {
    if (isOnline && previousOnlineRef.current === false) {
      // Connection restored, reload data
      const loadData = async () => {
        try {
          const [tasksData, docsData, milestonesData, sprintsData, decisionsData] = await Promise.all([
            apiClient.fetchTasks(),
            apiClient.fetchDocs(),
            apiClient.fetchMilestones(),
            apiClient.fetchSprints(),
            apiClient.fetchDecisions()
          ]);
          
          setTasks(tasksData);
          setDocs(docsData);
          setMilestones(milestonesData);
          setSprints(sprintsData);
          setDecisions(decisionsData);

          // Load worktrees separately with error handling
          try {
            const worktreesData = await apiClient.fetchWorktrees();
            setWorktrees(worktreesData);
          } catch (error) {
            console.warn('Failed to reload worktrees:', error);
            // Keep existing worktrees data on reload failure
          }
        } catch (error) {
          console.error('Failed to reload data:', error);
        }
      };
      loadData();
    }
  }, [isOnline]);

  // Update document title when project name changes
  React.useEffect(() => {
    if (projectName) {
      document.title = `${projectName} - Task Management`;
    }
  }, [projectName]);

  // Mark that we've been running after initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      hasBeenRunningRef.current = true;
    }, 2000); // Wait 2 seconds after page load
    return () => clearTimeout(timer);
  }, []);

  // Show success toast when connection is restored
  useEffect(() => {
    // Only show toast if:
    // 1. We went from offline to online AND
    // 2. We've been running for a while (not initial page load)
    if (isOnline && previousOnlineRef.current === false && hasBeenRunningRef.current) {
      setShowSuccessToast(true);
      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
    
    // Update the ref for next time
    previousOnlineRef.current = isOnline;
  }, [isOnline]);

  const handleNewTask = () => {
    setEditingTask(null);
    setIsDraftMode(false);
    setShowModal(true);
  };

  const handleNewDraft = () => {
    // Create a draft task (same as new task but with status 'Draft')
    setEditingTask(null);
    setIsDraftMode(true);
    setShowModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setIsDraftMode(false);
  };

  const refreshData = async () => {
    try {
      const [tasksData, docsData, milestonesData, sprintsData, decisionsData] = await Promise.all([
        apiClient.fetchTasks(),
        apiClient.fetchDocs(),
        apiClient.fetchMilestones(),
        apiClient.fetchSprints(),
        apiClient.fetchDecisions()
      ]);
      
      setTasks(tasksData);
      setDocs(docsData);
      setMilestones(milestonesData);
      setSprints(sprintsData);
      setDecisions(decisionsData);

      // Load worktrees separately with error handling
      try {
        const worktreesData = await apiClient.fetchWorktrees();
        setWorktrees(worktreesData);
      } catch (error) {
        console.warn('Failed to refresh worktrees:', error);
        // Keep existing worktrees data on refresh failure
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  const handleSubmitTask = async (taskData: Partial<Task>) => {
    try {
      if (editingTask) {
        await apiClient.updateTask(editingTask.id, taskData);
      } else {
        // Set status to 'Draft' if in draft mode
        const finalTaskData = isDraftMode 
          ? { ...taskData, status: 'Draft' }
          : taskData;
        const createdTask = await apiClient.createTask(finalTaskData as Omit<Task, "id" | "createdDate">);
        
        // Show task creation confirmation
        setTaskConfirmation({ task: createdTask, isDraft: isDraftMode });
        
        // Auto-dismiss after 4 seconds
        setTimeout(() => {
          setTaskConfirmation(null);
        }, 4000);
      }
      handleCloseModal();
      await refreshData();
      
      // If we're on the drafts page and created a draft, trigger a refresh
      if (isDraftMode && window.location.pathname === '/drafts') {
        // Trigger refresh by updating a timestamp that DraftsList can watch
        window.dispatchEvent(new Event('drafts-updated'));
      }
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    try {
      await apiClient.archiveTask(taskId);
      handleCloseModal();
      await refreshData();
    } catch (error) {
      console.error('Failed to archive task:', error);
    }
  };

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Layout
                projectName={projectName}
                showSuccessToast={showSuccessToast}
                onDismissToast={() => setShowSuccessToast(false)}
                tasks={tasks}
                docs={docs}
                milestones={milestones}
                sprints={sprints}
                decisions={decisions}
                worktrees={worktrees}
                isLoading={isLoading}
                onRefreshData={refreshData}
              />
            }
          >
            <Route index element={<BoardPage onEditTask={handleEditTask} onNewTask={handleNewTask} tasks={tasks} onRefreshData={refreshData} />} />
            <Route path="tasks" element={<TaskList onEditTask={handleEditTask} onNewTask={handleNewTask} tasks={tasks} />} />
            <Route path="drafts" element={<DraftsList onEditTask={handleEditTask} onNewDraft={handleNewDraft} />} />
            <Route path="documentation" element={<DocumentationDetail docs={docs} onRefreshData={refreshData} />} />
            <Route path="documentation/:id" element={<DocumentationDetail docs={docs} onRefreshData={refreshData} />} />
            <Route path="documentation/:id/:title" element={<DocumentationDetail docs={docs} onRefreshData={refreshData} />} />
            <Route path="milestones" element={<MilestoneDetail milestones={milestones} onRefreshData={refreshData} />} />
            <Route path="milestones/:id" element={<MilestoneDetail milestones={milestones} onRefreshData={refreshData} />} />
            <Route path="milestones/:id/:title" element={<MilestoneDetail milestones={milestones} onRefreshData={refreshData} />} />
            <Route path="sprints" element={<SprintDetail sprints={sprints} onRefreshData={refreshData} />} />
            <Route path="sprints/:id" element={<SprintDetail sprints={sprints} onRefreshData={refreshData} />} />
            <Route path="sprints/:id/:title" element={<SprintDetail sprints={sprints} onRefreshData={refreshData} />} />
            <Route path="decisions" element={<DecisionDetail decisions={decisions} onRefreshData={refreshData} />} />
            <Route path="decisions/:id" element={<DecisionDetail decisions={decisions} onRefreshData={refreshData} />} />
            <Route path="decisions/:id/:title" element={<DecisionDetail decisions={decisions} onRefreshData={refreshData} />} />
            <Route path="statistics" element={<Statistics tasks={tasks} isLoading={isLoading} onEditTask={handleEditTask} projectName={projectName} />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>

        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingTask ? `Edit Task ${editingTask.id.replace('task-', '')}` : (isDraftMode ? 'Create New Draft' : 'Create New Task')}
        >
          <TaskForm
            task={editingTask || undefined}
            onSubmit={handleSubmitTask}
            onCancel={handleCloseModal}
            onArchive={editingTask ? () => handleArchiveTask(editingTask.id) : undefined}
            availableStatuses={isDraftMode ? ['Draft', ...statuses] : statuses}
            MDEditor={MDEditor}
          />
        </Modal>

        {/* Task Creation Confirmation Toast */}
        {taskConfirmation && (
          <SuccessToast
            message={`${taskConfirmation.isDraft ? 'Draft' : 'Task'} "${taskConfirmation.task.title}" created successfully! (${taskConfirmation.task.id.replace('task-', '')})`}
            onDismiss={() => setTaskConfirmation(null)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        )}
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;