import { join } from "node:path";
import { DEFAULT_DIRECTORIES, DEFAULT_STATUSES, FALLBACK_STATUS } from "../constants/index.ts";
import { FileSystem } from "../file-system/operations.ts";
import { GitOperations } from "../git/operations.ts";
import type { BacklogConfig, Decision, Document, Sprint, Task } from "../types/index.ts";
import { openInEditor } from "../utils/editor.ts";
import { getTaskFilename, getTaskPath } from "../utils/task-path.ts";
import { migrateConfig, needsMigration } from "./config-migration.ts";
import { filterTasksByLatestState, getLatestTaskStatesForIds } from "./cross-branch-tasks.ts";
import { loadRemoteTasks, resolveTaskConflict } from "./remote-tasks.ts";

interface BlessedScreen {
	program: {
		disableMouse(): void;
		enableMouse(): void;
		hideCursor(): void;
		showCursor(): void;
		input: NodeJS.EventEmitter;
	};
	leave(): void;
	enter(): void;
	render(): void;
	clearRegion(x1: number, x2: number, y1: number, y2: number): void;
	width: number;
	height: number;
	emit(event: string): void;
}

function ensureDescriptionHeader(body: string): string {
	const trimmed = (body || "").trim();
	if (trimmed === "") {
		return "## Description";
	}
	return /^##\s+Description/i.test(trimmed) ? trimmed : `## Description\n\n${trimmed}`;
}

export class Core {
	public fs: FileSystem;
	public git: GitOperations;
	public projectPath: string;

	constructor(projectRoot: string) {
		this.projectPath = projectRoot;
		this.fs = new FileSystem(projectRoot);
		this.git = new GitOperations(projectRoot);
		// Note: Config is loaded lazily when needed since constructor can't be async
	}

	// Backward compatibility aliases
	get filesystem() {
		return this.fs;
	}

	get gitOps() {
		return this.git;
	}

	async ensureConfigLoaded(): Promise<void> {
		try {
			const config = await this.fs.loadConfig();
			this.git.setConfig(config);
		} catch (error) {
			// Config loading failed, git operations will work with null config
			if (process.env.DEBUG) {
				console.warn("Failed to load config for git operations:", error);
			}
		}
	}

	private async getBacklogDirectoryName(): Promise<string> {
		// Always use "backlog" as the directory name
		return DEFAULT_DIRECTORIES.BACKLOG;
	}

	async shouldAutoCommit(overrideValue?: boolean): Promise<boolean> {
		// If override is explicitly provided, use it
		if (overrideValue !== undefined) {
			return overrideValue;
		}
		// Otherwise, check config (default to false for safety)
		const config = await this.fs.loadConfig();
		return config?.autoCommit ?? false;
	}

	async getGitOps() {
		await this.ensureConfigLoaded();
		return this.git;
	}

	// Config migration
	async ensureConfigMigrated(): Promise<void> {
		await this.ensureConfigLoaded();
		let config = await this.fs.loadConfig();

		if (!config || needsMigration(config)) {
			config = migrateConfig(config || {});
			await this.fs.saveConfig(config);
		}
	}

	// ID generation
	async generateNextId(parent?: string): Promise<string> {
		// Ensure git operations have access to the config
		await this.ensureConfigLoaded();

		const config = await this.fs.loadConfig();
		// Load local tasks and drafts in parallel
		const [tasks, drafts] = await Promise.all([this.fs.listTasks(), this.fs.listDrafts()]);

		const allIds: string[] = [];

		// Add local task and draft IDs first
		for (const t of tasks) {
			allIds.push(t.id);
		}
		for (const d of drafts) {
			allIds.push(d.id);
		}

		try {
			const backlogDir = DEFAULT_DIRECTORIES.BACKLOG;

			// Skip remote operations if disabled
			if (config?.remoteOperations === false) {
				if (process.env.DEBUG) {
					console.log("Remote operations disabled - generating ID from local tasks only");
				}
			} else {
				await this.git.fetch();
			}

			// Use recent branches for better performance when generating IDs
			const days = config?.activeBranchDays ?? 30;
			const branches =
				config?.remoteOperations === false
					? await this.git.listLocalBranches()
					: await this.git.listRecentBranches(days);

			// Filter and normalize branch names - handle both local and remote branches
			const normalizedBranches = branches
				.flatMap((branch) => {
					// For remote branches like "origin/feature", extract just "feature"
					// But also try the full remote ref in case it's needed
					if (branch.startsWith("origin/")) {
						return [branch, branch.replace("origin/", "")];
					}
					return [branch];
				})
				// Remove duplicates and filter out HEAD
				.filter((branch, index, arr) => arr.indexOf(branch) === index && branch !== "HEAD" && !branch.includes("HEAD"));

			// Load files from all branches in parallel with better error handling
			const branchFilePromises = normalizedBranches.map(async (branch) => {
				try {
					const files = await this.git.listFilesInTree(branch, `${backlogDir}/tasks`);
					return files
						.map((file) => {
							const match = file.match(/task-(\d+)/);
							return match ? `task-${match[1]}` : null;
						})
						.filter((id): id is string => id !== null);
				} catch (error) {
					// Silently ignore errors for individual branches (they might not exist or be accessible)
					if (process.env.DEBUG) {
						console.log(`Could not access branch ${branch}:`, error);
					}
					return [];
				}
			});

			const branchResults = await Promise.all(branchFilePromises);
			for (const branchIds of branchResults) {
				allIds.push(...branchIds);
			}
		} catch (error) {
			// Suppress errors for offline mode or other git issues
			if (process.env.DEBUG) {
				console.error("Could not fetch remote task IDs:", error);
			}
		}

		if (parent) {
			const prefix = parent.startsWith("task-") ? parent : `task-${parent}`;
			let max = 0;
			// Iterate over allIds (which now includes both local and remote)
			for (const id of allIds) {
				if (id.startsWith(`${prefix}.`)) {
					const rest = id.slice(prefix.length + 1);
					const num = Number.parseInt(rest.split(".")[0] || "0", 10);
					if (num > max) max = num;
				}
			}
			const nextSubIdNumber = max + 1;
			const padding = config?.zeroPaddedIds;

			if (padding && padding > 0) {
				// Pad sub-tasks to 2 digits. This supports up to 99 sub-tasks,
				// which is a reasonable limit and keeps IDs from getting too long.
				const paddedSubId = String(nextSubIdNumber).padStart(2, "0");
				return `${prefix}.${paddedSubId}`;
			}

			return `${prefix}.${nextSubIdNumber}`;
		}

		let max = 0;
		// Iterate over allIds (which now includes both local and remote)
		for (const id of allIds) {
			const match = id.match(/^task-(\d+)/);
			if (match) {
				const num = Number.parseInt(match[1] || "0", 10);
				if (num > max) max = num;
			}
		}
		const nextIdNumber = max + 1;
		const padding = config?.zeroPaddedIds;

		if (padding && padding > 0) {
			const paddedId = String(nextIdNumber).padStart(padding, "0");
			return `task-${paddedId}`;
		}

		return `task-${nextIdNumber}`;
	}

	// High-level operations that combine filesystem and git
	async createTaskFromData(
		taskData: {
			title: string;
			body?: string;
			status?: string;
			assignee?: string[];
			labels?: string[];
			dependencies?: string[];
			parentTaskId?: string;
			priority?: "high" | "medium" | "low";
		},
		autoCommit?: boolean,
	): Promise<Task> {
		const id = await this.generateNextId();

		const task: Task = {
			id,
			title: taskData.title,
			body: taskData.body || "",
			status: taskData.status || "",
			assignee: taskData.assignee || [],
			labels: taskData.labels || [],
			dependencies: taskData.dependencies || [],
			createdDate: new Date().toISOString().slice(0, 16).replace("T", " "),
			...(taskData.parentTaskId && { parentTaskId: taskData.parentTaskId }),
			...(taskData.priority && { priority: taskData.priority }),
		};

		// Check if this should be a draft based on status
		if (task.status && task.status.toLowerCase() === "draft") {
			await this.createDraft(task, autoCommit);
		} else {
			await this.createTask(task, autoCommit);
		}

		return task;
	}

	async createTask(task: Task, autoCommit?: boolean): Promise<string> {
		if (!task.status) {
			const config = await this.fs.loadConfig();
			task.status = config?.defaultStatus || FALLBACK_STATUS;
		}

		// Normalize assignee to array if it's a string (YAML allows both string and array)
		// biome-ignore lint/suspicious/noExplicitAny: Required for YAML flexibility
		if (typeof (task as any).assignee === "string") {
			// biome-ignore lint/suspicious/noExplicitAny: Required for YAML flexibility
			(task as any).assignee = [(task as any).assignee];
		}

		task.body = ensureDescriptionHeader(task.body);
		const filepath = await this.fs.saveTask(task);

		if (await this.shouldAutoCommit(autoCommit)) {
			await this.git.addAndCommitTaskFile(task.id, filepath, "create");
		}

		return filepath;
	}

	async createDraft(task: Task, autoCommit?: boolean): Promise<string> {
		// Drafts always have status "Draft", regardless of config default
		task.status = "Draft";

		// Normalize assignee to array if it's a string (YAML allows both string and array)
		// biome-ignore lint/suspicious/noExplicitAny: Required for YAML flexibility
		if (typeof (task as any).assignee === "string") {
			// biome-ignore lint/suspicious/noExplicitAny: Required for YAML flexibility
			(task as any).assignee = [(task as any).assignee];
		}

		task.body = ensureDescriptionHeader(task.body);
		const filepath = await this.fs.saveDraft(task);

		if (await this.shouldAutoCommit(autoCommit)) {
			await this.git.addFile(filepath);
			await this.git.commitTaskChange(task.id, `Create draft ${task.id}`);
		}

		return filepath;
	}

	async updateTask(task: Task, autoCommit?: boolean): Promise<void> {
		// Normalize assignee to array if it's a string (YAML allows both string and array)
		// biome-ignore lint/suspicious/noExplicitAny: Required for YAML flexibility
		if (typeof (task as any).assignee === "string") {
			// biome-ignore lint/suspicious/noExplicitAny: Required for YAML flexibility
			(task as any).assignee = [(task as any).assignee];
		}

		// Always set updatedDate when updating a task
		task.updatedDate = new Date().toISOString().slice(0, 16).replace("T", " ");

		task.body = ensureDescriptionHeader(task.body);
		await this.fs.saveTask(task);

		if (await this.shouldAutoCommit(autoCommit)) {
			const filePath = await getTaskPath(task.id, this);
			if (filePath) {
				await this.git.addAndCommitTaskFile(task.id, filePath, "update");
			}
		}
	}

	async updateTasksBulk(tasks: Task[], commitMessage?: string, autoCommit?: boolean): Promise<void> {
		// Update all tasks without committing individually
		for (const task of tasks) {
			await this.updateTask(task, false); // Don't auto-commit each one
		}

		// Commit all changes at once if auto-commit is enabled
		if (await this.shouldAutoCommit(autoCommit)) {
			const backlogDir = await this.getBacklogDirectoryName();
			await this.git.stageBacklogDirectory(backlogDir);
			await this.git.commitChanges(commitMessage || `Update ${tasks.length} tasks`);
		}
	}

	async archiveTask(taskId: string, autoCommit?: boolean): Promise<boolean> {
		// Get paths before moving the file
		const taskPath = await getTaskPath(taskId, this);
		const taskFilename = await getTaskFilename(taskId, this);

		if (!taskPath || !taskFilename) return false;

		const fromPath = taskPath;
		const toPath = join(await this.fs.getArchiveTasksDir(), taskFilename);

		const success = await this.fs.archiveTask(taskId);

		if (success && (await this.shouldAutoCommit(autoCommit))) {
			// Stage the file move for proper Git tracking
			await this.git.stageFileMove(fromPath, toPath);
			await this.git.commitChanges(`backlog: Archive task ${taskId}`);
		}

		return success;
	}

	async completeTask(taskId: string, autoCommit?: boolean): Promise<boolean> {
		// Get paths before moving the file
		const completedDir = this.fs.completedDir;
		const taskPath = await getTaskPath(taskId, this);
		const taskFilename = await getTaskFilename(taskId, this);

		if (!taskPath || !taskFilename) return false;

		const fromPath = taskPath;
		const toPath = join(completedDir, taskFilename);

		const success = await this.fs.completeTask(taskId);

		if (success && (await this.shouldAutoCommit(autoCommit))) {
			// Stage the file move for proper Git tracking
			await this.git.stageFileMove(fromPath, toPath);
			await this.git.commitChanges(`backlog: Complete task ${taskId}`);
		}

		return success;
	}

	async getDoneTasksByAge(olderThanDays: number): Promise<Task[]> {
		const tasks = await this.fs.listTasks();
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

		return tasks.filter((task) => {
			if (task.status !== "Done") return false;

			// Check updatedDate first, then createdDate as fallback
			const taskDate = task.updatedDate || task.createdDate;
			if (!taskDate) return false;

			const date = new Date(taskDate);
			return date < cutoffDate;
		});
	}

	async archiveDraft(taskId: string, autoCommit?: boolean): Promise<boolean> {
		const success = await this.fs.archiveDraft(taskId);

		if (success && (await this.shouldAutoCommit(autoCommit))) {
			const backlogDir = await this.getBacklogDirectoryName();
			await this.git.stageBacklogDirectory(backlogDir);
			await this.git.commitChanges(`backlog: Archive draft ${taskId}`);
		}

		return success;
	}

	async promoteDraft(taskId: string, autoCommit?: boolean): Promise<boolean> {
		const success = await this.fs.promoteDraft(taskId);

		if (success && (await this.shouldAutoCommit(autoCommit))) {
			const backlogDir = await this.getBacklogDirectoryName();
			await this.git.stageBacklogDirectory(backlogDir);
			await this.git.commitChanges(`backlog: Promote draft ${taskId}`);
		}

		return success;
	}

	async demoteTask(taskId: string, autoCommit?: boolean): Promise<boolean> {
		const success = await this.fs.demoteTask(taskId);

		if (success && (await this.shouldAutoCommit(autoCommit))) {
			const backlogDir = await this.getBacklogDirectoryName();
			await this.git.stageBacklogDirectory(backlogDir);
			await this.git.commitChanges(`backlog: Demote task ${taskId}`);
		}

		return success;
	}

	async createDecision(decision: Decision, autoCommit?: boolean): Promise<void> {
		await this.fs.saveDecision(decision);

		if (await this.shouldAutoCommit(autoCommit)) {
			const backlogDir = await this.getBacklogDirectoryName();
			await this.git.stageBacklogDirectory(backlogDir);
			await this.git.commitChanges(`backlog: Add decision ${decision.id}`);
		}
	}

	async updateDecisionFromContent(decisionId: string, content: string, autoCommit?: boolean): Promise<void> {
		const existingDecision = await this.fs.loadDecision(decisionId);
		if (!existingDecision) {
			throw new Error(`Decision ${decisionId} not found`);
		}

		// Parse the markdown content to extract the decision data
		const matter = await import("gray-matter");
		const { data } = matter.default(content);

		const extractSection = (content: string, sectionName: string): string | undefined => {
			const regex = new RegExp(`## ${sectionName}\\s*([\\s\\S]*?)(?=## |$)`, "i");
			const match = content.match(regex);
			return match ? match[1]?.trim() : undefined;
		};

		const updatedDecision = {
			...existingDecision,
			title: data.title || existingDecision.title,
			status: data.status || existingDecision.status,
			date: data.date || existingDecision.date,
			context: extractSection(content, "Context") || existingDecision.context,
			decision: extractSection(content, "Decision") || existingDecision.decision,
			consequences: extractSection(content, "Consequences") || existingDecision.consequences,
			alternatives: extractSection(content, "Alternatives") || existingDecision.alternatives,
		};

		await this.createDecision(updatedDecision, autoCommit);
	}

	async createDecisionWithTitle(title: string, autoCommit?: boolean): Promise<Decision> {
		// Import the generateNextDecisionId function from CLI
		const { generateNextDecisionId } = await import("../cli.js");
		const id = await generateNextDecisionId(this);

		const decision: Decision = {
			id,
			title,
			date: new Date().toISOString().slice(0, 16).replace("T", " "),
			status: "proposed",
			context: "[Describe the context and problem that needs to be addressed]",
			decision: "[Describe the decision that was made]",
			consequences: "[Describe the consequences of this decision]",
		};

		await this.createDecision(decision, autoCommit);
		return decision;
	}

	async createDocument(doc: Document, autoCommit?: boolean, subPath = ""): Promise<void> {
		await this.fs.saveDocument(doc, subPath);

		if (await this.shouldAutoCommit(autoCommit)) {
			const backlogDir = await this.getBacklogDirectoryName();
			await this.git.stageBacklogDirectory(backlogDir);
			await this.git.commitChanges(`backlog: Add document ${doc.id}`);
		}
	}

	async updateDocument(existingDoc: Document, content: string, autoCommit?: boolean): Promise<void> {
		const updatedDoc = {
			...existingDoc,
			body: content,
			updatedDate: new Date().toISOString().slice(0, 16).replace("T", " "),
		};

		await this.createDocument(updatedDoc, autoCommit);
	}

	async createDocumentWithId(title: string, content: string, autoCommit?: boolean): Promise<Document> {
		// Import the generateNextDocId function from CLI
		const { generateNextDocId } = await import("../cli.js");
		const id = await generateNextDocId(this);

		const document: Document = {
			id,
			title,
			type: "other" as const,
			createdDate: new Date().toISOString().slice(0, 16).replace("T", " "),
			body: content,
		};

		await this.createDocument(document, autoCommit);
		return document;
	}

	async deleteDocument(docId: string, autoCommit?: boolean): Promise<boolean> {
		try {
			const config = await this.fs.loadConfig();
			const shouldAutoCommit = autoCommit ?? config?.autoCommit ?? false;

			// Find the document file by scanning the docs directory
			const docsDir = join(this.projectPath, DEFAULT_DIRECTORIES.BACKLOG, DEFAULT_DIRECTORIES.DOCS);
			
			// Use glob to find the actual file with the correct name
			const files = await Array.fromAsync(new Bun.Glob("doc-*.md").scan({ cwd: docsDir }));
			const normalizedId = docId.replace(/^doc-/, "");
			const docFile = files.find((file) => file.startsWith(`doc-${normalizedId} -`));
			
			if (!docFile) {
				return false;
			}

			const docPath = join(docsDir, docFile);
			await this.fs.deleteFile(docPath);

			// Auto-commit if enabled
			if (shouldAutoCommit) {
				try {
					await this.git.addAndCommit(`Delete document: ${docFile} (${docId})`);
				} catch (gitError) {
					console.warn("Failed to auto-commit document deletion:", gitError);
					// Don't fail the operation if git commit fails
				}
			}

			return true;
		} catch (error) {
			console.error("Error deleting document:", error);
			return false;
		}
	}

	// Sprint operations
	async createSprint(sprint: Sprint, autoCommit?: boolean): Promise<void> {
		await this.fs.saveSprint(sprint);

		const config = await this.fs.loadConfig();
		const shouldAutoCommit = autoCommit ?? config?.autoCommit ?? false;

		if (shouldAutoCommit) {
			try {
				await this.git.addAndCommit(`Create sprint: ${sprint.title} (${sprint.id})`);
			} catch (gitError) {
				console.warn("Failed to auto-commit sprint creation:", gitError);
				// Don't fail the operation if git commit fails
			}
		}
	}

	async updateSprint(existingSprint: Sprint, content: string, autoCommit?: boolean): Promise<void> {
		const updatedSprint = {
			...existingSprint,
			body: content,
			updatedDate: new Date().toISOString().slice(0, 16).replace("T", " "),
		};

		await this.createSprint(updatedSprint, autoCommit);
	}

	async createSprintWithId(title: string, content: string, autoCommit?: boolean): Promise<Sprint> {
		// Import the generateNextSprintId function from CLI
		const { generateNextSprintId } = await import("../cli.js");
		const id = await generateNextSprintId(this);

		const sprint: Sprint = {
			id,
			title,
			type: "other" as const,
			createdDate: new Date().toISOString().slice(0, 16).replace("T", " "),
			body: content,
		};

		await this.createSprint(sprint, autoCommit);
		return sprint;
	}

	async deleteSprint(sprintId: string, autoCommit?: boolean): Promise<boolean> {
		try {
			const config = await this.fs.loadConfig();
			const shouldAutoCommit = autoCommit ?? config?.autoCommit ?? false;

			// Find the sprint file by scanning the sprints directory
			const sprintsDir = join(this.projectPath, DEFAULT_DIRECTORIES.BACKLOG, DEFAULT_DIRECTORIES.SPRINTS);
			
			// Use glob to find the actual file with the correct name
			const files = await Array.fromAsync(new Bun.Glob("sprint-*.md").scan({ cwd: sprintsDir }));
			const normalizedId = sprintId.replace(/^sprint-/, "");
			const sprintFile = files.find((file) => file.startsWith(`sprint-${normalizedId} -`));
			
			if (!sprintFile) {
				return false;
			}

			const sprintPath = join(sprintsDir, sprintFile);
			await this.fs.deleteFile(sprintPath);

			// Auto-commit if enabled
			if (shouldAutoCommit) {
				try {
					await this.git.addAndCommit(`Delete sprint: ${sprintFile} (${sprintId})`);
				} catch (gitError) {
					console.warn("Failed to auto-commit sprint deletion:", gitError);
					// Don't fail the operation if git commit fails
				}
			}

			return true;
		} catch (error) {
			console.error("Error deleting sprint:", error);
			return false;
		}
	}

	async initializeProject(projectName: string, autoCommit = false): Promise<void> {
		await this.fs.ensureBacklogStructure();

		const config: BacklogConfig = {
			projectName: projectName,
			statuses: [...DEFAULT_STATUSES],
			labels: [],
			milestones: [],
			defaultStatus: DEFAULT_STATUSES[0], // Use first status as default
			dateFormat: "yyyy-mm-dd",
			maxColumnWidth: 20, // Default for terminal display
			autoCommit: false, // Default to false for user control
		};

		await this.fs.saveConfig(config);
		// Update git operations with the new config
		await this.ensureConfigLoaded();

		if (autoCommit) {
			const backlogDir = await this.getBacklogDirectoryName();
			await this.git.stageBacklogDirectory(backlogDir);
			await this.git.commitChanges(`backlog: Initialize backlog project: ${projectName}`);
		}
	}

	async listTasksWithMetadata(
		includeBranchMeta = false,
	): Promise<Array<Task & { lastModified?: Date; branch?: string }>> {
		const tasks = await this.fs.listTasks();
		return await Promise.all(
			tasks.map(async (task) => {
				const filePath = await getTaskPath(task.id, this);

				if (filePath) {
					const bunFile = Bun.file(filePath);
					const stats = await bunFile.stat();
					return {
						...task,
						lastModified: new Date(stats.mtime),
						// Only include branch if explicitly requested
						...(includeBranchMeta && {
							branch: (await this.git.getFileLastModifiedBranch(filePath)) || undefined,
						}),
					};
				}
				return task;
			}),
		);
	}

	/**
	 * Open a file in the configured editor with minimal interference
	 * @param filePath - Path to the file to edit
	 * @param screen - Optional blessed screen to suspend (for TUI contexts)
	 */
	async openEditor(filePath: string, screen?: BlessedScreen): Promise<boolean> {
		const config = await this.fs.loadConfig();

		// If no screen provided, use simple editor opening
		if (!screen) {
			return await openInEditor(filePath, config);
		}

		// Store all event listeners before removing them
		const inputListeners = new Map<string, ((...args: any[]) => void)[]>();
		const eventNames = ["keypress", "data", "readable"];

		for (const eventName of eventNames) {
			const listeners = screen.program.input.listeners(eventName);
			if (listeners.length > 0) {
				inputListeners.set(eventName, [...listeners] as ((...args: any[]) => void)[]);
			}
		}

		try {
			// Suspend blessed screen
			screen.program.disableMouse();
			screen.program.hideCursor();
			screen.leave();

			// Remove input listeners temporarily
			for (const eventName of eventNames) {
				screen.program.input.removeAllListeners(eventName);
			}

			// Use the original working editor function (Bun shell API)
			return await openInEditor(filePath, config);
		} finally {
			// Restore blessed screen
			screen.enter();
			screen.program.enableMouse();
			screen.program.showCursor();

			// Restore all the original listeners
			for (const [eventName, listeners] of inputListeners) {
				for (const listener of listeners) {
					screen.program.input.on(eventName, listener);
				}
			}

			// Clear the screen buffer completely and force full redraw
			screen.clearRegion(0, screen.width, 0, screen.height);
			screen.render();

			// Also trigger a resize event to ensure proper layout recalculation
			process.nextTick(() => {
				screen.emit("resize");
			});
		}
	}

	/**
	 * Load and process all tasks with the same logic as CLI overview
	 * This method extracts the common task loading logic for reuse
	 */
	async loadAllTasksForStatistics(
		progressCallback?: (msg: string) => void,
	): Promise<{ tasks: Task[]; drafts: Task[]; statuses: string[] }> {
		const config = await this.fs.loadConfig();
		const statuses = (config?.statuses || DEFAULT_STATUSES) as string[];
		const resolutionStrategy = config?.taskResolutionStrategy || "most_progressed";

		// Load local and completed tasks first
		progressCallback?.("Loading local tasks...");
		const [localTasks, completedTasks] = await Promise.all([
			this.listTasksWithMetadata(),
			this.fs.listCompletedTasks(),
		]);

		// Now load remote tasks with local tasks for optimization
		const remoteTasks = await loadRemoteTasks(
			this.git,
			config,
			progressCallback,
			localTasks, // Pass local tasks to optimize remote loading
		);
		progressCallback?.("Loaded tasks");

		// Create map with local tasks
		const tasksById = new Map<string, Task>(localTasks.map((t) => [t.id, { ...t, source: "local" }]));

		// Add completed tasks to the map
		for (const completedTask of completedTasks) {
			if (!tasksById.has(completedTask.id)) {
				tasksById.set(completedTask.id, { ...completedTask, source: "completed" });
			}
		}

		// Merge remote tasks with local tasks
		progressCallback?.("Merging tasks...");
		for (const remoteTask of remoteTasks) {
			const existing = tasksById.get(remoteTask.id);
			if (!existing) {
				tasksById.set(remoteTask.id, remoteTask);
			} else {
				const resolved = resolveTaskConflict(existing, remoteTask, statuses, resolutionStrategy);
				tasksById.set(remoteTask.id, resolved);
			}
		}

		// Get all tasks as array
		const tasks = Array.from(tasksById.values());
		let activeTasks: Task[];

		if (config?.checkActiveBranches === false) {
			// Skip cross-branch checking for maximum performance
			progressCallback?.("Skipping cross-branch check (disabled in config)...");
			activeTasks = tasks;
		} else {
			// Get the latest state of each task across all branches
			progressCallback?.("Checking task states across branches...");
			const taskIds = tasks.map((t) => t.id);
			const latestTaskDirectories = await getLatestTaskStatesForIds(
				this.git,
				this.fs,
				taskIds,
				progressCallback || (() => {}),
				{
					recentBranchesOnly: true,
					daysAgo: config?.activeBranchDays ?? 30,
				},
			);

			// Filter tasks based on their latest directory location
			activeTasks = filterTasksByLatestState(tasks, latestTaskDirectories);
		}

		// Load drafts
		progressCallback?.("Loading drafts...");
		const drafts = await this.fs.listDrafts();

		return { tasks: activeTasks, drafts, statuses: statuses as string[] };
	}
}
