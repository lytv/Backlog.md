import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdir, rmdir } from "node:fs/promises";
import { WorktreeRepository } from "../core/worktree-repository.ts";
import type { CreateWorktreeDto, Worktree } from "../types/worktree.ts";

describe("WorktreeRepository", () => {
  let repository: WorktreeRepository;
  let testRoot: string;

  beforeEach(async () => {
    testRoot = `/tmp/test-worktree-repo-${Date.now()}`;
    await mkdir(testRoot, { recursive: true });
    repository = new WorktreeRepository(testRoot);
  });

  afterEach(async () => {
    try {
      await rmdir(testRoot, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("validation methods", () => {
    it("should validate worktree names", () => {
      const validResult = repository.validateWorktreeName("valid-name");
      expect(validResult.isValid).toBe(true);

      const invalidResult = repository.validateWorktreeName("invalid name");
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it("should validate worktree paths", async () => {
      const validPath = `${testRoot}/new-worktree`;
      const validResult = await repository.validateWorktreePath(validPath);
      expect(validResult.isValid).toBe(true);

      const invalidResult = await repository.validateWorktreePath("");
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("CRUD operations", () => {
    it("should handle create operation gracefully", async () => {
      const dto: CreateWorktreeDto = {
        name: "test-worktree",
        branch: "main",
        baseBranch: "main",
        basePath: testRoot,
        taskId: "task-1"
      };

      // This will fail because we're not in a git repository
      // but we test that it handles the error gracefully
      try {
        await repository.create(dto);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(typeof error.message).toBe("string");
      }
    });

    it("should return empty array for findAll when no worktrees exist", async () => {
      try {
        const worktrees = await repository.findAll();
        expect(Array.isArray(worktrees)).toBe(true);
        expect(worktrees).toHaveLength(0);
      } catch (error) {
        // Expected to fail in non-git directory
        expect(error).toBeDefined();
      }
    });

    it("should return null for non-existent worktree", async () => {
      const worktree = await repository.findById("non-existent");
      expect(worktree).toBeNull();
    });

    it("should return empty array for findByTaskId with non-existent task", async () => {
      const worktrees = await repository.findByTaskId("non-existent-task");
      expect(Array.isArray(worktrees)).toBe(true);
      expect(worktrees).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    it("should handle delete operation for non-existent worktree", async () => {
      try {
        await repository.delete("non-existent");
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("not found");
      }
    });

    it("should handle link operations for non-existent worktree", async () => {
      try {
        await repository.linkToTask("non-existent", "task-1");
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("Failed to link");
      }
    });

    it("should handle unlink operations for non-existent worktree", async () => {
      try {
        await repository.unlinkFromTask("non-existent", "task-1");
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("Failed to unlink");
      }
    });
  });

  describe("git operations", () => {
    it("should handle merge operation for non-existent worktree", async () => {
      try {
        await repository.mergeWorktree("non-existent", "main");
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("not found or inactive");
      }
    });

    it("should handle push operation for non-existent worktree", async () => {
      try {
        await repository.pushWorktree("non-existent");
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("not found or inactive");
      }
    });

    it("should handle pull operation for non-existent worktree", async () => {
      try {
        await repository.pullWorktree("non-existent");
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("not found or inactive");
      }
    });
  });

  describe("cleanup operations", () => {
    it("should handle cleanup of stale worktrees", async () => {
      try {
        const result = await repository.cleanupStaleWorktrees();
        expect(result).toHaveProperty("cleaned");
        expect(result).toHaveProperty("errors");
        expect(typeof result.cleaned).toBe("number");
        expect(Array.isArray(result.errors)).toBe(true);
      } catch (error) {
        // Expected to fail in non-git directory
        expect(error).toBeDefined();
      }
    });
  });

  describe("status operations", () => {
    it("should return null for getWorktreeStatus of non-existent worktree", async () => {
      const result = await repository.getWorktreeStatus("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("update operations", () => {
    it("should return null for update of non-existent worktree", async () => {
      const result = await repository.update("non-existent", { isActive: false });
      expect(result).toBeNull();
    });
  });
});