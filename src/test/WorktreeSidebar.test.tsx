import { describe, it, expect, beforeEach, mock } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WorktreeSidebar from "../web/components/WorktreeSidebar";
import type { Worktree, Task } from "../types";
import { apiClient } from "../web/lib/api";

// Mock the API client
mock.module("../web/lib/api", () => ({
  apiClient: {
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
    ]))
  }
}));

describe("WorktreeSidebar", () => {
  const mockWorktrees: Worktree[] = [
    {
      id: "wt-active-1",
      name: "active-worktree-1",
      path: "/tmp/active-1",
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
      id: "wt-active-2",
      name: "active-worktree-2",
      path: "/tmp/active-2",
      branch: "feature/test-2",
      baseBranch: "main",
      taskIds: ["task-2"],
      status: {
        isClean: false,
        modifiedFiles: 3,
        stagedFiles: 1,
        untrackedFiles: 2,
        aheadCount: 2,
        behindCount: 0,
        hasConflicts: false,
        lastStatusCheck: "2024-01-01T00:00:00.000Z"
      },
      createdDate: "2024-01-01T00:00:00.000Z",
      isActive: true,
      metadata: { tags: [], autoCleanup: false }
    },
    {
      id: "wt-inactive-1",
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
  ];

  const mockOnWorktreeSelect = mock();
  const mockOnRefresh = mock();

  beforeEach(() => {
    mock.restore();
  });

  it("should render empty state when no worktrees exist", () => {
    render(
      <WorktreeSidebar
        worktrees={[]}
        onWorktreeSelect={mockOnWorktreeSelect}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText("No worktrees")).toBeInTheDocument();
    expect(screen.getByText("Create worktrees from tasks")).toBeInTheDocument();
  });

  it("should render active and inactive worktrees separately", async () => {
    render(
      <WorktreeSidebar
        worktrees={mockWorktrees}
        onWorktreeSelect={mockOnWorktreeSelect}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Active (2)")).toBeInTheDocument();
      expect(screen.getByText("Inactive (1)")).toBeInTheDocument();
    });

    expect(screen.getByText("active-worktree-1")).toBeInTheDocument();
    expect(screen.getByText("active-worktree-2")).toBeInTheDocument();
    expect(screen.getByText("inactive-worktree")).toBeInTheDocument();
  });

  it("should show correct status icons and text", async () => {
    render(
      <WorktreeSidebar
        worktrees={mockWorktrees}
        onWorktreeSelect={mockOnWorktreeSelect}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      // Clean worktree should show "Clean"
      expect(screen.getByText("Clean")).toBeInTheDocument();
      
      // Dirty worktree should show changes count
      expect(screen.getByText("4 changes")).toBeInTheDocument();
      
      // Inactive worktree should show "Inactive"
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });
  });

  it("should display linked task information", async () => {
    render(
      <WorktreeSidebar
        worktrees={mockWorktrees}
        onWorktreeSelect={mockOnWorktreeSelect}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Task: Test Task 1")).toBeInTheDocument();
      expect(screen.getByText("Task: Test Task 2")).toBeInTheDocument();
    });
  });

  it("should handle worktree selection", async () => {
    render(
      <WorktreeSidebar
        worktrees={mockWorktrees}
        onWorktreeSelect={mockOnWorktreeSelect}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      const worktreeElement = screen.getByText("active-worktree-1").closest('div');
      if (worktreeElement) {
        fireEvent.click(worktreeElement);
      }
    });

    expect(mockOnWorktreeSelect).toHaveBeenCalledWith(mockWorktrees[0]);
  });

  it("should handle refresh button click", async () => {
    render(
      <WorktreeSidebar
        worktrees={mockWorktrees}
        onWorktreeSelect={mockOnWorktreeSelect}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      const refreshButton = screen.getByTitle("Refresh worktrees");
      fireEvent.click(refreshButton);
    });

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it("should render collapsed view correctly", async () => {
    render(
      <WorktreeSidebar
        worktrees={mockWorktrees}
        onWorktreeSelect={mockOnWorktreeSelect}
        onRefresh={mockOnRefresh}
        isCollapsed={true}
      />
    );

    // Should show only icons for first 3 active worktrees
    const worktreeButtons = screen.getAllByTitle(/active-worktree-\d+ - /);
    expect(worktreeButtons).toHaveLength(2); // Only 2 active worktrees

    // Should not show text labels in collapsed mode
    expect(screen.queryByText("Active (2)")).not.toBeInTheDocument();
    expect(screen.queryByText("active-worktree-1")).not.toBeInTheDocument();
  });

  it("should show +N indicator for many worktrees in collapsed mode", () => {
    const manyWorktrees = Array.from({ length: 5 }, (_, i) => ({
      ...mockWorktrees[0],
      id: `wt-active-${i + 1}`,
      name: `active-worktree-${i + 1}`,
      isActive: true
    }));

    render(
      <WorktreeSidebar
        worktrees={manyWorktrees}
        onWorktreeSelect={mockOnWorktreeSelect}
        onRefresh={mockOnRefresh}
        isCollapsed={true}
      />
    );

    expect(screen.getByText("+2")).toBeInTheDocument(); // 5 - 3 = 2
  });

  it("should show multiple tasks indicator when worktree has multiple linked tasks", async () => {
    const worktreeWithMultipleTasks: Worktree = {
      ...mockWorktrees[0],
      taskIds: ["task-1", "task-2", "task-3"]
    };

    render(
      <WorktreeSidebar
        worktrees={[worktreeWithMultipleTasks]}
        onWorktreeSelect={mockOnWorktreeSelect}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("3 linked tasks")).toBeInTheDocument();
    });
  });

  it("should show ahead/behind status correctly", async () => {
    const worktreeAhead: Worktree = {
      ...mockWorktrees[0],
      status: {
        ...mockWorktrees[0].status,
        isClean: true,
        aheadCount: 3,
        behindCount: 0
      }
    };

    const worktreeBehind: Worktree = {
      ...mockWorktrees[1],
      status: {
        ...mockWorktrees[1].status,
        isClean: true,
        aheadCount: 0,
        behindCount: 2
      }
    };

    render(
      <WorktreeSidebar
        worktrees={[worktreeAhead, worktreeBehind]}
        onWorktreeSelect={mockOnWorktreeSelect}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("+3")).toBeInTheDocument(); // Ahead
      expect(screen.getByText("-2")).toBeInTheDocument(); // Behind
    });
  });

  it("should limit inactive worktrees display", async () => {
    const manyInactiveWorktrees = Array.from({ length: 5 }, (_, i) => ({
      ...mockWorktrees[2],
      id: `wt-inactive-${i + 1}`,
      name: `inactive-worktree-${i + 1}`,
      isActive: false
    }));

    render(
      <WorktreeSidebar
        worktrees={manyInactiveWorktrees}
        onWorktreeSelect={mockOnWorktreeSelect}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Inactive (5)")).toBeInTheDocument();
      expect(screen.getByText("+2 more inactive")).toBeInTheDocument();
    });

    // Should only show first 3 inactive worktrees
    expect(screen.getByText("inactive-worktree-1")).toBeInTheDocument();
    expect(screen.getByText("inactive-worktree-2")).toBeInTheDocument();
    expect(screen.getByText("inactive-worktree-3")).toBeInTheDocument();
    expect(screen.queryByText("inactive-worktree-4")).not.toBeInTheDocument();
  });
});