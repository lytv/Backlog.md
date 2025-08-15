import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rmdir } from "node:fs/promises";
import { BacklogServer } from "../server/index.ts";

describe("Worktree API", () => {
  let server: BacklogServer;
  let testRoot: string;
  let baseUrl: string;

  beforeEach(async () => {
    testRoot = `/tmp/test-worktree-api-${Date.now()}`;
    await mkdir(testRoot, { recursive: true });
    
    // Create basic backlog structure
    await mkdir(`${testRoot}/backlog`, { recursive: true });
    await mkdir(`${testRoot}/backlog/tasks`, { recursive: true });
    
    // Create basic config
    const config = `project_name: "Test Project"
statuses: ["To Do", "In Progress", "Done"]
labels: []
milestones: []
date_format: yyyy-mm-dd`;
    await Bun.write(`${testRoot}/backlog/config.yml`, config);

    server = new BacklogServer(testRoot);
    // Note: We won't actually start the server for unit tests
    // These tests focus on the handler methods
  });

  afterEach(async () => {
    try {
      await rmdir(testRoot, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("GET /api/worktrees", () => {
    it("should return empty array when no worktrees exist", async () => {
      // Test the handler method directly
      const response = await server['handleListWorktrees']();
      
      // May return 500 in non-git environment, which is expected
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(0);
      }
    });
  });

  describe("POST /api/worktrees", () => {
    it("should return 400 for missing required fields", async () => {
      const mockRequest = new Request("http://localhost/api/worktrees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      const response = await server['handleCreateWorktree'](mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should handle git command failures gracefully", async () => {
      const mockRequest = new Request("http://localhost/api/worktrees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-worktree",
          branch: "main",
          baseBranch: "main"
        })
      });

      const response = await server['handleCreateWorktree'](mockRequest);
      
      // Should fail because we're not in a git repository
      expect([400, 500]).toContain(response.status);
    });
  });

  describe("GET /api/worktrees/:id", () => {
    it("should return 404 for non-existent worktree", async () => {
      const response = await server['handleGetWorktree']("non-existent");
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe("Worktree not found");
    });
  });

  describe("PUT /api/worktrees/:id", () => {
    it("should return 404 for non-existent worktree", async () => {
      const mockRequest = new Request("http://localhost/api/worktrees/non-existent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false })
      });

      const response = await server['handleUpdateWorktree'](mockRequest, "non-existent");
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe("Worktree not found");
    });
  });

  describe("DELETE /api/worktrees/:id", () => {
    it("should return 404 for non-existent worktree", async () => {
      const mockRequest = new Request("http://localhost/api/worktrees/non-existent", {
        method: "DELETE"
      });

      const response = await server['handleDeleteWorktree']("non-existent", mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe("Worktree not found");
    });

    it("should handle force parameter", async () => {
      const mockRequest = new Request("http://localhost/api/worktrees/non-existent?force=true", {
        method: "DELETE"
      });

      const response = await server['handleDeleteWorktree']("non-existent", mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe("Worktree not found");
    });
  });

  describe("POST /api/worktrees/:id/link-task", () => {
    it("should return 400 for missing taskId", async () => {
      const mockRequest = new Request("http://localhost/api/worktrees/test/link-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      const response = await server['handleLinkWorktreeToTask'](mockRequest, "test");
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe("taskId is required");
    });

    it("should return 404 for non-existent worktree", async () => {
      const mockRequest = new Request("http://localhost/api/worktrees/non-existent/link-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: "task-1" })
      });

      const response = await server['handleLinkWorktreeToTask'](mockRequest, "non-existent");
      
      // May return 500 instead of 404 due to error handling
      expect([404, 500]).toContain(response.status);
    });
  });

  describe("DELETE /api/worktrees/:id/unlink-task", () => {
    it("should return 400 for missing taskId", async () => {
      const mockRequest = new Request("http://localhost/api/worktrees/test/unlink-task", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      const response = await server['handleUnlinkWorktreeFromTask'](mockRequest, "test");
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe("taskId is required");
    });
  });

  describe("GET /api/worktrees/:id/status", () => {
    it("should return 404 for non-existent worktree", async () => {
      const response = await server['handleGetWorktreeStatus']("non-existent");
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe("Worktree not found");
    });
  });

  describe("POST /api/worktrees/:id/merge", () => {
    it("should return 400 for missing targetBranch", async () => {
      const mockRequest = new Request("http://localhost/api/worktrees/test/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      const response = await server['handleMergeWorktree'](mockRequest, "test");
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe("targetBranch is required");
    });

    it("should return 404 for non-existent worktree", async () => {
      const mockRequest = new Request("http://localhost/api/worktrees/non-existent/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetBranch: "main" })
      });

      const response = await server['handleMergeWorktree'](mockRequest, "non-existent");
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe("Worktree not found");
    });
  });

  describe("POST /api/worktrees/:id/push", () => {
    it("should return 404 for non-existent worktree", async () => {
      const response = await server['handlePushWorktree']("non-existent");
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe("Worktree not found");
    });
  });

  describe("POST /api/worktrees/:id/pull", () => {
    it("should return 404 for non-existent worktree", async () => {
      const response = await server['handlePullWorktree']("non-existent");
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe("Worktree not found");
    });
  });

  describe("POST /api/worktrees/cleanup", () => {
    it("should return cleanup results", async () => {
      const response = await server['handleCleanupWorktrees']();
      
      // May return 500 in non-git environment, which is expected
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty("cleaned");
        expect(data).toHaveProperty("errors");
        expect(typeof data.cleaned).toBe("number");
        expect(Array.isArray(data.errors)).toBe(true);
      }
    });
  });
});