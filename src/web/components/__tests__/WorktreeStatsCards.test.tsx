import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorktreeStatsCards from '../WorktreeStatsCards';
import type { Worktree } from '../../../types';

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
    taskIds: ['task-2'],
    status: {
      isClean: false,
      aheadCount: 2,
      behindCount: 1,
      modifiedFiles: 3,
      stagedFiles: 1
    }
  },
  {
    id: 'wt-3',
    name: 'old-feature',
    path: '/path/to/worktree3',
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

describe('WorktreeStatsCards', () => {
  it('renders all stat cards', () => {
    render(<WorktreeStatsCards worktrees={mockWorktrees} />);
    
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Modified')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('displays correct counts', () => {
    render(<WorktreeStatsCards worktrees={mockWorktrees} />);
    
    // Total worktrees
    expect(screen.getByText('3')).toBeInTheDocument();
    
    // Active worktrees (2 active)
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Modified worktrees (1 with !isClean)
    expect(screen.getByText('1')).toBeInTheDocument();
    
    // Inactive worktrees (1 inactive)
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('handles empty worktrees array', () => {
    render(<WorktreeStatsCards worktrees={[]} />);
    
    // All counts should be 0
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements).toHaveLength(4);
  });

  it('calculates modified worktrees correctly', () => {
    const worktreesWithModified: Worktree[] = [
      ...mockWorktrees,
      {
        id: 'wt-4',
        name: 'another-modified',
        path: '/path/to/worktree4',
        branch: 'feature/another',
        isActive: true,
        taskIds: [],
        status: {
          isClean: false,
          aheadCount: 0,
          behindCount: 0,
          modifiedFiles: 2,
          stagedFiles: 0
        }
      }
    ];

    render(<WorktreeStatsCards worktrees={worktreesWithModified} />);
    
    // Should show 2 modified worktrees now
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});