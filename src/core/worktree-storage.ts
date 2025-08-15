import { join } from "node:path";
import { mkdir, unlink } from "node:fs/promises";
import type { Worktree, CreateWorktreeDto } from "../types/worktree.ts";

/**
 * File-based storage for worktree metadata
 * Stores worktree information as JSON files in backlog/worktrees directory
 */
export class WorktreeStorage {
  private readonly projectRoot: string;
  private readonly worktreesDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.worktreesDir = join(projectRoot, "backlog", "worktrees");
  }

  async ensureWorktreesDirectory(): Promise<void> {
    await mkdir(this.worktreesDir, { recursive: true });
  }

  async saveWorktree(worktree: Worktree): Promise<void> {
    await this.ensureWorktreesDirectory();
    const filename = `${worktree.id}.json`;
    const filepath = join(this.worktreesDir, filename);
    const content = JSON.stringify(worktree, null, 2);
    await Bun.write(filepath, content);
  }

  async loadWorktree(worktreeId: string): Promise<Worktree | null> {
    try {
      const filename = `${worktreeId}.json`;
      const filepath = join(this.worktreesDir, filename);
      const file = Bun.file(filepath);
      
      if (!(await file.exists())) {
        return null;
      }

      const content = await file.text();
      return JSON.parse(content) as Worktree;
    } catch (error) {
      console.error(`Failed to load worktree ${worktreeId}:`, error);
      return null;
    }
  }

  async listWorktrees(): Promise<Worktree[]> {
    try {
      await this.ensureWorktreesDirectory();
      const files = await Array.fromAsync(new Bun.Glob("*.json").scan({ cwd: this.worktreesDir }));
      
      const worktrees: Worktree[] = [];
      for (const file of files) {
        const filepath = join(this.worktreesDir, file);
        try {
          const content = await Bun.file(filepath).text();
          const worktree = JSON.parse(content) as Worktree;
          worktrees.push(worktree);
        } catch (error) {
          console.error(`Failed to parse worktree file ${file}:`, error);
        }
      }

      return worktrees.sort((a, b) => a.createdDate.localeCompare(b.createdDate));
    } catch (error) {
      console.error("Failed to list worktrees:", error);
      return [];
    }
  }

  async deleteWorktree(worktreeId: string): Promise<boolean> {
    try {
      const filename = `${worktreeId}.json`;
      const filepath = join(this.worktreesDir, filename);
      await unlink(filepath);
      return true;
    } catch (error) {
      console.error(`Failed to delete worktree ${worktreeId}:`, error);
      return false;
    }
  }

  async findWorktreesByTaskId(taskId: string): Promise<Worktree[]> {
    const allWorktrees = await this.listWorktrees();
    return allWorktrees.filter(worktree => worktree.taskIds.includes(taskId));
  }

  async linkWorktreeToTask(worktreeId: string, taskId: string): Promise<boolean> {
    try {
      const worktree = await this.loadWorktree(worktreeId);
      if (!worktree) {
        return false;
      }

      if (!worktree.taskIds.includes(taskId)) {
        worktree.taskIds.push(taskId);
        await this.saveWorktree(worktree);
      }

      return true;
    } catch (error) {
      console.error(`Failed to link worktree ${worktreeId} to task ${taskId}:`, error);
      return false;
    }
  }

  async unlinkWorktreeFromTask(worktreeId: string, taskId: string): Promise<boolean> {
    try {
      const worktree = await this.loadWorktree(worktreeId);
      if (!worktree) {
        return false;
      }

      const index = worktree.taskIds.indexOf(taskId);
      if (index > -1) {
        worktree.taskIds.splice(index, 1);
        await this.saveWorktree(worktree);
      }

      return true;
    } catch (error) {
      console.error(`Failed to unlink worktree ${worktreeId} from task ${taskId}:`, error);
      return false;
    }
  }

  async updateWorktree(worktreeId: string, updates: Partial<Worktree>): Promise<Worktree | null> {
    try {
      const worktree = await this.loadWorktree(worktreeId);
      if (!worktree) {
        return null;
      }

      const updatedWorktree = { ...worktree, ...updates };
      await this.saveWorktree(updatedWorktree);
      return updatedWorktree;
    } catch (error) {
      console.error(`Failed to update worktree ${worktreeId}:`, error);
      return null;
    }
  }

  /**
   * Create a new worktree record from DTO
   */
  createWorktreeFromDto(dto: CreateWorktreeDto): Worktree {
    const now = new Date().toISOString();
    const worktreeId = this.generateWorktreeId(dto.name);

    return {
      id: worktreeId,
      name: dto.name,
      path: dto.basePath ? join(dto.basePath, dto.name) : join(this.projectRoot, '.tree', dto.name),
      branch: dto.branch,
      baseBranch: dto.baseBranch,
      taskIds: dto.taskId ? [dto.taskId] : [],
      status: {
        isClean: true,
        modifiedFiles: 0,
        stagedFiles: 0,
        untrackedFiles: 0,
        aheadCount: 0,
        behindCount: 0,
        hasConflicts: false,
        lastStatusCheck: now
      },
      createdDate: now,
      lastAccessedDate: now,
      isActive: true,
      metadata: {
        description: dto.description,
        tags: dto.tags || [],
        autoCleanup: false
      }
    };
  }

  private generateWorktreeId(name: string): string {
    const sanitized = name.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `wt-${sanitized}-${timestamp}-${random}`;
  }
}