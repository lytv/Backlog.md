import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdir, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { GitWorktreeService } from "../core/git-worktree-service.ts";
import { WorktreeErrorCode } from "../types/worktree.ts";

describe("Enhanced Merge and Sync Operations", () => {
  let service: GitWorktreeService;
  let testDir: string;

  beforeEach(async () => {
    testDir = join("/tmp", `test-enhanced-worktree-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    service = new GitWorktreeService(testDir);
  });

  afterEach(async () => {
    try {
      await rmdir(testDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Enhanced Merge Operations", () => {
    it("should detect same branch merge attempt", async () => {
      // Mock getCurrentBranch to return same branch
      const mockGetCurrentBranch = mock(() => Promise.resolve("main"));
      (service as any).getCurrentBranch = mockGetCurrentBranch;

      const result = await service.mergeWorktree("/fake/path", "main");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Cannot merge branch into itself");
    });

    it("should validate target branch exists", async () => {
      // Mock methods
      const mockGetCurrentBranch = mock(() => Promise.resolve("feature"));
      const mockCheckBranchExists = mock(() => Promise.resolve(false));
      
      (service as any).getCurrentBranch = mockGetCurrentBranch;
      (service as any).checkBranchExists = mockCheckBranchExists;

      const result = await service.mergeWorktree("/fake/path", "nonexistent");

      expect(result.success).toBe(false);
      expect(result.message).toContain("does not exist");
    });

    it("should check for uncommitted changes", async () => {
      // Mock methods
      const mockGetCurrentBranch = mock(() => Promise.resolve("feature"));
      const mockCheckBranchExists = mock(() => Promise.resolve(true));
      const mockGetWorktreeStatus = mock(() => Promise.resolve({
        isClean: false,
        modifiedFiles: 2,
        stagedFiles: 1,
        untrackedFiles: 0,
        aheadCount: 0,
        behindCount: 0,
        hasConflicts: false,
        lastStatusCheck: new Date().toISOString()
      }));
      
      (service as any).getCurrentBranch = mockGetCurrentBranch;
      (service as any).checkBranchExists = mockCheckBranchExists;
      service.getWorktreeStatus = mockGetWorktreeStatus;

      const result = await service.mergeWorktree("/fake/path", "main");

      expect(result.success).toBe(false);
      expect(result.message).toContain("uncommitted changes");
      expect(result.uncommittedChanges).toBe(true);
    });

    it("should handle merge conflicts with detailed information", async () => {
      // Mock successful pre-checks but failed merge
      const mockGetCurrentBranch = mock(() => Promise.resolve("feature"));
      const mockCheckBranchExists = mock(() => Promise.resolve(true));
      const mockGetWorktreeStatus = mock(() => Promise.resolve({
        isClean: true,
        modifiedFiles: 0,
        stagedFiles: 0,
        untrackedFiles: 0,
        aheadCount: 0,
        behindCount: 0,
        hasConflicts: false,
        lastStatusCheck: new Date().toISOString()
      }));
      const mockExecuteGitCommand = mock((args: string[]) => {
        if (args[0] === 'checkout') {
          return Promise.resolve({ success: true, output: '', error: '', exitCode: 0 });
        } else if (args[0] === 'fetch') {
          return Promise.resolve({ success: true, output: '', error: '', exitCode: 0 });
        } else if (args[0] === 'merge') {
          return Promise.resolve({ success: false, output: '', error: 'CONFLICT', exitCode: 1 });
        } else if (args[0] === 'status') {
          return Promise.resolve({ 
            success: true, 
            output: 'UU file1.txt\nAA file2.js\n', 
            error: '', 
            exitCode: 0 
          });
        }
        return Promise.resolve({ success: true, output: '', error: '', exitCode: 0 });
      });
      
      (service as any).getCurrentBranch = mockGetCurrentBranch;
      (service as any).checkBranchExists = mockCheckBranchExists;
      service.getWorktreeStatus = mockGetWorktreeStatus;
      (service as any).executeGitCommand = mockExecuteGitCommand;
      (service as any).getConflictDetails = mock(() => Promise.resolve([
        { file: 'file1.txt', status: 'U' },
        { file: 'file2.js', status: 'U' }
      ]));

      const result = await service.mergeWorktree("/fake/path", "main");

      expect(result.success).toBe(false);
      expect(result.conflicts).toEqual(['file1.txt', 'file2.js']);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
    });

    it("should provide merge success with file list", async () => {
      // Mock successful merge
      const mockGetCurrentBranch = mock(() => Promise.resolve("feature"));
      const mockCheckBranchExists = mock(() => Promise.resolve(true));
      const mockGetWorktreeStatus = mock(() => Promise.resolve({
        isClean: true,
        modifiedFiles: 0,
        stagedFiles: 0,
        untrackedFiles: 0,
        aheadCount: 0,
        behindCount: 0,
        hasConflicts: false,
        lastStatusCheck: new Date().toISOString()
      }));
      const mockExecuteGitCommand = mock((args: string[]) => {
        return Promise.resolve({ success: true, output: '', error: '', exitCode: 0 });
      });
      const mockGetMergedFiles = mock(() => Promise.resolve(['file1.txt', 'file2.js']));
      
      (service as any).getCurrentBranch = mockGetCurrentBranch;
      (service as any).checkBranchExists = mockCheckBranchExists;
      service.getWorktreeStatus = mockGetWorktreeStatus;
      (service as any).executeGitCommand = mockExecuteGitCommand;
      (service as any).getMergedFiles = mockGetMergedFiles;

      const result = await service.mergeWorktree("/fake/path", "main");

      expect(result.success).toBe(true);
      expect(result.message).toContain("Successfully merged");
      expect(result.mergedFiles).toEqual(['file1.txt', 'file2.js']);
    });
  });

  describe("Enhanced Push Operations", () => {
    it("should handle no changes to push", async () => {
      const mockGetWorktreeStatus = mock(() => Promise.resolve({
        isClean: true,
        modifiedFiles: 0,
        stagedFiles: 0,
        untrackedFiles: 0,
        aheadCount: 0,
        behindCount: 0,
        hasConflicts: false,
        lastStatusCheck: new Date().toISOString()
      }));
      
      service.getWorktreeStatus = mockGetWorktreeStatus;

      const result = await service.pushWorktree("/fake/path");

      expect(result.success).toBe(true);
      expect(result.message).toContain("No changes to push");
    });

    it("should handle non-fast-forward push rejection", async () => {
      const mockGetWorktreeStatus = mock(() => Promise.resolve({
        isClean: false,
        modifiedFiles: 0,
        stagedFiles: 0,
        untrackedFiles: 0,
        aheadCount: 2,
        behindCount: 0,
        hasConflicts: false,
        lastStatusCheck: new Date().toISOString()
      }));
      const mockGetCurrentBranch = mock(() => Promise.resolve("feature"));
      const mockExecuteGitCommand = mock(() => Promise.resolve({
        success: false,
        output: '',
        error: 'rejected non-fast-forward',
        exitCode: 1
      }));
      
      service.getWorktreeStatus = mockGetWorktreeStatus;
      (service as any).getCurrentBranch = mockGetCurrentBranch;
      (service as any).executeGitCommand = mockExecuteGitCommand;

      const result = await service.pushWorktree("/fake/path");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Remote has changes that conflict");
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.some(s => s.includes("pull"))).toBe(true);
    });

    it("should handle authentication errors", async () => {
      const mockGetWorktreeStatus = mock(() => Promise.resolve({
        isClean: false,
        modifiedFiles: 0,
        stagedFiles: 0,
        untrackedFiles: 0,
        aheadCount: 1,
        behindCount: 0,
        hasConflicts: false,
        lastStatusCheck: new Date().toISOString()
      }));
      const mockGetCurrentBranch = mock(() => Promise.resolve("feature"));
      const mockExecuteGitCommand = mock(() => Promise.resolve({
        success: false,
        output: '',
        error: 'authentication failed',
        exitCode: 1
      }));
      
      service.getWorktreeStatus = mockGetWorktreeStatus;
      (service as any).getCurrentBranch = mockGetCurrentBranch;
      (service as any).executeGitCommand = mockExecuteGitCommand;

      const result = await service.pushWorktree("/fake/path");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Authentication");
      expect(result.suggestions?.some(s => s.includes("credentials"))).toBe(true);
    });

    it("should report successful push with commit count", async () => {
      const mockGetWorktreeStatus = mock(() => Promise.resolve({
        isClean: false,
        modifiedFiles: 0,
        stagedFiles: 0,
        untrackedFiles: 0,
        aheadCount: 3,
        behindCount: 0,
        hasConflicts: false,
        lastStatusCheck: new Date().toISOString()
      }));
      const mockGetCurrentBranch = mock(() => Promise.resolve("feature"));
      const mockExecuteGitCommand = mock(() => Promise.resolve({
        success: true,
        output: 'pushed successfully',
        error: '',
        exitCode: 0
      }));
      
      service.getWorktreeStatus = mockGetWorktreeStatus;
      (service as any).getCurrentBranch = mockGetCurrentBranch;
      (service as any).executeGitCommand = mockExecuteGitCommand;

      const result = await service.pushWorktree("/fake/path");

      expect(result.success).toBe(true);
      expect(result.message).toContain("3 commit(s)");
    });
  });

  describe("Enhanced Pull Operations", () => {
    it("should prevent pull with uncommitted changes", async () => {
      const mockGetWorktreeStatus = mock(() => Promise.resolve({
        isClean: false,
        modifiedFiles: 2,
        stagedFiles: 1,
        untrackedFiles: 0,
        aheadCount: 0,
        behindCount: 0,
        hasConflicts: false,
        lastStatusCheck: new Date().toISOString()
      }));
      
      service.getWorktreeStatus = mockGetWorktreeStatus;

      const result = await service.pullWorktree("/fake/path");

      expect(result.success).toBe(false);
      expect(result.message).toContain("uncommitted changes");
      expect(result.suggestions?.some(s => s.includes("commit"))).toBe(true);
    });

    it("should handle no changes to pull", async () => {
      const mockGetWorktreeStatus = mock()
        .mockResolvedValueOnce({
          isClean: true,
          modifiedFiles: 0,
          stagedFiles: 0,
          untrackedFiles: 0,
          aheadCount: 0,
          behindCount: 0,
          hasConflicts: false,
          lastStatusCheck: new Date().toISOString()
        })
        .mockResolvedValueOnce({
          isClean: true,
          modifiedFiles: 0,
          stagedFiles: 0,
          untrackedFiles: 0,
          aheadCount: 0,
          behindCount: 0,
          hasConflicts: false,
          lastStatusCheck: new Date().toISOString()
        });
      const mockExecuteGitCommand = mock(() => Promise.resolve({
        success: true,
        output: 'fetched',
        error: '',
        exitCode: 0
      }));
      
      service.getWorktreeStatus = mockGetWorktreeStatus;
      (service as any).executeGitCommand = mockExecuteGitCommand;

      const result = await service.pullWorktree("/fake/path");

      expect(result.success).toBe(true);
      expect(result.message).toContain("Already up to date");
    });

    it("should handle pull conflicts", async () => {
      const mockGetWorktreeStatus = mock()
        .mockResolvedValueOnce({
          isClean: true,
          modifiedFiles: 0,
          stagedFiles: 0,
          untrackedFiles: 0,
          aheadCount: 0,
          behindCount: 0,
          hasConflicts: false,
          lastStatusCheck: new Date().toISOString()
        })
        .mockResolvedValueOnce({
          isClean: true,
          modifiedFiles: 0,
          stagedFiles: 0,
          untrackedFiles: 0,
          aheadCount: 0,
          behindCount: 2,
          hasConflicts: false,
          lastStatusCheck: new Date().toISOString()
        });
      const mockExecuteGitCommand = mock((args: string[]) => {
        if (args[0] === 'fetch') {
          return Promise.resolve({ success: true, output: '', error: '', exitCode: 0 });
        } else if (args[0] === 'pull') {
          return Promise.resolve({ 
            success: false, 
            output: '', 
            error: 'CONFLICT Automatic merge failed', 
            exitCode: 1 
          });
        } else if (args[0] === 'status') {
          return Promise.resolve({ 
            success: true, 
            output: 'UU conflict.txt\n', 
            error: '', 
            exitCode: 0 
          });
        }
        return Promise.resolve({ success: true, output: '', error: '', exitCode: 0 });
      });
      
      service.getWorktreeStatus = mockGetWorktreeStatus;
      (service as any).executeGitCommand = mockExecuteGitCommand;

      const result = await service.pullWorktree("/fake/path");

      expect(result.success).toBe(false);
      expect(result.message).toContain("merge conflicts");
      expect(result.conflicts).toEqual(['conflict.txt']);
      expect(result.suggestions?.some(s => s.includes("Resolve conflicts"))).toBe(true);
    });

    it("should report successful pull with commit count", async () => {
      const mockGetWorktreeStatus = mock()
        .mockResolvedValueOnce({
          isClean: true,
          modifiedFiles: 0,
          stagedFiles: 0,
          untrackedFiles: 0,
          aheadCount: 0,
          behindCount: 3,
          hasConflicts: false,
          lastStatusCheck: new Date().toISOString()
        })
        .mockResolvedValueOnce({
          isClean: true,
          modifiedFiles: 0,
          stagedFiles: 0,
          untrackedFiles: 0,
          aheadCount: 0,
          behindCount: 3,
          hasConflicts: false,
          lastStatusCheck: new Date().toISOString()
        });
      const mockExecuteGitCommand = mock(() => Promise.resolve({
        success: true,
        output: 'pulled successfully',
        error: '',
        exitCode: 0
      }));
      
      service.getWorktreeStatus = mockGetWorktreeStatus;
      (service as any).executeGitCommand = mockExecuteGitCommand;

      const result = await service.pullWorktree("/fake/path");

      expect(result.success).toBe(true);
      expect(result.message).toContain("3 commit(s)");
    });
  });
});