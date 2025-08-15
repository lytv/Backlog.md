import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { WorktreeStorage } from "../core/worktree-storage.ts";
import type { Worktree, CreateWorktreeDto } from "../types/worktree.ts";

describe("WorktreeStorage", () => {
  let storage: WorktreeStorage;
  let testRoot: string;

  beforeEach(async () => {
    testRoot = `/tmp/test-worktree-storage-${Date.now()}`;
    await mkdir(testRoot, { recursive: true });
    storage = new WorktreeStorage(testRoot);
  });

  afterEach(async () => {
    try {
      await rmdir(testRoot, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("saveWorktree and loadWorktree", () => {
    it("should save and load a worktree", async () => {
      const worktree: Worktree = {
        id: "wt-test-123",
        name: "test-worktree",
        path: "/tmp/test-worktree",
        branch: "feature/test",
        baseBranch: "main",
        taskIds: ["task-1", "task-2"],
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
        lastAccessedDate: "2024-01-01T00:00:00.000Z",
        isActive: true,
        metadata: {
          description: "Test worktree",
          tags: ["test", "feature"],
          autoCleanup: false,
          cleanupAfterDays: 30
        }
      };

      await storage.saveWorktree(worktree);
      const loaded = await storage.loadWorktree("wt-test-123");

      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(worktree.id);
      expect(loaded!.name).toBe(worktree.name);
      expect(loaded!.path).toBe(worktree.path);
      expect(loaded!.branch).toBe(worktree.branch);
      expect(loaded!.baseBranch).toBe(worktree.baseBranch);
      expect(loaded!.taskIds).toEqual(worktree.taskIds);
      expect(loaded!.isActive).toBe(worktree.isActive);
      expect(loaded!.metadata.description).toBe(worktree.metadata.description);
      expect(loaded!.metadata.tags).toEqual(worktree.metadata.tags);
    });

    it("should return null for non-existent worktree", async () => {
      const loaded = await storage.loadWorktree("non-existent");
      expect(loaded).toBeNull();
    });
  });

  describe("listWorktrees", () => {
    it("should return empty array when no worktrees exist", async () => {
      const worktrees = await storage.listWorktrees();
      expect(worktrees).toEqual([]);
    });

    it("should list all saved worktrees", async () => {
      const worktree1: Worktree = {
        id: "wt-test-1",
        name: "test-worktree-1",
        path: "/tmp/test-worktree-1",
        branch: "feature/test-1",
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
        isActive: true,
        metadata: { tags: [], autoCleanup: false }
      };

      const worktree2: Worktree = {
        id: "wt-test-2",
        name: "test-worktree-2",
        path: "/tmp/test-worktree-2",
        branch: "feature/test-2",
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
          lastStatusCheck: "2024-01-02T00:00:00.000Z"
        },
        createdDate: "2024-01-02T00:00:00.000Z",
        isActive: true,
        metadata: { tags: [], autoCleanup: false }
      };

      await storage.saveWorktree(worktree1);
      await storage.saveWorktree(worktree2);

      const worktrees = await storage.listWorktrees();
      expect(worktrees).toHaveLength(2);
      expect(worktrees[0].id).toBe("wt-test-1"); // Should be sorted by createdDate
      expect(worktrees[1].id).toBe("wt-test-2");
    });
  });

  describe("deleteWorktree", () => {
    it("should delete an existing worktree", async () => {
      const worktree: Worktree = {
        id: "wt-test-delete",
        name: "test-worktree",
        path: "/tmp/test-worktree",
        branch: "feature/test",
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
        isActive: true,
        metadata: { tags: [], autoCleanup: false }
      };

      await storage.saveWorktree(worktree);
      
      const deleted = await storage.deleteWorktree("wt-test-delete");
      expect(deleted).toBe(true);

      const loaded = await storage.loadWorktree("wt-test-delete");
      expect(loaded).toBeNull();
    });

    it("should return false for non-existent worktree", async () => {
      const deleted = await storage.deleteWorktree("non-existent");
      expect(deleted).toBe(false);
    });
  });

  describe("task linking", () => {
    let worktree: Worktree;

    beforeEach(async () => {
      worktree = {
        id: "wt-test-linking",
        name: "test-worktree",
        path: "/tmp/test-worktree",
        branch: "feature/test",
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
      await storage.saveWorktree(worktree);
    });

    it("should link worktree to task", async () => {
      const linked = await storage.linkWorktreeToTask("wt-test-linking", "task-2");
      expect(linked).toBe(true);

      const loaded = await storage.loadWorktree("wt-test-linking");
      expect(loaded!.taskIds).toContain("task-1");
      expect(loaded!.taskIds).toContain("task-2");
    });

    it("should not duplicate task links", async () => {
      const linked = await storage.linkWorktreeToTask("wt-test-linking", "task-1");
      expect(linked).toBe(true);

      const loaded = await storage.loadWorktree("wt-test-linking");
      expect(loaded!.taskIds.filter(id => id === "task-1")).toHaveLength(1);
    });

    it("should unlink worktree from task", async () => {
      const unlinked = await storage.unlinkWorktreeFromTask("wt-test-linking", "task-1");
      expect(unlinked).toBe(true);

      const loaded = await storage.loadWorktree("wt-test-linking");
      expect(loaded!.taskIds).not.toContain("task-1");
    });

    it("should find worktrees by task ID", async () => {
      const worktrees = await storage.findWorktreesByTaskId("task-1");
      expect(worktrees).toHaveLength(1);
      expect(worktrees[0].id).toBe("wt-test-linking");
    });

    it("should return empty array for non-existent task", async () => {
      const worktrees = await storage.findWorktreesByTaskId("non-existent-task");
      expect(worktrees).toHaveLength(0);
    });
  });

  describe("updateWorktree", () => {
    it("should update worktree properties", async () => {
      const worktree: Worktree = {
        id: "wt-test-update",
        name: "test-worktree",
        path: "/tmp/test-worktree",
        branch: "feature/test",
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
        isActive: true,
        metadata: { tags: [], autoCleanup: false }
      };

      await storage.saveWorktree(worktree);

      const updates = {
        isActive: false,
        metadata: { tags: ["updated"], autoCleanup: true }
      };

      const updated = await storage.updateWorktree("wt-test-update", updates);
      expect(updated).not.toBeNull();
      expect(updated!.isActive).toBe(false);
      expect(updated!.metadata.tags).toContain("updated");
      expect(updated!.metadata.autoCleanup).toBe(true);
    });

    it("should return null for non-existent worktree", async () => {
      const updated = await storage.updateWorktree("non-existent", { isActive: false });
      expect(updated).toBeNull();
    });
  });

  describe("createWorktreeFromDto", () => {
    it("should create worktree from DTO", () => {
      const dto: CreateWorktreeDto = {
        name: "test-worktree",
        branch: "feature/test",
        baseBranch: "main",
        basePath: "/tmp",
        taskId: "task-1",
        description: "Test worktree",
        tags: ["test"]
      };

      const worktree = storage.createWorktreeFromDto(dto);

      expect(worktree.name).toBe(dto.name);
      expect(worktree.branch).toBe(dto.branch);
      expect(worktree.baseBranch).toBe(dto.baseBranch);
      expect(worktree.path).toBe(join(dto.basePath!, dto.name));
      expect(worktree.taskIds).toContain(dto.taskId!);
      expect(worktree.metadata.description).toBe(dto.description);
      expect(worktree.metadata.tags).toEqual(dto.tags);
      expect(worktree.isActive).toBe(true);
      expect(worktree.status.isClean).toBe(true);
    });

    it("should generate unique IDs", () => {
      const dto: CreateWorktreeDto = {
        name: "test-worktree",
        branch: "feature/test",
        baseBranch: "main"
      };

      const worktree1 = storage.createWorktreeFromDto(dto);
      const worktree2 = storage.createWorktreeFromDto(dto);

      expect(worktree1.id).not.toBe(worktree2.id);
      expect(worktree1.id).toMatch(/^wt-test-worktree-[a-z0-9]+-[a-z0-9]+$/);
      expect(worktree2.id).toMatch(/^wt-test-worktree-[a-z0-9]+-[a-z0-9]+$/);
    });
  });
});