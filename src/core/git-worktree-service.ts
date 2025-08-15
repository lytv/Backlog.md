import { spawn } from "node:child_process";
import { access, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { 
  type Worktree, 
  type WorktreeStatus, 
  type MergeResult, 
  type ValidationResult, 
  type WorktreeError, 
  WorktreeErrorCode,
  type CommandResult 
} from "../types/worktree.ts";

/**
 * Service for executing Git worktree operations
 */
export class GitWorktreeService {
  private readonly projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Create a new git worktree
   */
  async createWorktree(name: string, branch: string, basePath?: string): Promise<Worktree> {
    // Validate inputs
    const nameValidation = this.validateWorktreeName(name);
    if (!nameValidation.isValid) {
      throw this.createError(WorktreeErrorCode.VALIDATION_ERROR, nameValidation.errors.join(', '));
    }

    const worktreePath = basePath ? join(basePath, name) : join(this.projectRoot, '.tree', name);
    const pathValidation = await this.validateWorktreePath(worktreePath);
    if (!pathValidation.isValid) {
      throw this.createError(WorktreeErrorCode.VALIDATION_ERROR, pathValidation.errors.join(', '));
    }

    try {
      // Check if branch exists
      const branchExists = await this.checkBranchExists(branch);
      let result;
      
      if (!branchExists) {
        console.log(`Branch '${branch}' does not exist, creating it with worktree`);
        // Create worktree with new branch using -b flag
        result = await this.executeGitCommand(['worktree', 'add', '-b', branch, worktreePath]);
      } else {
        // Create worktree using existing branch
        result = await this.executeGitCommand(['worktree', 'add', worktreePath, branch]);
      }
      if (!result.success) {
        throw this.createError(WorktreeErrorCode.GIT_COMMAND_FAILED, result.error || 'Failed to create worktree');
      }

      // Get current branch as base branch
      const currentBranch = await this.getCurrentBranch();

      // Create worktree object (will be saved by the calling service)
      const now = new Date().toISOString();
      return {
        id: `wt-${name}-${Date.now().toString(36)}`,
        name,
        path: worktreePath,
        branch,
        baseBranch: currentBranch,
        taskIds: [],
        status: await this.getWorktreeStatus(worktreePath),
        createdDate: now,
        lastAccessedDate: now,
        isActive: true,
        metadata: {
          tags: [],
          autoCleanup: false
        }
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error; // Re-throw WorktreeError
      }
      throw this.createError(WorktreeErrorCode.GIT_COMMAND_FAILED, `Failed to create worktree: ${error}`);
    }
  }

  /**
   * Delete a git worktree
   */
  async deleteWorktree(worktreePath: string, force = false): Promise<void> {
    try {
      // Check if worktree has uncommitted changes
      if (!force) {
        const status = await this.getWorktreeStatus(worktreePath);
        if (!status.isClean) {
          throw this.createError(
            WorktreeErrorCode.UNCOMMITTED_CHANGES, 
            'Worktree has uncommitted changes. Use force=true to delete anyway.',
            { modifiedFiles: status.modifiedFiles, stagedFiles: status.stagedFiles }
          );
        }
      }

      // Remove worktree using git command
      const args = ['worktree', 'remove'];
      if (force) args.push('--force');
      args.push(worktreePath);

      const result = await this.executeGitCommand(args);
      if (!result.success) {
        throw this.createError(WorktreeErrorCode.GIT_COMMAND_FAILED, result.error || 'Failed to delete worktree');
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error; // Re-throw WorktreeError
      }
      throw this.createError(WorktreeErrorCode.GIT_COMMAND_FAILED, `Failed to delete worktree: ${error}`);
    }
  }

  /**
   * List all git worktrees
   */
  async listWorktrees(): Promise<{ name: string; path: string; branch: string }[]> {
    try {
      const result = await this.executeGitCommand(['worktree', 'list', '--porcelain']);
      if (!result.success) {
        throw this.createError(WorktreeErrorCode.GIT_COMMAND_FAILED, result.error || 'Failed to list worktrees');
      }

      return this.parseWorktreeList(result.output);
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.createError(WorktreeErrorCode.GIT_COMMAND_FAILED, `Failed to list worktrees: ${error}`);
    }
  }

  /**
   * Get status of a specific worktree
   */
  async getWorktreeStatus(worktreePath: string): Promise<WorktreeStatus> {
    try {
      // Check if path exists
      try {
        await access(worktreePath);
      } catch {
        throw this.createError(WorktreeErrorCode.WORKTREE_NOT_FOUND, `Worktree path does not exist: ${worktreePath}`);
      }

      // Get git status
      const statusResult = await this.executeGitCommand(['status', '--porcelain'], worktreePath);
      if (!statusResult.success) {
        throw this.createError(WorktreeErrorCode.GIT_COMMAND_FAILED, 'Failed to get worktree status');
      }

      // Parse status output
      const statusLines = statusResult.output.trim().split('\n').filter(line => line.trim());
      let modifiedFiles = 0;
      let stagedFiles = 0;
      let untrackedFiles = 0;
      let hasConflicts = false;

      for (const line of statusLines) {
        const status = line.substring(0, 2);
        if (status.includes('U') || status.includes('A') || status.includes('D')) {
          hasConflicts = true;
        }
        if (status[0] !== ' ' && status[0] !== '?') {
          stagedFiles++;
        }
        if (status[1] !== ' ') {
          if (status[1] === '?') {
            untrackedFiles++;
          } else {
            modifiedFiles++;
          }
        }
      }

      // Get ahead/behind count
      const { aheadCount, behindCount } = await this.getAheadBehindCount(worktreePath);

      return {
        isClean: statusLines.length === 0,
        modifiedFiles,
        stagedFiles,
        untrackedFiles,
        aheadCount,
        behindCount,
        hasConflicts,
        lastStatusCheck: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      // Return default status if we can't get real status
      return {
        isClean: false,
        modifiedFiles: 0,
        stagedFiles: 0,
        untrackedFiles: 0,
        aheadCount: 0,
        behindCount: 0,
        hasConflicts: false,
        lastStatusCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Merge worktree branch into target branch with enhanced conflict detection
   */
  async mergeWorktree(worktreePath: string, targetBranch: string): Promise<MergeResult> {
    try {
      // Get current branch in worktree
      const currentBranch = await this.getCurrentBranch(worktreePath);
      
      // Validate branches
      if (currentBranch === targetBranch) {
        return {
          success: false,
          message: `Cannot merge branch into itself: ${currentBranch}`
        };
      }

      // Check if target branch exists
      const targetExists = await this.checkBranchExists(targetBranch);
      if (!targetExists) {
        return {
          success: false,
          message: `Target branch '${targetBranch}' does not exist`
        };
      }

      // Check for uncommitted changes in worktree
      const worktreeStatus = await this.getWorktreeStatus(worktreePath);
      if (!worktreeStatus.isClean) {
        return {
          success: false,
          message: `Worktree has uncommitted changes. Please commit or stash changes before merging.`,
          conflicts: [],
          uncommittedChanges: true
        };
      }

      // Switch to target branch in main repo
      const checkoutResult = await this.executeGitCommand(['checkout', targetBranch]);
      if (!checkoutResult.success) {
        return {
          success: false,
          message: `Failed to checkout target branch '${targetBranch}': ${checkoutResult.error}`
        };
      }

      // Check if we're up to date with remote
      try {
        await this.executeGitCommand(['fetch']);
      } catch (error) {
        console.warn('Failed to fetch from remote:', error);
      }

      // Perform merge with no-ff to preserve branch history
      const mergeResult = await this.executeGitCommand(['merge', '--no-ff', currentBranch, '-m', `Merge branch '${currentBranch}' into ${targetBranch}`]);
      
      if (!mergeResult.success) {
        // Check for conflicts
        const statusResult = await this.executeGitCommand(['status', '--porcelain']);
        const conflictLines = statusResult.output
          .split('\n')
          .filter(line => line.trim() && (line.startsWith('UU') || line.startsWith('AA') || line.startsWith('DD')));
        
        const conflicts = conflictLines.map(line => {
          const filePath = line.substring(3);
          const status = line.substring(0, 2);
          return {
            file: filePath,
            status: this.getConflictType(status)
          };
        });

        // Try to get more detailed conflict information
        const conflictDetails = await this.getConflictDetails();

        return {
          success: false,
          conflicts: conflicts.map(c => c.file),
          conflictDetails: conflicts,
          message: `Merge failed with ${conflicts.length} conflict(s): ${conflicts.map(c => c.file).join(', ')}`,
          suggestions: [
            'Resolve conflicts manually in the affected files',
            'Use git status to see detailed conflict information',
            'After resolving, use git add <file> and git commit to complete the merge',
            'Or use git merge --abort to cancel the merge'
          ]
        };
      }

      return {
        success: true,
        message: `Successfully merged '${currentBranch}' into '${targetBranch}'`,
        mergedFiles: await this.getMergedFiles(currentBranch, targetBranch)
      };
    } catch (error) {
      return {
        success: false,
        message: `Merge operation failed: ${error}`,
        suggestions: [
          'Check if both branches exist',
          'Ensure you have proper permissions',
          'Verify the repository is in a clean state'
        ]
      };
    }
  }

  /**
   * Get conflict type from git status code
   */
  private getConflictType(statusCode: string): string {
    switch (statusCode) {
      case 'UU': return 'both modified';
      case 'AA': return 'both added';
      case 'DD': return 'both deleted';
      case 'AU': return 'added by us';
      case 'UA': return 'added by them';
      case 'DU': return 'deleted by us';
      case 'UD': return 'deleted by them';
      default: return 'unknown conflict';
    }
  }

  /**
   * Get detailed conflict information
   */
  private async getConflictDetails(): Promise<Array<{file: string, status: string}>> {
    try {
      const result = await this.executeGitCommand(['diff', '--name-status', '--diff-filter=U']);
      return result.output
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [status, file] = line.split('\t');
          return { file, status };
        });
    } catch (error) {
      return [];
    }
  }

  /**
   * Get list of files that were merged
   */
  private async getMergedFiles(sourceBranch: string, targetBranch: string): Promise<string[]> {
    try {
      const result = await this.executeGitCommand(['diff', '--name-only', `${targetBranch}~1`, targetBranch]);
      return result.output.split('\n').filter(line => line.trim());
    } catch (error) {
      return [];
    }
  }

  /**
   * Push worktree changes to remote with enhanced error handling
   */
  async pushWorktree(worktreePath: string): Promise<{ success: boolean; message: string; suggestions?: string[] }> {
    try {
      // Check if worktree has changes to push
      const status = await this.getWorktreeStatus(worktreePath);
      if (status.aheadCount === 0) {
        return {
          success: true,
          message: 'No changes to push - worktree is up to date'
        };
      }

      // Get current branch
      const currentBranch = await this.getCurrentBranch(worktreePath);
      
      // Try to push
      const result = await this.executeGitCommand(['push'], worktreePath);
      
      if (!result.success) {
        // Handle common push errors
        if (result.error.includes('rejected')) {
          if (result.error.includes('non-fast-forward')) {
            return {
              success: false,
              message: 'Push rejected: Remote has changes that conflict with local changes',
              suggestions: [
                'Pull the latest changes first: git pull',
                'Then try pushing again',
                'Or force push if you\'re sure: git push --force-with-lease'
              ]
            };
          } else if (result.error.includes('fetch first')) {
            return {
              success: false,
              message: 'Push rejected: Remote branch has new commits',
              suggestions: [
                'Pull the latest changes first: git pull',
                'Resolve any conflicts if they occur',
                'Then try pushing again'
              ]
            };
          }
        } else if (result.error.includes('permission denied') || result.error.includes('authentication failed')) {
          return {
            success: false,
            message: 'Push failed: Authentication or permission error',
            suggestions: [
              'Check your Git credentials',
              'Verify you have push access to the repository',
              'Try: git config --list to check your configuration'
            ]
          };
        } else if (result.error.includes('remote: Repository not found')) {
          return {
            success: false,
            message: 'Push failed: Remote repository not found',
            suggestions: [
              'Check if the remote URL is correct',
              'Verify the repository exists and you have access',
              'Try: git remote -v to check remote configuration'
            ]
          };
        }

        return {
          success: false,
          message: `Push failed: ${result.error}`,
          suggestions: [
            'Check your internet connection',
            'Verify remote repository configuration',
            'Try pulling latest changes first'
          ]
        };
      }

      return {
        success: true,
        message: `Successfully pushed ${status.aheadCount} commit(s) to remote`
      };
    } catch (error) {
      return {
        success: false,
        message: `Push operation failed: ${error}`,
        suggestions: [
          'Check if the worktree path exists',
          'Verify Git is properly configured',
          'Ensure you have network connectivity'
        ]
      };
    }
  }

  /**
   * Pull changes in worktree with enhanced conflict handling
   */
  async pullWorktree(worktreePath: string): Promise<{ success: boolean; message: string; conflicts?: string[]; suggestions?: string[] }> {
    try {
      // Check current status before pulling
      const statusBefore = await this.getWorktreeStatus(worktreePath);
      
      if (!statusBefore.isClean) {
        return {
          success: false,
          message: 'Cannot pull: Worktree has uncommitted changes',
          suggestions: [
            'Commit your changes: git add . && git commit -m "message"',
            'Or stash them: git stash',
            'Then try pulling again'
          ]
        };
      }

      // Fetch first to get latest remote information
      const fetchResult = await this.executeGitCommand(['fetch'], worktreePath);
      if (!fetchResult.success) {
        return {
          success: false,
          message: `Failed to fetch from remote: ${fetchResult.error}`,
          suggestions: [
            'Check your internet connection',
            'Verify remote repository configuration',
            'Check if remote repository exists'
          ]
        };
      }

      // Check if there are changes to pull
      const statusAfterFetch = await this.getWorktreeStatus(worktreePath);
      if (statusAfterFetch.behindCount === 0) {
        return {
          success: true,
          message: 'Already up to date - no changes to pull'
        };
      }

      // Perform pull
      const pullResult = await this.executeGitCommand(['pull'], worktreePath);
      
      if (!pullResult.success) {
        // Handle merge conflicts during pull
        if (pullResult.error.includes('CONFLICT') || pullResult.error.includes('Automatic merge failed')) {
          const statusResult = await this.executeGitCommand(['status', '--porcelain'], worktreePath);
          const conflicts = statusResult.output
            .split('\n')
            .filter(line => line.startsWith('UU') || line.startsWith('AA'))
            .map(line => line.substring(3));

          return {
            success: false,
            message: `Pull completed with merge conflicts in ${conflicts.length} file(s)`,
            conflicts,
            suggestions: [
              'Resolve conflicts in the affected files',
              'Use git status to see detailed conflict information',
              'After resolving, use: git add <file> && git commit',
              'Or abort the merge: git merge --abort'
            ]
          };
        } else if (pullResult.error.includes('divergent branches')) {
          return {
            success: false,
            message: 'Pull failed: Local and remote branches have diverged',
            suggestions: [
              'Choose merge strategy: git config pull.rebase false',
              'Or use rebase: git config pull.rebase true',
              'Or specify strategy: git pull --no-rebase or git pull --rebase'
            ]
          };
        }

        return {
          success: false,
          message: `Pull failed: ${pullResult.error}`,
          suggestions: [
            'Check if you have uncommitted changes',
            'Verify remote branch exists',
            'Try fetching first: git fetch'
          ]
        };
      }

      // Get final status to report changes
      const statusAfter = await this.getWorktreeStatus(worktreePath);
      const pulledCommits = statusBefore.behindCount;

      return {
        success: true,
        message: `Successfully pulled ${pulledCommits} commit(s) from remote`
      };
    } catch (error) {
      return {
        success: false,
        message: `Pull operation failed: ${error}`,
        suggestions: [
          'Check if the worktree path exists',
          'Verify Git is properly configured',
          'Ensure you have network connectivity'
        ]
      };
    }
  }

  /**
   * Validate worktree name
   */
  validateWorktreeName(name: string): ValidationResult {
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('Worktree name cannot be empty');
    }

    if (name.length > 100) {
      errors.push('Worktree name cannot exceed 100 characters');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      errors.push('Worktree name can only contain letters, numbers, hyphens, and underscores');
    }

    if (name.startsWith('-') || name.endsWith('-')) {
      errors.push('Worktree name cannot start or end with a hyphen');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate worktree path
   */
  async validateWorktreePath(path: string): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!path || path.trim().length === 0) {
      errors.push('Worktree path cannot be empty');
    }

    try {
      const resolvedPath = resolve(path);
      
      // Check if path already exists
      try {
        const stats = await stat(resolvedPath);
        if (stats.isDirectory()) {
          errors.push('Directory already exists at the specified path');
        } else {
          errors.push('A file already exists at the specified path');
        }
      } catch {
        // Path doesn't exist, which is good
      }

      // Check if parent directory exists and is writable
      // This is a basic check - more sophisticated permission checking could be added
    } catch (error) {
      errors.push(`Invalid path: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Private helper methods

  private async executeGitCommand(args: string[], cwd?: string): Promise<CommandResult> {
    return new Promise((resolve) => {
      const process = spawn('git', args, {
        cwd: cwd || this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout.trim(),
          error: stderr.trim(),
          exitCode: code || 0
        });
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          output: '',
          error: error.message,
          exitCode: -1
        });
      });
    });
  }

  private async checkBranchExists(branch: string): Promise<boolean> {
    const result = await this.executeGitCommand(['branch', '--list', branch]);
    return result.success && result.output.includes(branch);
  }

  private async getCurrentBranch(cwd?: string): Promise<string> {
    const result = await this.executeGitCommand(['branch', '--show-current'], cwd);
    if (!result.success) {
      throw this.createError(WorktreeErrorCode.GIT_COMMAND_FAILED, 'Failed to get current branch');
    }
    return result.output.trim();
  }

  private async getAheadBehindCount(worktreePath: string): Promise<{ aheadCount: number; behindCount: number }> {
    try {
      const result = await this.executeGitCommand(['status', '--porcelain=v1', '--branch'], worktreePath);
      if (!result.success) {
        return { aheadCount: 0, behindCount: 0 };
      }

      const branchLine = result.output.split('\n')[0];
      const aheadMatch = branchLine.match(/ahead (\d+)/);
      const behindMatch = branchLine.match(/behind (\d+)/);

      return {
        aheadCount: aheadMatch ? parseInt(aheadMatch[1], 10) : 0,
        behindCount: behindMatch ? parseInt(behindMatch[1], 10) : 0
      };
    } catch {
      return { aheadCount: 0, behindCount: 0 };
    }
  }

  private parseWorktreeList(output: string): { name: string; path: string; branch: string }[] {
    const worktrees: { name: string; path: string; branch: string }[] = [];
    const lines = output.split('\n');
    
    let currentWorktree: Partial<{ name: string; path: string; branch: string }> = {};
    
    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (currentWorktree.path) {
          worktrees.push(currentWorktree as { name: string; path: string; branch: string });
        }
        currentWorktree = { path: line.substring(9) };
        currentWorktree.name = currentWorktree.path.split('/').pop() || '';
      } else if (line.startsWith('branch ')) {
        currentWorktree.branch = line.substring(7);
      }
    }
    
    if (currentWorktree.path) {
      worktrees.push(currentWorktree as { name: string; path: string; branch: string });
    }
    
    return worktrees;
  }

  private createError(code: WorktreeErrorCode, message: string, details?: any): WorktreeError {
    const error = new Error(message) as WorktreeError;
    error.code = code;
    error.message = message;
    error.details = details;
    error.recoverable = this.isRecoverableError(code);
    error.suggestions = this.getSuggestions(code);
    return error;
  }

  private isRecoverableError(code: WorktreeErrorCode): boolean {
    switch (code) {
      case WorktreeErrorCode.VALIDATION_ERROR:
      case WorktreeErrorCode.PATH_ALREADY_EXISTS:
      case WorktreeErrorCode.BRANCH_NOT_FOUND:
        return true;
      default:
        return false;
    }
  }

  private getSuggestions(code: WorktreeErrorCode): string[] {
    switch (code) {
      case WorktreeErrorCode.PATH_ALREADY_EXISTS:
        return ['Choose a different name or path', 'Remove the existing directory first'];
      case WorktreeErrorCode.BRANCH_NOT_FOUND:
        return ['Create the branch first', 'Check the branch name spelling'];
      case WorktreeErrorCode.UNCOMMITTED_CHANGES:
        return ['Commit or stash changes first', 'Use force delete if changes are not needed'];
      default:
        return [];
    }
  }
}