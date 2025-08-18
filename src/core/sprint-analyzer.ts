import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import matter from "gray-matter";
import type { SprintProgress, TaskDetail, SprintTaskBreakdown } from "../types/progress.ts";

export class SprintAnalyzer {
	private simoneDir: string;
	private sprintsDir: string;

	constructor(projectPath: string) {
		this.simoneDir = join(projectPath, ".simone");
		this.sprintsDir = join(this.simoneDir, "03_SPRINTS");
	}

	/**
	 * Analyze all sprints from 03_SPRINTS directory
	 */
	async analyzeSprints(): Promise<SprintProgress[]> {
		if (!existsSync(this.sprintsDir)) {
			return [];
		}

		try {
			const entries = await readdir(this.sprintsDir);
			const sprints: SprintProgress[] = [];

			for (const entry of entries) {
				if (entry.startsWith("S") && entry.includes("_")) {
					const sprintPath = join(this.sprintsDir, entry);
					const stats = await stat(sprintPath);

					if (stats.isDirectory()) {
						const sprint = await this.analyzeSingleSprint(entry, sprintPath);
						if (sprint) {
							sprints.push(sprint);
						}
					}
				}
			}

			// Sort by sprint ID
			return sprints.sort((a, b) => a.id.localeCompare(b.id));
		} catch (error) {
			console.error("Error analyzing sprints:", error);
			return [];
		}
	}

	/**
	 * Get detailed task breakdown for a specific sprint
	 */
	async getSprintTasks(sprintId: string): Promise<TaskDetail[]> {
		const sprintPath = join(this.sprintsDir, sprintId);
		
		if (!existsSync(sprintPath)) {
			throw new Error(`Sprint ${sprintId} not found`);
		}

		return await this.parseSprintTasks(sprintPath);
	}

	/**
	 * Get complete sprint breakdown with tasks
	 */
	async getSprintBreakdown(sprintId: string): Promise<SprintTaskBreakdown | null> {
		const sprints = await this.analyzeSprints();
		const sprint = sprints.find(s => s.id === sprintId);
		
		if (!sprint) {
			return null;
		}

		const tasks = await this.getSprintTasks(sprintId);
		const completedTasks = tasks.filter(t => t.status === "completed");
		const pendingTasks = tasks.filter(t => t.status === "pending");

		const estimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
		const actualHours = completedTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
		const efficiency = estimatedHours > 0 ? (actualHours / estimatedHours) * 100 : 0;

		return {
			sprint,
			tasks: {
				completed: completedTasks,
				pending: pendingTasks,
				breakdown: {
					totalTasks: tasks.length,
					completedTasks: completedTasks.length,
					pendingTasks: pendingTasks.length,
					completionRate: Math.round((completedTasks.length / tasks.length) * 100),
					estimatedHours,
					actualHours,
					efficiency: Math.round(efficiency),
				},
			},
		};
	}

	/**
	 * Analyze a single sprint directory
	 */
	private async analyzeSingleSprint(directoryName: string, sprintPath: string): Promise<SprintProgress | null> {
		try {
			const sprintId = directoryName;
			
			// Parse sprint metadata
			const metadata = await this.parseSprintMeta(sprintPath);
			
			// Parse tasks to calculate progress
			const tasks = await this.parseSprintTasks(sprintPath);
			const completedTasks = tasks.filter(t => t.status === "completed");
			const pendingTasks = tasks.filter(t => t.status === "pending");
			
			// Calculate completion rate and velocity
			const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
			const velocity = this.calculateVelocity(metadata, completedTasks.length);
			
			// Determine status
			const status = this.determineSprintStatus(metadata, completionRate);
			
			// Extract milestone from sprint ID
			const milestoneMatch = sprintId.match(/S\d+_(M\d+)/);
			const milestone = milestoneMatch ? milestoneMatch[1]! : "Unknown";

			const sprint: SprintProgress = {
				id: sprintId,
				milestone,
				title: metadata.title || this.extractSprintTitle(directoryName),
				status,
				progress: {
					totalTasks: tasks.length,
					completedTasks: completedTasks.length,
					pendingTasks: pendingTasks.length,
					completionRate,
					velocity,
				},
				timeline: {
					startDate: metadata.start_date || "",
					endDate: metadata.end_date || "",
					actualStartDate: metadata.actual_start_date,
					actualEndDate: metadata.actual_end_date,
					durationWeeks: metadata.duration_weeks || 0,
				},
				team: {
					size: metadata.team_size || 0,
					allocation: metadata.team_allocation || [],
				},
				metadata: {
					goal: metadata.sprint_goal || "",
					keyDeliverables: metadata.key_deliverables || [],
					successCriteria: metadata.success_criteria || [],
					dependencies: metadata.dependencies || [],
					risks: metadata.risks || [],
				},
			};

			return sprint;
		} catch (error) {
			console.error(`Error analyzing sprint ${directoryName}:`, error);
			return null;
		}
	}

	/**
	 * Parse sprint_meta.md file for metadata
	 */
	private async parseSprintMeta(sprintPath: string): Promise<Record<string, any>> {
		const metaPath = join(sprintPath, "sprint_meta.md");
		
		if (!existsSync(metaPath)) {
			console.warn(`No sprint_meta.md found in ${sprintPath}`);
			return {};
		}

		try {
			const content = await readFile(metaPath, "utf-8");
			const parsed = matter(content);
			
			// Combine frontmatter data with parsed content
			const metadata = { ...parsed.data };
			
			// Parse additional data from content if needed
			const contentBody = parsed.content;
			
			// Parse key deliverables from content
			const deliverablesMatch = contentBody.match(/## Key Deliverables\s*([\s\S]*?)(?=\n##|\n---|\n#|$)/i);
			if (deliverablesMatch && !metadata.key_deliverables) {
				const deliverables = deliverablesMatch[1]!
					.split("\n")
					.filter(line => line.trim().startsWith("-") || line.trim().startsWith("###"))
					.map(line => line.replace(/^[-#\s]*/, "").trim())
					.filter(line => line.length > 0);
				metadata.key_deliverables = deliverables;
			}

			// Parse success criteria
			const criteriaMatch = contentBody.match(/success_criteria:\s*([\s\S]*?)(?=key_deliverables|dependencies|risks|---|\n\n)/);
			if (criteriaMatch && !metadata.success_criteria) {
				const criteria = criteriaMatch[1]!
					.split("\n")
					.filter(line => line.trim().startsWith("-"))
					.map(line => line.replace(/^-\s*/, "").trim());
				metadata.success_criteria = criteria;
			}

			// Parse dependencies
			const dependenciesMatch = contentBody.match(/dependencies:\s*([\s\S]*?)(?=risks|key_deliverables|---|\n\n)/);
			if (dependenciesMatch && !metadata.dependencies) {
				const dependencies = dependenciesMatch[1]!
					.split("\n")
					.filter(line => line.trim().startsWith("-"))
					.map(line => line.replace(/^-\s*/, "").trim());
				metadata.dependencies = dependencies;
			}

			// Parse risks
			const risksMatch = contentBody.match(/risks:\s*([\s\S]*?)(?=dependencies|key_deliverables|---|\n\n)/);
			if (risksMatch && !metadata.risks) {
				const risks = risksMatch[1]!
					.split("\n")
					.filter(line => line.trim().startsWith("-"))
					.map(line => line.replace(/^-\s*/, "").trim());
				metadata.risks = risks;
			}

			return metadata;
		} catch (error) {
			console.error(`Error parsing sprint metadata from ${metaPath}:`, error);
			return {};
		}
	}

	/**
	 * Parse all tasks from sprint directory
	 */
	private async parseSprintTasks(sprintPath: string): Promise<TaskDetail[]> {
		try {
			const files = await readdir(sprintPath);
			const tasks: TaskDetail[] = [];

			for (const file of files) {
				if (file.endsWith(".md") && !file.includes("sprint_meta")) {
					const task = await this.parseTaskFile(sprintPath, file);
					if (task) {
						tasks.push(task);
					}
				}
			}

			return tasks.sort((a, b) => a.id.localeCompare(b.id));
		} catch (error) {
			console.error(`Error parsing sprint tasks from ${sprintPath}:`, error);
			return [];
		}
	}

	/**
	 * Parse individual task file
	 */
	private async parseTaskFile(sprintPath: string, fileName: string): Promise<TaskDetail | null> {
		try {
			const filePath = join(sprintPath, fileName);
			const content = await readFile(filePath, "utf-8");
			
			// Determine if task is completed based on file name prefix
			const isCompleted = fileName.startsWith("TX") || fileName.includes("COMPLETED");
			
			// Extract task ID and title from filename
			// Support formats: TX01_*, T01_*, COMPLETED_TX01_*, TX01A_*, etc.
			const taskMatch = fileName.match(/^(?:COMPLETED_)?(T[X]?\d+[A-Z]?)(?:_S\d+)?(?:_(.*))?(?:_COMPLETED)?\.md$/);
			if (!taskMatch) {
				console.warn(`Invalid task file format: ${fileName}`);
				return null;
			}

			const taskId = taskMatch[1]!;
			let title = taskMatch[2] || "";
			
			// Clean up title
			if (title) {
				title = title.replace(/_/g, " ").replace(/COMPLETED$/, "").trim();
			}

			// Try to parse frontmatter for additional metadata
			let metadata: Record<string, any> = {};
			try {
				const parsed = matter(content);
				metadata = parsed.data;
				
				// If no title from filename, try to get from frontmatter or content
				if (!title && parsed.data.title) {
					title = parsed.data.title;
				} else if (!title) {
					// Try to extract title from first header in content
					const headerMatch = parsed.content.match(/^#\s+(.+)/m);
					if (headerMatch) {
						title = headerMatch[1]!.trim();
					}
				}
			} catch {
				// If frontmatter parsing fails, just use the content as-is
			}

			// Extract description from content (first paragraph or first few lines)
			let description = "";
			const lines = content.split("\n").filter(line => line.trim() && !line.startsWith("#") && !line.startsWith("---"));
			if (lines.length > 0) {
				description = lines.slice(0, 3).join(" ").substring(0, 200);
				if (description.length === 200) {
					description += "...";
				}
			}

			const task: TaskDetail = {
				id: taskId,
				title: title || `Task ${taskId}`,
				status: isCompleted ? "completed" : "pending",
				fileName,
				path: filePath,
				estimatedHours: metadata.estimated_hours || metadata.estimatedHours,
				actualHours: metadata.actual_hours || metadata.actualHours,
				assignee: metadata.assignee,
				priority: metadata.priority,
				dependencies: metadata.dependencies || [],
				description: description || metadata.description,
			};

			return task;
		} catch (error) {
			console.error(`Error parsing task file ${fileName}:`, error);
			return null;
		}
	}

	/**
	 * Calculate sprint velocity (tasks per day)
	 */
	private calculateVelocity(metadata: Record<string, any>, completedTasks: number): number {
		if (!metadata.start_date || !metadata.end_date || completedTasks === 0) {
			return 0;
		}

		try {
			const startDate = new Date(metadata.start_date);
			const endDate = metadata.actual_end_date ? new Date(metadata.actual_end_date) : new Date(metadata.end_date);
			
			const diffTime = endDate.getTime() - startDate.getTime();
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
			
			if (diffDays <= 0) return 0;
			
			return Math.round((completedTasks / diffDays) * 100) / 100;
		} catch {
			return 0;
		}
	}

	/**
	 * Determine sprint status based on metadata and completion
	 */
	private determineSprintStatus(metadata: Record<string, any>, completionRate: number): SprintProgress["status"] {
		// Check explicit status from metadata
		if (metadata.status) {
			const status = metadata.status.toLowerCase();
			if (status === "completed" || status === "done") return "completed";
			if (status === "active" || status === "in_progress") return "active";
			if (status === "planned" || status === "planned") return "planned";
		}

		// Infer status from completion and dates
		if (completionRate >= 100) {
			return "completed";
		}

		if (metadata.start_date && metadata.end_date) {
			const now = new Date();
			const startDate = new Date(metadata.start_date);
			const endDate = new Date(metadata.end_date);

			if (now < startDate) {
				return "planned";
			} else if (now > endDate && completionRate < 100) {
				return "overdue";
			} else {
				return "active";
			}
		}

		// Default based on completion rate
		if (completionRate > 0) return "active";
		return "planned";
	}

	/**
	 * Extract readable sprint title from directory name
	 */
	private extractSprintTitle(directoryName: string): string {
		// Remove sprint prefix (S##_M##_) and convert underscores to spaces
		const parts = directoryName.split("_");
		if (parts.length > 2) {
			return parts.slice(2).join(" ").replace(/_/g, " ");
		}
		return directoryName.replace(/_/g, " ");
	}
}