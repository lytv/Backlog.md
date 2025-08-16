import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorktreesPage from '../WorktreesPage';
import type { Worktree, Task } from '../../../types';

// Mock the API client
jest.mock('../../lib/api', () => ({
  apiClient: {
    deleteWorktree: jest.fn(),
    pushWorktree: jest.fn(),
    pullWorktree: jest.fn()
  }
}));

const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Implement new feature',
    description: 'Add new functionality',
    status: 'In Progress',
    priority: 'High',
    createdDate: '2024-01-01',
    tags: [],
    dependencies: []
  }
];

const mockWorktrees: Worktree[] = [
  {
    id: 'wt-1',
    name: 'feature-branch',
    path: '/path/to/worktree1',
    branch: 'feature/new-feature',
    isActive: true,
    taskIds: ['task-1'],
    status: {
      isClean: true,
      aheadCount: 0,
      behindCount: 0,
      modifiedFiles: 0,
      stagedFiles: 0
    }
  },
  {
    id: 'wt-2',
    name: 'hotfix-branch',
    path: '/path/to/worktree2',
    branch: 'hotfix/urgent-fix',
    isActive: true,
    taskIds: [],
    status: {
      isClean: false,
      aheadCount: 2,
      behindCount: 1,
      modifiedFiles: 3,
      stagedFiles: 1
    }
  }
];

const defaultProps = {
  tasks: mockTasks,
  worktrees: mockWorktrees,
  isLoading: false,
  onRefreshData: jest.fn()
};

describe('WorktreesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main heading and description', () => {
    render(<WorktreesPage {...defaultProps} />);
    
    expect(screen.getByText('Worktrees')).toBeInTheDocument();
    expect(screen.getByText('Manage your git worktrees and development environments')).toBeInTheDocument();
  });

  it('renders statistics cards', () => {
    render(<WorktreesPage {...defaultProps} />);
    
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Modified')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('renders search and filter controls', () => {
    render(<WorktreesPage {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('Search worktrees by name, branch, or linked task...')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Worktrees')).toBeInTheDocument();
  });

  it('renders overview and commands tabs', () => {
    render(<WorktreesPage {...defaultProps} />);
    
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Commands')).toBeInTheDocument();
  });

  it('filters worktrees by search query', async () => {
    render(<WorktreesPage {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search worktrees by name, branch, or linked task...');
    fireEvent.change(searchInput, { target: { value: 'feature' } });
    
    await waitFor(() => {
      expect(screen.getByText('Showing 1 of 2 worktrees')).toBeInTheDocument();
    });
  });

  it('filters worktrees by status', async () => {
    render(<WorktreesPage {...defaultProps} />);
    
    const filterSelect = screen.getByDisplayValue('All Worktrees');
    fireEvent.change(filterSelect, { target: { value: 'modified' } });
    
    await waitFor(() => {
      expect(screen.getByText('Showing 1 of 2 worktrees')).toBeInTheDocument();
    });
  });

  it('clears filters when clear button is clicked', async () => {
    render(<WorktreesPage {...defaultProps} />);
    
    // Set a search query first
    const searchInput = screen.getByPlaceholderText('Search worktrees by name, branch, or linked task...');
    fireEvent.change(searchInput, { target: { value: 'feature' } });
    
    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });
    
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });

  it('switches between overview and commands tabs', async () => {
    render(<WorktreesPage {...defaultProps} />);
    
    const commandsTab = screen.getByText('Commands');
    fireEvent.click(commandsTab);
    
    await waitFor(() => {
      expect(screen.getByText('Worktree Commands')).toBeInTheDocument();
    });
    
    const overviewTab = screen.getByText('Overview');
    fireEvent.click(overviewTab);
    
    await waitFor(() => {
      expect(screen.getByText('Active Worktrees (2)')).toBeInTheDocument();
    });
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<WorktreesPage {...defaultProps} isLoading={true} />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('navigates to detail view when worktree is selected', async () => {
    render(<WorktreesPage {...defaultProps} />);
    
    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);
    
    await waitFor(() => {
      expect(screen.getByText('Back to Worktrees')).toBeInTheDocument();
      expect(screen.getByText('feature-branch')).toBeInTheDocument();
    });
  });

  it('returns to overview when back button is clicked', async () => {
    render(<WorktreesPage {...defaultProps} />);
    
    // Navigate to detail view
    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);
    
    await waitFor(() => {
      expect(screen.getByText('Back to Worktrees')).toBeInTheDocument();
    });
    
    // Click back button
    const backButton = screen.getByText('Back to Worktrees');
    fireEvent.click(backButton);
    
    await waitFor(() => {
      expect(screen.getByText('Active Worktrees (2)')).toBeInTheDocument();
    });
  });

  it('shows error message when error occurs', () => {
    render(<WorktreesPage {...defaultProps} />);
    
    // Simulate an error by triggering a failed operation
    // This would need to be implemented based on how errors are handled
  });

  it('shows toast notifications', () => {
    render(<WorktreesPage {...defaultProps} />);
    
    // This would need to be tested by triggering operations that show toasts
    // The actual implementation would depend on how toasts are triggered
  });
});