// Worktree-related TypeScript interfaces and types

export interface Worktree {
  id: string;
  name: string;
  path: string;
  branch: string;
  baseBranch: string;
  taskIds: string[];
  status: WorktreeStatus;
  createdDate: string;
  lastAccessedDate?: string;
  isActive: boolean;
  metadata: WorktreeMetadata;
}

export interface WorktreeStatus {
  isClean: boolean;
  modifiedFiles: number;
  stagedFiles: number;
  untrackedFiles: number;
  aheadCount: number;
  behindCount: number;
  hasConflicts: boolean;
  lastStatusCheck: string;
}

export interface WorktreeMetadata {
  createdBy?: string;
  description?: string;
  tags: string[];
  autoCleanup: boolean;
  cleanupAfterDays?: number;
}

export interface WorktreeCommand {
  id: string;
  name: string;
  description: string;
  template: string;
  parameters: CommandParameter[];
  category: 'create' | 'delete' | 'merge' | 'sync' | 'status';
}

export interface CommandParameter {
  name: string;
  type: 'string' | 'select' | 'boolean' | 'path';
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: string;
}

export interface CreateWorktreeDto {
  name: string;
  branch: string;
  baseBranch: string;
  basePath?: string;
  taskId?: string;
  description?: string;
  tags?: string[];
}

export interface MergeResult {
  success: boolean;
  conflicts?: string[];
  conflictDetails?: Array<{file: string; status: string}>;
  message: string;
  suggestions?: string[];
  uncommittedChanges?: boolean;
  mergedFiles?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface WorktreeError {
  code: WorktreeErrorCode;
  message: string;
  details?: any;
  suggestions?: string[];
  recoverable: boolean;
}

export enum WorktreeErrorCode {
  GIT_COMMAND_FAILED = 'GIT_COMMAND_FAILED',
  PATH_ALREADY_EXISTS = 'PATH_ALREADY_EXISTS',
  UNCOMMITTED_CHANGES = 'UNCOMMITTED_CHANGES',
  BRANCH_NOT_FOUND = 'BRANCH_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  WORKTREE_NOT_FOUND = 'WORKTREE_NOT_FOUND',
  INVALID_WORKTREE_NAME = 'INVALID_WORKTREE_NAME',
  INVALID_PATH = 'INVALID_PATH'
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}