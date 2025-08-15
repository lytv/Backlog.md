import { describe, it, expect, beforeEach, mock } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WorktreeManager from "../web/components/WorktreeManager";
import type { Worktree, Task } from "../types";
import { apiClient } from "../web/lib/api";

// Mock the API client
mock.module("../web/lib/api", () => ({
  apiClient: {
    fetchWorktrees: mock(() => Promise.resolve([
      {
        id: "wt-test-1",
        name: "test-worktree-1",
        path: "/tmp/test-1",
        branch: "feature/test-1",
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
        path: "/tmp/test-2",
        branch: "feature/test-2",
        baseBranch: "main",
        taskIds: ["task-2"],
        status: {
          isClean: false,
          modifiedFiles: 3,
          stagedFiles: 1,
          untrackedFiles: 0,
          aheadCount: 2,
          behindCount: 0,
          hasConflicts: false,
          lastStatusCheck: "2024-01-01T00:00:00.000Z"
        },
        createdDate: "2024-01-01T00:00:00.000Z",
        isActive: true,
        metadata: { tags: [], autoCleanup: false }
      }
    ])),
    fetchTasks: mock(() => Promise.resolve([
      {
        id: "task-1",
        title: "Test Task 1",
        status: "To Do",
        assignee: [],
        createdDate: "2024-01-01",
        labels: [],
        dependencies: [],
        body: "Test task 1 body"
      },
      {
        id: "task-2",
        title: "Test Task 2",
        status: "In Progress",
        assignee: [],
        createdDate: "2024-01-02",
        labels: [],
        dependencies: [],
        body: "Test task 2 body"
      }
    ])),
    deleteWorktree: mock(() => Promise.resolve({ success: true })),
    mergeWorktree: mock(() => Promise.resolve({ success: true, message: "Merge successful" })),
    pushWorktree: mock(() => Promise.resolve({ success: true })),
    pullWorktree: mock(() => Promise.resolve({ success: true }))
  }
}));

// Mock Modal component
mock.module("../web/components/Modal", () => ({
  default: ({ isOpen, onClose, children }: any) => 
    isOpen ? <div data-testid="modal" onClick={onClose}>{children}</div> : null
}));

describe("WorktreeManager", () => {
  const mockOnClose = mock();
  const mockOnRefreshData = mock();

  beforeEach(() => {
    mock.restore();
  });

  it("should render modal when open", async () => {
    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByText("Worktree Manager")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <WorktreeManager
        isOpen={false}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  it("should load and display worktrees", async () => {
    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Worktrees (2)")).toBeInTheDocument();
      expect(screen.getByText("test-worktree-1")).toBeInTheDocument();
      expect(screen.getByText("test-worktree-2")).toBeInTheDocument();
    });
  });

  it("should show different tabs", async () => {
    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(screen.getByText("Commands")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    // Click on Commands tab
    fireEvent.click(screen.getByText("Commands"));
    expect(screen.getByText("Worktree Commands")).toBeInTheDocument();

    // Click on Settings tab
    fireEvent.click(screen.getByText("Settings"));
    expect(screen.getByText("Worktree Settings")).toBeInTheDocument();
  });

  it("should select worktree and show details", async () => {
    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      const worktreeItem = screen.getByText("test-worktree-1");
      fireEvent.click(worktreeItem.closest('div')!);
    });

    await waitFor(() => {
      expect(screen.getByText("Branch: feature/test-1")).toBeInTheDocument();
      expect(screen.getByText("Base: main")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
  });

  it("should show worktree status correctly", async () => {
    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      // Select the dirty worktree
      const worktreeItem = screen.getByText("test-worktree-2");
      fireEvent.click(worktreeItem.closest('div')!);
    });

    await waitFor(() => {
      expect(screen.getByText("Modified files:")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument(); // Modified files count
      expect(screen.getByText("Staged files:")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument(); // Staged files count
    });
  });

  it("should show linked tasks", async () => {
    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      const worktreeItem = screen.getByText("test-worktree-1");
      fireEvent.click(worktreeItem.closest('div')!);
    });

    await waitFor(() => {
      expect(screen.getByText("Linked Tasks")).toBeInTheDocument();
      expect(screen.getByText("task-1")).toBeInTheDocument();
      expect(screen.getByText("Test Task 1")).toBeInTheDocument();
    });
  });

  it("should handle push operation", async () => {
    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      const worktreeItem = screen.getByText("test-worktree-1");
      fireEvent.click(worktreeItem.closest('div')!);
    });

    await waitFor(() => {
      const pushButton = screen.getByText("Push");
      fireEvent.click(pushButton);
    });

    expect(apiClient.pushWorktree).toHaveBeenCalledWith("wt-test-1");
  });

  it("should handle pull operation", async () => {
    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      const worktreeItem = screen.getByText("test-worktree-1");
      fireEvent.click(worktreeItem.closest('div')!);
    });

    await waitFor(() => {
      const pullButton = screen.getByText("Pull");
      fireEvent.click(pullButton);
    });

    expect(apiClient.pullWorktree).toHaveBeenCalledWith("wt-test-1");
  });

  it("should handle merge operation", async () => {
    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      const worktreeItem = screen.getByText("test-worktree-1");
      fireEvent.click(worktreeItem.closest('div')!);
    });

    await waitFor(() => {
      const targetInput = screen.getByPlaceholderText("Target branch");
      fireEvent.change(targetInput, { target: { value: "develop" } });
      
      const mergeButton = screen.getByText("Merge");
      fireEvent.click(mergeButton);
    });

    expect(apiClient.mergeWorktree).toHaveBeenCalledWith("wt-test-1", "develop");
  });

  it("should show delete confirmation", async () => {
    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      const worktreeItem = screen.getByText("test-worktree-1");
      fireEvent.click(worktreeItem.closest('div')!);
    });

    await waitFor(() => {
      const deleteButton = screen.getByText("Delete Worktree");
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Delete Worktree")).toBeInTheDocument();
      expect(screen.getByText("Are you sure you want to delete this worktree?")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
      expect(screen.getByText("Force Delete")).toBeInTheDocument();
    });
  });

  it("should handle delete operation", async () => {
    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      const worktreeItem = screen.getByText("test-worktree-1");
      fireEvent.click(worktreeItem.closest('div')!);
    });

    await waitFor(() => {
      const deleteButton = screen.getByText("Delete Worktree");
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      const confirmDeleteButton = screen.getAllByText("Delete")[1]; // Second "Delete" button in modal
      fireEvent.click(confirmDeleteButton);
    });

    expect(apiClient.deleteWorktree).toHaveBeenCalledWith("wt-test-1", false);
  });

  it("should handle force delete operation", async () => {
    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      const worktreeItem = screen.getByText("test-worktree-1");
      fireEvent.click(worktreeItem.closest('div')!);
    });

    await waitFor(() => {
      const deleteButton = screen.getByText("Delete Worktree");
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      const forceDeleteButton = screen.getByText("Force Delete");
      fireEvent.click(forceDeleteButton);
    });

    expect(apiClient.deleteWorktree).toHaveBeenCalledWith("wt-test-1", true);
  });

  it("should show empty state when no worktrees", async () => {
    // Mock empty worktrees
    apiClient.fetchWorktrees = mock(() => Promise.resolve([]));

    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("No worktrees found")).toBeInTheDocument();
      expect(screen.getByText("Create worktrees from tasks")).toBeInTheDocument();
    });
  });

  it("should handle API errors", async () => {
    // Mock API error
    apiClient.fetchWorktrees = mock(() => Promise.reject(new Error("Network error")));

    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("should refresh data when refresh button clicked", async () => {
    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      const refreshButton = screen.getByTitle("Refresh");
      fireEvent.click(refreshButton);
    });

    // Should call fetchWorktrees again
    expect(apiClient.fetchWorktrees).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
  });

  it("should select initial worktree if provided", async () => {
    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
        initialWorktreeId="wt-test-2"
      />
    );

    await waitFor(() => {
      // Should automatically select the worktree with initialWorktreeId
      expect(screen.getByText("Branch: feature/test-2")).toBeInTheDocument();
    });
  });

  it("should close modal when close button clicked", async () => {
    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should disable operations for inactive worktrees", async () => {
    // Mock inactive worktree
    apiClient.fetchWorktrees = mock(() => Promise.resolve([
      {
        id: "wt-inactive",
        name: "inactive-worktree",
        path: "/tmp/inactive",
        branch: "old-feature",
        baseBranch: "main",
        taskIds: [],
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
        isActive: false,
        metadata: { tags: [], autoCleanup: false }
      }
    ]));

    render(
      <WorktreeManager
        isOpen={true}
        onClose={mockOnClose}
        onRefreshData={mockOnRefreshData}
      />
    );

    await waitFor(() => {
      const worktreeItem = screen.getByText("inactive-worktree");
      fireEvent.click(worktreeItem.closest('div')!);
    });

    await waitFor(() => {
      expect(screen.getByText("Inactive")).toBeInTheDocument();
      
      const pushButton = screen.getByText("Push");
      const pullButton = screen.getByText("Pull");
      const mergeButton = screen.getByText("Merge");
      
      expect(pushButton).toBeDisabled();
      expect(pullButton).toBeDisabled();
      expect(mergeButton).toBeDisabled();
    });
  });
});