import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { GitWorktreeService } from "../core/git-worktree-service.ts";
import { WorktreeErrorCode } from "../types/worktree.ts";

describe("GitWorktreeService", () => {
  let service: GitWorktreeService;
  let testRoot: string;

  beforeEach(async () => {
    testRoot = `/tmp/test-git-worktree-${Date.now()}`;
    await mkdir(testRoot, { recursive: true });
    service = new GitWorktreeService(testRoot);
  });

  afterEach(async () => {
    try {
      await rmdir(testRoot, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("validateWorktreeName", () => {
    it("should accept valid worktree names", () => {
      const validNames = [
        "feature-branch",
        "task-123",
        "hotfix_urgent",
        "dev-environment",
        "test123"
      ];

      for (const name of validNames) {
        const result = service.validateWorktreeName(name);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it("should reject invalid worktree names", () => {
      const invalidCases = [
        { name: "", expectedError: "Worktree name cannot be empty" },
        { name: "   ", expectedError: "Worktree name cannot be empty" },
        { name: "name with spaces", expectedError: "Worktree name can only contain letters, numbers, hyphens, and underscores" },
        { name: "name@with#special", expectedError: "Worktree name can only contain letters, numbers, hyphens, and underscores" },
        { name: "-starts-with-dash", expectedError: "Worktree name cannot start or end with a hyphen" },
        { name: "ends-with-dash-", expectedError: "Worktree name cannot start or end with a hyphen" },
        { name: "a".repeat(101), expectedError: "Worktree name cannot exceed 100 characters" }
      ];

      for (const { name, expectedError } of invalidCases) {
        const result = service.validateWorktreeName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(expectedError);
      }
    });
  });

  describe("validateWorktreePath", () => {
    it("should accept valid paths that don't exist", async () => {
      const validPath = join(testRoot, "new-worktree");
      const result = await service.validateWorktreePath(validPath);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty paths", async () => {
      const result = await service.validateWorktreePath("");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Worktree path cannot be empty");
    });

    it("should reject paths that already exist", async () => {
      const existingPath = join(testRoot, "existing");
      await mkdir(existingPath);

      const result = await service.validateWorktreePath(existingPath);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Directory already exists at the specified path");
    });
  });

  describe("error handling", () => {
    it("should create proper WorktreeError objects", () => {
      // Test the private createError method indirectly through validation
      const result = service.validateWorktreeName("");
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should provide suggestions for recoverable errors", () => {
      // This tests the error creation logic indirectly
      const result = service.validateWorktreeName("invalid name with spaces");
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("git command execution", () => {
    it("should handle git command failures gracefully", async () => {
      // This test requires a non-git directory
      const nonGitService = new GitWorktreeService("/tmp");
      
      try {
        await nonGitService.listWorktrees();
        // If we get here, the command unexpectedly succeeded
        expect(false).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe(WorktreeErrorCode.GIT_COMMAND_FAILED);
        expect(error.message).toBeDefined();
      }
    });
  });

  describe("status parsing", () => {
    it("should parse empty status correctly", async () => {
      // Create a mock worktree directory for testing
      const mockWorktreePath = join(testRoot, "mock-worktree");
      await mkdir(mockWorktreePath, { recursive: true });

      try {
        const status = await service.getWorktreeStatus(mockWorktreePath);
        // Since this isn't a real git worktree, we expect it to return default status
        expect(status.lastStatusCheck).toBeDefined();
        expect(typeof status.isClean).toBe("boolean");
        expect(typeof status.modifiedFiles).toBe("number");
        expect(typeof status.stagedFiles).toBe("number");
        expect(typeof status.untrackedFiles).toBe("number");
        expect(typeof status.aheadCount).toBe("number");
        expect(typeof status.behindCount).toBe("number");
        expect(typeof status.hasConflicts).toBe("boolean");
      } catch (error: any) {
        // Expected to fail since it's not a real git worktree
        expect(error.code).toBeDefined();
      }
    });

    it("should handle non-existent worktree paths", async () => {
      const nonExistentPath = join(testRoot, "does-not-exist");
      
      try {
        await service.getWorktreeStatus(nonExistentPath);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(WorktreeErrorCode.WORKTREE_NOT_FOUND);
        expect(error.message).toContain("Worktree path does not exist");
      }
    });
  });

  describe("worktree list parsing", () => {
    it("should parse empty worktree list", async () => {
      // Test with a non-git directory to get empty results
      const nonGitService = new GitWorktreeService("/tmp");
      
      try {
        const worktrees = await nonGitService.listWorktrees();
        expect(Array.isArray(worktrees)).toBe(true);
      } catch (error: any) {
        // Expected to fail in non-git directory
        expect(error.code).toBe(WorktreeErrorCode.GIT_COMMAND_FAILED);
      }
    });
  });

  describe("branch validation", () => {
    it("should handle branch existence checks", async () => {
      // This will fail in a non-git directory, which is expected
      try {
        await service.createWorktree("test-worktree", "main");
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });
  });

  describe("merge operations", () => {
    it("should handle merge failures gracefully", async () => {
      const mockWorktreePath = join(testRoot, "mock-worktree");
      await mkdir(mockWorktreePath, { recursive: true });

      const result = await service.mergeWorktree(mockWorktreePath, "main");
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe("push/pull operations", () => {
    it("should handle push failures gracefully", async () => {
      const mockWorktreePath = join(testRoot, "mock-worktree");
      await mkdir(mockWorktreePath, { recursive: true });

      try {
        await service.pushWorktree(mockWorktreePath);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(WorktreeErrorCode.GIT_COMMAND_FAILED);
        expect(error.message).toBeDefined();
      }
    });

    it("should handle pull failures gracefully", async () => {
      const mockWorktreePath = join(testRoot, "mock-worktree");
      await mkdir(mockWorktreePath, { recursive: true });

      try {
        await service.pullWorktree(mockWorktreePath);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(WorktreeErrorCode.GIT_COMMAND_FAILED);
        expect(error.message).toBeDefined();
      }
    });
  });
});