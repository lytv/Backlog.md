import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorktreeOverview from '../WorktreeOverview';
import type { Worktree, Task } from '../../../types';

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
    status: 'To Do',
    priority: 'High',
    createdDate: '2024-01-02',
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
    name: 'old-feature',
    path: '/path/to/worktree2',
    branch: 'feature/old-feature',
    isActive: false,
    taskIds: [],
    status: {
      isClean: true,
      aheadCount: 0,
      behindCount: 0,
      modifiedFiles: 0,
      stagedFiles: 0
    }
  }
];

const defaultProps = {
  worktrees: mockWorktrees,
  tasks: mockTasks,
  onWorktreeSelect: jest.fn(),
  onDeleteWorktree: jest.fn(),
  onSwitchToCommands: jest.fn(),
  isFiltered: false,
  isOperating: false
};

describe('WorktreeOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders active and inactive worktrees sections', () => {
    render(<WorktreeOverview {...defaultProps} />);
    
    expect(screen.getByText('Active Worktrees (1)')).toBeInTheDocument();
    expect(screen.getByText('Inactive Worktrees (1)')).toBeInTheDocument();
  });

  it('displays worktree information correctly', () => {
    render(<WorktreeOverview {...defaultProps} />);
    
    expect(screen.getByText('feature-branch')).toBeInTheDocument();
    expect(screen.getByText('feature/new-feature')).toBeInTheDocument();
    expect(screen.getByText('old-feature')).toBeInTheDocument();
  });

  it('shows linked task information', () => {
    render(<WorktreeOverview {...defaultProps} />);
    
    expect(screen.getByText('task-1: Implement new feature')).toBeInTheDocument();
  });

  it('calls onWorktreeSelect when View Details is clicked', async () => {
    render(<WorktreeOverview {...defaultProps} />);
    
    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);
    
    await waitFor(() => {
      expect(defaultProps.onWorktreeSelect).toHaveBeenCalledWith(mockWorktrees[0]);
    });
  });

  it('calls onDeleteWorktree when Delete is clicked', async () => {
    render(<WorktreeOverview {...defaultProps} />);
    
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(defaultProps.onDeleteWorktree).toHaveBeenCalledWith('wt-1', false);
    });
  });

  it('calls onDeleteWorktree with force=true for inactive worktrees', async () => {
    render(<WorktreeOverview {...defaultProps} />);
    
    const cleanupButton = screen.getByText('Cleanup');
    fireEvent.click(cleanupButton);
    
    await waitFor(() => {
      expect(defaultProps.onDeleteWorktree).toHaveBeenCalledWith('wt-2', true);
    });
  });

  it('shows empty state when no worktrees', () => {
    render(<WorktreeOverview {...defaultProps} worktrees={[]} />);
    
    expect(screen.getByText('No worktrees found')).toBeInTheDocument();
    expect(screen.getByText('Create worktrees from tasks to get started with parallel development')).toBeInTheDocument();
  });

  it('shows filtered empty state when isFiltered is true', () => {
    render(<WorktreeOverview {...defaultProps} worktrees={[]} isFiltered={true} />);
    
    expect(screen.getByText('No worktrees found')).toBeInTheDocument();
    expect(screen.getByText('No worktrees match your current search criteria')).toBeInTheDocument();
  });

  it('calls onSwitchToCommands when Create Worktree is clicked', async () => {
    render(<WorktreeOverview {...defaultProps} worktrees={[]} />);
    
    const createButton = screen.getByText('Create Worktree');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(defaultProps.onSwitchToCommands).toHaveBeenCalled();
    });
  });

  it('applies loading styles when isOperating is true', () => {
    const { container } = render(<WorktreeOverview {...defaultProps} isOperating={true} />);
    
    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass('opacity-75', 'pointer-events-none');
  });

  it('displays correct status text for different worktree states', () => {
    const modifiedWorktree: Worktree = {
      ...mockWorktrees[0],
      status: {
        isClean: false,
        aheadCount: 2,
        behindCount: 1,
        modifiedFiles: 3,
        stagedFiles: 1
      }
    };

    render(<WorktreeOverview {...defaultProps} worktrees={[modifiedWorktree]} />);
    
    expect(screen.getByText('4 changes')).toBeInTheDocument();
  });
});