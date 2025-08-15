import type { Worktree, CreateWorktreeDto } from "../types/worktree.ts";
import { WorktreeStorage } from "./worktree-storage.ts";
import { GitWorktreeService } from "./git-worktree-service.ts";

/**
 * Repository that combines worktree storage and git operations
 */
export class WorktreeRepository {
  private storage: WorktreeStorage;
  private gitService: GitWorktreeService;

  constructor(projectRoot: string) {
    this.storage = new WorktreeStorage(projectRoot);
    this.gitService = new GitWorktreeService(projectRoot);
  }

  /**
   * Create a new worktree (both git worktree and metadata)
   */
  async create(dto: CreateWorktreeDto): Promise<Worktree> {
    // Create git worktree
    const gitWorktree = await this.gitService.createWorktree(dto.name, dto.branch, dto.basePath);
    
    // Create metadata record
    const worktree = this.storage.createWorktreeFromDto({
      ...dto,
      // Use the path from git worktree creation
      basePath: gitWorktree.path
    });

    // Override with git worktree data
    worktree.id = gitWorktree.id;
    worktree.path = gitWorktree.path;
    worktree.baseBranch = gitWorktree.baseBranch;
    worktree.status = gitWorktree.status;

    // Save metadata
    await this.storage.saveWorktree(worktree);

    return worktree;
  }

  /**
   * Find all worktrees
   */
  async findAll(): Promise<Worktree[]> {
    const storedWorktrees = await this.storage.listWorktrees();
    const gitWorktrees = await this.gitService.listWorktrees();

    // Sync stored worktrees with git worktrees
    const syncedWorktrees: Worktree[] = [];

    for (const stored of storedWorktrees) {
      const gitWorktree = gitWorktrees.find(git => git.path === stored.path);
      
      if (gitWorktree) {
        // Worktree exists in git, update status
        try {
          const status = await this.gitService.getWorktreeStatus(stored.path);
          stored.status = status;
          stored.isActive = true;
          await this.storage.saveWorktree(stored);
        } catch (error) {
          console.warn(`Failed to update status for worktree ${stored.id}:`, error);
          stored.isActive = false;
        }
        syncedWorktrees.push(stored);
      } else {
        // Worktree doesn't exist in git anymore, mark as inactive
        stored.isActive = false;
        await this.storage.saveWorktree(stored);
        syncedWorktrees.push(stored);
      }
    }

    return syncedWorktrees;
  }

  /**
   * Find worktree by ID
   */
  async findById(id: string): Promise<Worktree | null> {
    const worktree = await this.storage.loadWorktree(id);
    if (!worktree) {
      return null;
    }

    // Update status if worktree is active
    if (worktree.isActive) {
      try {
        const status = await this.gitService.getWorktreeStatus(worktree.path);
        worktree.status = status;
        await this.storage.saveWorktree(worktree);
      } catch (error) {
        console.warn(`Failed to update status for worktree ${id}:`, error);
        worktree.isActive = false;
        await this.storage.saveWorktree(worktree);
      }
    }

    return worktree;
  }

  /**
   * Find worktrees by task ID
   */
  async findByTaskId(taskId: string): Promise<Worktree[]> {
    return await this.storage.findWorktreesByTaskId(taskId);
  }

  /**
   * Update worktree metadata
   */
  async update(id: string, updates: Partial<Worktree>): Promise<Worktree | null> {
    return await this.storage.updateWorktree(id, updates);
  }

  /**
   * Delete worktree (both git worktree and metadata)
   */
  async delete(id: string, force = false): Promise<void> {
    const worktree = await this.storage.loadWorktree(id);
    if (!worktree) {
      throw new Error(`Worktree with ID ${id} not found`);
    }

    // Delete git worktree if it's still active
    if (worktree.isActive) {
      try {
        await this.gitService.deleteWorktree(worktree.path, force);
      } catch (error) {
        // If git deletion fails, we still want to clean up metadata
        console.warn(`Failed to delete git worktree at ${worktree.path}:`, error);
      }
    }

    // Delete metadata
    await this.storage.deleteWorktree(id);
  }

  /**
   * Link worktree to task
   */
  async linkToTask(worktreeId: string, taskId: string): Promise<void> {
    const success = await this.storage.linkWorktreeToTask(worktreeId, taskId);
    if (!success) {
      throw new Error(`Failed to link worktree ${worktreeId} to task ${taskId}`);
    }
  }

  /**
   * Unlink worktree from task
   */
  async unlinkFromTask(worktreeId: string, taskId: string): Promise<void> {
    const success = await this.storage.unlinkWorktreeFromTask(worktreeId, taskId);
    if (!success) {
      throw new Error(`Failed to unlink worktree ${worktreeId} from task ${taskId}`);
    }
  }

  /**
   * Get worktree status (fresh from git)
   */
  async getWorktreeStatus(worktreeId: string): Promise<Worktree | null> {
    const worktree = await this.storage.loadWorktree(worktreeId);
    if (!worktree || !worktree.isActive) {
      return worktree;
    }

    try {
      const status = await this.gitService.getWorktreeStatus(worktree.path);
      worktree.status = status;
      worktree.lastAccessedDate = new Date().toISOString();
      await this.storage.saveWorktree(worktree);
      return worktree;
    } catch (error) {
      console.warn(`Failed to get status for worktree ${worktreeId}:`, error);
      worktree.isActive = false;
      await this.storage.saveWorktree(worktree);
      return worktree;
    }
  }

  /**
   * Merge worktree branch
   */
  async mergeWorktree(worktreeId: string, targetBranch: string) {
    const worktree = await this.storage.loadWorktree(worktreeId);
    if (!worktree || !worktree.isActive) {
      throw new Error(`Worktree ${worktreeId} not found or inactive`);
    }

    return await this.gitService.mergeWorktree(worktree.path, targetBranch);
  }

  /**
   * Push worktree changes with enhanced error handling
   */
  async pushWorktree(worktreeId: string): Promise<{ success: boolean; message: string; suggestions?: string[] }> {
    const worktree = await this.storage.loadWorktree(worktreeId);
    if (!worktree || !worktree.isActive) {
      throw new Error(`Worktree ${worktreeId} not found or inactive`);
    }

    const result = await this.gitService.pushWorktree(worktree.path);
    
    // Update last accessed date
    worktree.lastAccessedDate = new Date().toISOString();
    await this.storage.saveWorktree(worktree);
    
    return result;
  }

  /**
   * Pull worktree changes with enhanced conflict handling
   */
  async pullWorktree(worktreeId: string): Promise<{ success: boolean; message: string; conflicts?: string[]; suggestions?: string[] }> {
    const worktree = await this.storage.loadWorktree(worktreeId);
    if (!worktree || !worktree.isActive) {
      throw new Error(`Worktree ${worktreeId} not found or inactive`);
    }

    const result = await this.gitService.pullWorktree(worktree.path);
    
    // Update last accessed date and refresh status
    worktree.lastAccessedDate = new Date().toISOString();
    try {
      const status = await this.gitService.getWorktreeStatus(worktree.path);
      worktree.status = status;
    } catch (error) {
      console.warn(`Failed to update status for worktree ${worktreeId}:`, error);
    }
    await this.storage.saveWorktree(worktree);
    
    return result;
  }

  /**
   * Validate worktree name
   */
  validateWorktreeName(name: string) {
    return this.gitService.validateWorktreeName(name);
  }

  /**
   * Validate worktree path
   */
  async validateWorktreePath(path: string) {
    return await this.gitService.validateWorktreePath(path);
  }

  /**
   * Cleanup stale worktrees (worktrees that no longer exist in git)
   */
  async cleanupStaleWorktrees(): Promise<{ cleaned: number; errors: string[] }> {
    const storedWorktrees = await this.storage.listWorktrees();
    const gitWorktrees = await this.gitService.listWorktrees();
    
    let cleaned = 0;
    const errors: string[] = [];

    for (const stored of storedWorktrees) {
      const gitWorktree = gitWorktrees.find(git => git.path === stored.path);
      
      if (!gitWorktree && stored.isActive) {
        try {
          stored.isActive = false;
          await this.storage.saveWorktree(stored);
          cleaned++;
        } catch (error) {
          errors.push(`Failed to cleanup worktree ${stored.id}: ${error}`);
        }
      }
    }

    return { cleaned, errors };
  }
}