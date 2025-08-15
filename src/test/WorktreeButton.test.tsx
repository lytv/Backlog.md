import { describe, it, expect, beforeEach, mock } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WorktreeButton from "../web/components/WorktreeButton";
import type { Task, Worktree } from "../types";
import { apiClient } from "../web/lib/api";

// Mock the API client
mock.module("../web/lib/api", () => ({
  apiClient: {
    fetchWorktrees: mock(() => Promise.resolve([])),
    createWorktree: mock(() => Promise.resolve({
      id: "wt-test-123",
      name: "test-worktree",
      path: "/tmp/test-worktree",
      branch: "main",
      baseBranch: "main",
      taskIds: ["task-1"],
      status: {
        isClean: true,
        modifiedFiles: 0,
        stagedFiles: 0,
        untrackedFiles: 0,
        aheadCount: 0,
        behindCount: 0,
        hasConflicts: false,
        lastStatusCheck: "2024-01-01T00:00:00.000Z"
      },
      createdDate: "2024-01-01T00:00:00.000Z",
      isActive: true,
      metadata: { tags: [], autoCleanup: false }
    }))
  }
}));

// Mock fetch for bash commands
global.fetch = mock((url: string, options?: any) => {
  if (url === '/api/bash/execute') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        output: 'main'
      })
    });
  }
  return Promise.resolve({
    ok: false,
    json: () => Promise.resolve({})
  });
});

describe("WorktreeButton", () => {
  const mockTask: Task = {
    id: "task-1",
    title: "Test Task",
    status: "To Do",
    assignee: [],
    createdDate: "2024-01-01",
    labels: [],
    dependencies: [],
    body: "Test task body",
    priority: "medium"
  };

  beforeEach(() => {
    // Reset mocks
    mock.restore();
  });

  it("should render create worktree button when no worktrees exist", async () => {
    render(<WorktreeButton task={mockTask} />);
    
    await waitFor(() => {
      expect(screen.getByText("Create Worktree")).toBeInTheDocument();
    });
  });

  it("should show loading state initially", () => {
    render(<WorktreeButton task={mockTask} />);
    
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should render different sizes correctly", async () => {
    const { rerender } = render(<WorktreeButton task={mockTask} size="sm" />);
    
    await waitFor(() => {
      const button = screen.getByText("Create Worktree");
      expect(button).toHaveClass("px-2", "py-1", "text-xs");
    });

    rerender(<WorktreeButton task={mockTask} size="md" />);
    await waitFor(() => {
      const button = screen.getByText("Create Worktree");
      expect(button).toHaveClass("px-3", "py-1.5", "text-sm");
    });

    rerender(<WorktreeButton task={mockTask} size="lg" />);
    await waitFor(() => {
      const button = screen.getByText("Create Worktree");
      expect(button).toHaveClass("px-4", "py-2", "text-base");
    });
  });

  it("should show open worktree button when active worktrees exist", async () => {
    const mockWorktree: Worktree = {
      id: "wt-test-123",
      name: "test-worktree",
      path: "/tmp/test-worktree",
      branch: "main",
      baseBranch: "main",
      taskIds: ["task-1"],
      status: {
        isClean: true,
        modifiedFiles: 0,
        stagedFiles: 0,
        untrackedFiles: 0,
        aheadCount: 0,
        behindCount: 0,
        hasConflicts: false,
        lastStatusCheck: "2024-01-01T00:00:00.000Z"
      },
      createdDate: "2024-01-01T00:00:00.000Z",
      isActive: true,
      metadata: { tags: [], autoCleanup: false }
    };

    // Mock API to return existing worktree
    apiClient.fetchWorktrees = mock(() => Promise.resolve([mockWorktree]));

    render(<WorktreeButton task={mockTask} />);
    
    await waitFor(() => {
      expect(screen.getByText("Open Worktree")).toBeInTheDocument();
    });
  });

  it("should show multiple worktrees count when multiple active worktrees exist", async () => {
    const mockWorktrees: Worktree[] = [
      {
        id: "wt-test-1",
        name: "test-worktree-1",
        path: "/tmp/test-worktree-1",
        branch: "main",
        baseBranch: "main",
        taskIds: ["task-1"],
        status: {
          isClean: true,
          modifiedFiles: 0,
          stagedFiles: 0,
          untrackedFiles: 0,
          aheadCount: 0,
          behindCount: 0,
          hasConflicts: false,
          lastStatusCheck: "2024-01-01T00:00:00.000Z"
        },
        createdDate: "2024-01-01T00:00:00.000Z",
        isActive: true,
        metadata: { tags: [], autoCleanup: false }
      },
      {
        id: "wt-test-2",
        name: "test-worktree-2",
        path: "/tmp/test-worktree-2",
        branch: "feature",
        baseBranch: "main",
        taskIds: ["task-1"],
        status: {
          isClean: true,
          modifiedFiles: 0,
          stagedFiles: 0,
          untrackedFiles: 0,
          aheadCount: 0,
          behindCount: 0,
          hasConflicts: false,
          lastStatusCheck: "2024-01-01T00:00:00.000Z"
        },
        createdDate: "2024-01-01T00:00:00.000Z",
        isActive: true,
        metadata: { tags: [], autoCleanup: false }
      }
    ];

    // Mock API to return multiple worktrees
    apiClient.fetchWorktrees = mock(() => Promise.resolve(mockWorktrees));

    render(<WorktreeButton task={mockTask} />);
    
    await waitFor(() => {
      expect(screen.getByText("2 Worktrees")).toBeInTheDocument();
    });
  });

  it("should handle create worktree click", async () => {
    const onWorktreeCreated = mock();
    
    render(<WorktreeButton task={mockTask} onWorktreeCreated={onWorktreeCreated} />);
    
    await waitFor(() => {
      const button = screen.getByText("Create Worktree");
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText("Creating...")).toBeInTheDocument();
    });

    // Wait for creation to complete
    await waitFor(() => {
      expect(onWorktreeCreated).toHaveBeenCalled();
    });
  });

  it("should generate proper worktree names from task titles", async () => {
    const taskWithSpecialChars: Task = {
      ...mockTask,
      title: "Fix Bug #123: Handle Special Characters & Spaces!"
    };

    render(<WorktreeButton task={taskWithSpecialChars} />);
    
    await waitFor(() => {
      const button = screen.getByText("Create Worktree");
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(apiClient.createWorktree).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "fix-bug-123-handle-special-characters-spaces"
        })
      );
    });
  });

  it("should handle API errors gracefully", async () => {
    // Mock API to throw error
    apiClient.createWorktree = mock(() => Promise.reject(new Error("Network error")));

    render(<WorktreeButton task={mockTask} />);
    
    await waitFor(() => {
      const button = screen.getByText("Create Worktree");
      fireEvent.click(button);
    });

    await waitFor(() => {
      // Should show error icon
      expect(screen.getByTitle("Network error")).toBeInTheDocument();
    });
  });

  it("should apply custom className", async () => {
    const { container } = render(<WorktreeButton task={mockTask} className="custom-class" />);
    
    await waitFor(() => {
      expect(container.querySelector(".custom-class")).toBeInTheDocument();
    });
  });

  it("should filter out inactive worktrees", async () => {
    const mockWorktrees: Worktree[] = [
      {
        id: "wt-active",
        name: "active-worktree",
        path: "/tmp/active",
        branch: "main",
        baseBranch: "main",
        taskIds: ["task-1"],
        status: {
          isClean: true,
          modifiedFiles: 0,
          stagedFiles: 0,
          untrackedFiles: 0,
          aheadCount: 0,
          behindCount: 0,
          hasConflicts: false,
          lastStatusCheck: "2024-01-01T00:00:00.000Z"
        },
        createdDate: "2024-01-01T00:00:00.000Z",
        isActive: true,
        metadata: { tags: [], autoCleanup: false }
      },
      {
        id: "wt-inactive",
        name: "inactive-worktree",
        path: "/tmp/inactive",
        branch: "main",
        baseBranch: "main",
        taskIds: ["task-1"],
        status: {
          isClean: true,
          modifiedFiles: 0,
          stagedFiles: 0,
          untrackedFiles: 0,
          aheadCount: 0,
          behindCount: 0,
          hasConflicts: false,
          lastStatusCheck: "2024-01-01T00:00:00.000Z"
        },
        createdDate: "2024-01-01T00:00:00.000Z",
        isActive: false, // Inactive
        metadata: { tags: [], autoCleanup: false }
      }
    ];

    // Mock API to return mixed active/inactive worktrees
    apiClient.fetchWorktrees = mock(() => Promise.resolve(mockWorktrees));

    render(<WorktreeButton task={mockTask} />);
    
    await waitFor(() => {
      // Should only show button for active worktree
      expect(screen.getByText("Open Worktree")).toBeInTheDocument();
      expect(screen.queryByText("2 Worktrees")).not.toBeInTheDocument();
    });
  });
});