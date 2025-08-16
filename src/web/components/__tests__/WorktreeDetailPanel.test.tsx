import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorktreeDetailPanel from '../WorktreeDetailPanel';
import type { Worktree, Task } from '../../../types';

// Mock the API client
jest.mock('../../lib/api', () => ({
  apiClient: {
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
  },
  {
    id: 'task-2',
    title: 'Fix urgent bug',
    description: 'Critical bug fix',
    status: 'Done',
    priority: 'High',
    createdDate: '2024-01-02',
    tags: [],
    dependencies: []
  }
];

const mockWorktree: Worktree = {
  id: 'wt-1',
  name: 'feature-branch',
  path: '/path/to/worktree1',
  branch: 'feature/new-feature',
  isActive: true,
  taskIds: ['task-1', 'task-2'],
  status: {
    isClean: false,
    aheadCount: 2,
    behindCount: 1,
    modifiedFiles: 3,
    stagedFiles: 1
  }
};

const defaultProps = {
  worktree: mockWorktree,
  tasks: mockTasks,
  onBack: jest.fn(),
  onRefresh: jest.fn(),
  onDelete: jest.fn()
};

describe('WorktreeDetailPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders worktree name and basic info', () => {
    render(<WorktreeDetailPanel {...defaultProps} />);
    
    expect(screen.getByText('feature-branch')).toBeInTheDocument();
    expect(screen.getByText('feature/new-feature')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('displays git status information', () => {
    render(<WorktreeDetailPanel {...defaultProps} />);
    
    expect(screen.getByText('Git Status')).toBeInTheDocument();
    expect(screen.getByText('Modified')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Modified files
    expect(screen.getByText('1')).toBeInTheDocument(); // Staged files
    expect(screen.getByText('2')).toBeInTheDocument(); // Commits ahead
  });

  it('displays linked tasks with status badges', () => {
    render(<WorktreeDetailPanel {...defaultProps} />);
    
    expect(screen.getByText('Linked Tasks (2)')).toBeInTheDocument();
    expect(screen.getByText('Implement new feature')).toBeInTheDocument();
    expect(screen.getByText('Fix urgent bug')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('shows empty state for no linked tasks', () => {
    const worktreeWithNoTasks = { ...mockWorktree, taskIds: [] };
    render(<WorktreeDetailPanel {...defaultProps} worktree={worktreeWithNoTasks} />);
    
    expect(screen.getByText('No linked tasks')).toBeInTheDocument();
    expect(screen.getByText('Link tasks to track work in this worktree')).toBeInTheDocument();
  });

  it('displays worktree path with copy functionality', () => {
    render(<WorktreeDetailPanel {...defaultProps} />);
    
    expect(screen.getByText('Worktree Path')).toBeInTheDocument();
    expect(screen.getByText('/path/to/worktree1')).toBeInTheDocument();
    
    // Check for copy button
    const copyButton = screen.getByTitle('Copy path to clipboard');
    expect(copyButton).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', async () => {
    render(<WorktreeDetailPanel {...defaultProps} />);
    
    const backButton = screen.getByText('Back to Worktrees');
    fireEvent.click(backButton);
    
    await waitFor(() => {
      expect(defaultProps.onBack).toHaveBeenCalled();
    });
  });

  it('shows action buttons for active worktree', () => {
    render(<WorktreeDetailPanel {...defaultProps} />);
    
    expect(screen.getByText('Open Explorer')).toBeInTheDocument();
    expect(screen.getByText('Pull')).toBeInTheDocument();
    expect(screen.getByText('Push')).toBeInTheDocument();
    expect(screen.getByText('Sync')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows cleanup button for inactive worktree', () => {
    const inactiveWorktree = { ...mockWorktree, isActive: false };
    render(<WorktreeDetailPanel {...defaultProps} worktree={inactiveWorktree} />);
    
    expect(screen.getByText('Cleanup')).toBeInTheDocument();
    expect(screen.queryByText('Pull')).not.toBeInTheDocument();
    expect(screen.queryByText('Push')).not.toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', async () => {
    render(<WorktreeDetailPanel {...defaultProps} />);
    
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(defaultProps.onDelete).toHaveBeenCalledWith('wt-1', false);
    });
  });

  it('calls onDelete with force=true for inactive worktree', async () => {
    const inactiveWorktree = { ...mockWorktree, isActive: false };
    render(<WorktreeDetailPanel {...defaultProps} worktree={inactiveWorktree} />);
    
    const cleanupButton = screen.getByText('Cleanup');
    fireEvent.click(cleanupButton);
    
    await waitFor(() => {
      expect(defaultProps.onDelete).toHaveBeenCalledWith('wt-1', true);
    });
  });

  it('shows processing state during operations', async () => {
    const { apiClient } = require('../../lib/api');
    apiClient.pullWorktree.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<WorktreeDetailPanel {...defaultProps} />);
    
    const pullButton = screen.getByText('Pull');
    fireEvent.click(pullButton);
    
    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  it('displays error message when operation fails', async () => {
    const { apiClient } = require('../../lib/api');
    apiClient.pullWorktree.mockRejectedValue(new Error('Network error'));
    
    render(<WorktreeDetailPanel {...defaultProps} />);
    
    const pullButton = screen.getByText('Pull');
    fireEvent.click(pullButton);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('calls onRefresh after successful operations', async () => {
    const { apiClient } = require('../../lib/api');
    apiClient.pullWorktree.mockResolvedValue({});
    
    render(<WorktreeDetailPanel {...defaultProps} />);
    
    const pullButton = screen.getByText('Pull');
    fireEvent.click(pullButton);
    
    await waitFor(() => {
      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });
  });

  it('displays correct status colors and text', () => {
    render(<WorktreeDetailPanel {...defaultProps} />);
    
    // Check for status text that indicates uncommitted changes
    expect(screen.getByText('4 uncommitted changes')).toBeInTheDocument();
  });

  it('handles clean worktree status', () => {
    const cleanWorktree = {
      ...mockWorktree,
      status: {
        isClean: true,
        aheadCount: 0,
        behindCount: 0,
        modifiedFiles: 0,
        stagedFiles: 0
      }
    };
    
    render(<WorktreeDetailPanel {...defaultProps} worktree={cleanWorktree} />);
    
    expect(screen.getByText('Up to date')).toBeInTheDocument();
  });
});