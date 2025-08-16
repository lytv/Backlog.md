import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
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
    title: 'Implement authentication system',
    description: 'Add user login and registration',
    status: 'In Progress',
    priority: 'High',
    createdDate: '2024-01-01',
    tags: ['backend', 'security'],
    dependencies: []
  },
  {
    id: 'task-2',
    title: 'Design user interface',
    description: 'Create mockups and wireframes',
    status: 'Done',
    priority: 'Medium',
    createdDate: '2024-01-02',
    tags: ['frontend', 'design'],
    dependencies: []
  }
];

const mockWorktrees: Worktree[] = [
  {
    id: 'wt-1',
    name: 'auth-feature',
    path: '/workspace/auth-feature',
    branch: 'feature/authentication',
    isActive: true,
    taskIds: ['task-1'],
    status: {
      isClean: false,
      aheadCount: 3,
      behindCount: 0,
      modifiedFiles: 5,
      stagedFiles: 2
    }
  },
  {
    id: 'wt-2',
    name: 'ui-design',
    path: '/workspace/ui-design',
    branch: 'feature/ui-design',
    isActive: true,
    taskIds: ['task-2'],
    status: {
      isClean: true,
      aheadCount: 1,
      behindCount: 2,
      modifiedFiles: 0,
      stagedFiles: 0
    }
  },
  {
    id: 'wt-3',
    name: 'old-experiment',
    path: '/workspace/old-experiment',
    branch: 'experiment/old-feature',
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

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Worktree Integration Tests', () => {
  const defaultProps = {
    tasks: mockTasks,
    worktrees: mockWorktrees,
    isLoading: false,
    onRefreshData: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete User Workflow', () => {
    it('allows user to browse, search, filter, and manage worktrees', async () => {
      renderWithRouter(<WorktreesPage {...defaultProps} />);

      // 1. Verify initial state
      expect(screen.getByText('Worktrees')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total count
      expect(screen.getByText('2')).toBeInTheDocument(); // Active count

      // 2. Test search functionality
      const searchInput = screen.getByPlaceholderText('Search worktrees by name, branch, or linked task...');
      fireEvent.change(searchInput, { target: { value: 'auth' } });

      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 3 worktrees')).toBeInTheDocument();
      });

      // 3. Test filter functionality
      fireEvent.change(searchInput, { target: { value: '' } }); // Clear search
      const filterSelect = screen.getByDisplayValue('All Worktrees');
      fireEvent.change(filterSelect, { target: { value: 'modified' } });

      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 3 worktrees')).toBeInTheDocument();
      });

      // 4. Clear filters
      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByText('Showing')).not.toBeInTheDocument();
      });

      // 5. Navigate to detail view
      const viewDetailsButtons = screen.getAllByText('View Details');
      fireEvent.click(viewDetailsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Back to Worktrees')).toBeInTheDocument();
        expect(screen.getByText('auth-feature')).toBeInTheDocument();
      });

      // 6. Verify detail view content
      expect(screen.getByText('Git Status')).toBeInTheDocument();
      expect(screen.getByText('Linked Tasks (1)')).toBeInTheDocument();
      expect(screen.getByText('Implement authentication system')).toBeInTheDocument();

      // 7. Navigate back to overview
      const backButton = screen.getByText('Back to Worktrees');
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Active Worktrees (2)')).toBeInTheDocument();
      });

      // 8. Switch to commands tab
      const commandsTab = screen.getByText('Commands');
      fireEvent.click(commandsTab);

      await waitFor(() => {
        expect(screen.getByText('Worktree Commands')).toBeInTheDocument();
        expect(screen.getByText('Quick Tips')).toBeInTheDocument();
      });
    });

    it('handles error states gracefully', async () => {
      const { apiClient } = require('../../lib/api');
      apiClient.deleteWorktree.mockRejectedValue(new Error('Permission denied'));

      renderWithRouter(<WorktreesPage {...defaultProps} />);

      // Try to delete a worktree
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText(/Permission denied/)).toBeInTheDocument();
      });

      // Test retry functionality
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
    });

    it('shows loading states during operations', async () => {
      const { apiClient } = require('../../lib/api');
      apiClient.deleteWorktree.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithRouter(<WorktreesPage {...defaultProps} />);

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });

    it('maintains state consistency across navigation', async () => {
      renderWithRouter(<WorktreesPage {...defaultProps} />);

      // Set a search filter
      const searchInput = screen.getByPlaceholderText('Search worktrees by name, branch, or linked task...');
      fireEvent.change(searchInput, { target: { value: 'auth' } });

      // Navigate to detail view
      const viewDetailsButton = screen.getByText('View Details');
      fireEvent.click(viewDetailsButton);

      // Navigate back
      const backButton = screen.getByText('Back to Worktrees');
      fireEvent.click(backButton);

      // Verify search filter is maintained
      await waitFor(() => {
        expect(searchInput).toHaveValue('auth');
        expect(screen.getByText('Showing 1 of 3 worktrees')).toBeInTheDocument();
      });
    });

    it('handles responsive design elements', () => {
      // Test with different viewport sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithRouter(<WorktreesPage {...defaultProps} />);

      // Verify responsive classes are applied
      const container = screen.getByText('Worktrees').closest('div');
      expect(container).toHaveClass('max-w-7xl', 'mx-auto', 'p-6');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      renderWithRouter(<WorktreesPage {...defaultProps} />);

      // Check for proper form labels
      expect(screen.getByLabelText('Filter:')).toBeInTheDocument();
      
      // Check for proper button roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', async () => {
      renderWithRouter(<WorktreesPage {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search worktrees by name, branch, or linked task...');
      
      // Test tab navigation
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe('Performance', () => {
    it('handles large numbers of worktrees efficiently', () => {
      const manyWorktrees = Array.from({ length: 100 }, (_, i) => ({
        ...mockWorktrees[0],
        id: `wt-${i}`,
        name: `worktree-${i}`,
        path: `/workspace/worktree-${i}`
      }));

      const props = { ...defaultProps, worktrees: manyWorktrees };
      
      const startTime = performance.now();
      renderWithRouter(<WorktreesPage {...props} />);
      const endTime = performance.now();

      // Should render within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Should still show correct counts
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });
});