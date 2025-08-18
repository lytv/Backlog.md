import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import matter from "gray-matter";
import type { MilestoneProgress, MilestoneRequirements } from "../types/progress.ts";

export class MilestoneParser {
	private simoneDir: string;
	private requirementsDir: string;

	constructor(projectPath: string) {
		this.simoneDir = join(projectPath, ".simone");
		this.requirementsDir = join(this.simoneDir, "02_REQUIREMENTS");
	}

	/**
	 * Parse all milestones from 02_REQUIREMENTS directory
	 */
	async parseMilestones(): Promise<MilestoneProgress[]> {
		if (!existsSync(this.requirementsDir)) {
			return [];
		}

		try {
			const entries = await readdir(this.requirementsDir);
			const milestones: MilestoneProgress[] = [];

			// Parse milestones overview first for timeline data
			const overviewData = await this.parseMilestonesOverview();

			for (const entry of entries) {
				if (entry.startsWith("M") && entry.includes("_")) {
					const milestonePath = join(this.requirementsDir, entry);
					const stats = await stat(milestonePath);

					if (stats.isDirectory()) {
						const milestone = await this.parseSingleMilestone(entry, milestonePath, overviewData);
						if (milestone) {
							milestones.push(milestone);
						}
					}
				}
			}

			// Sort by milestone ID
			return milestones.sort((a, b) => a.id.localeCompare(b.id));
		} catch (error) {
			console.error("Error parsing milestones:", error);
			return [];
		}
	}

	/**
	 * Parse milestones overview file for timeline and metadata
	 */
	private async parseMilestonesOverview(): Promise<Record<string, any>> {
		const overviewPath = join(this.requirementsDir, "Milestones_Overview.md");
		
		if (!existsSync(overviewPath)) {
			return {};
		}

		try {
			const content = await readFile(overviewPath, "utf-8");
			const overviewData: Record<string, any> = {};

			// Parse timeline information
			const milestoneRegex = /### (M\d+):\s*([^(]+)\s*\(Weeks?\s+(\d+)-(\d+)\)/g;
			let match;
			
			while ((match = milestoneRegex.exec(content)) !== null) {
				const [, id, name, startWeek, endWeek] = match;
				overviewData[id!] = {
					name: name!.trim(),
					startWeek: parseInt(startWeek!, 10),
					endWeek: parseInt(endWeek!, 10),
				};
			}

			// Parse status information
			const statusRegex = /\*\*Status\*\*:\s*📋?\s*([^\n]+)/g;
			const statusMatches = [...content.matchAll(statusRegex)];
			
			const milestoneIds = Object.keys(overviewData).sort();
			statusMatches.forEach((match, index) => {
				if (milestoneIds[index]) {
					const milestoneId = milestoneIds[index]!;
					const status = match[1]!.trim().toLowerCase();
					
					if (status.includes("completed") || status.includes("done")) {
						overviewData[milestoneId]!.status = "completed";
					} else if (status.includes("progress") || status.includes("active")) {
						overviewData[milestoneId]!.status = "in_progress";
					} else if (status.includes("blocked")) {
						overviewData[milestoneId]!.status = "blocked";
					} else {
						overviewData[milestoneId]!.status = "not_started";
					}
				}
			});

			// Parse key features
			const featuresRegex = /\*\*Key Features\*\*:\s*([\s\S]*?)(?=\n\*\*|\n---|\n###|$)/g;
			const featuresMatches = [...content.matchAll(featuresRegex)];
			
			featuresMatches.forEach((match, index) => {
				if (milestoneIds[index]) {
					const milestoneId = milestoneIds[index]!;
					const featuresText = match[1]!.trim();
					const features = featuresText
						.split("\n")
						.filter(line => line.trim().startsWith("-"))
						.map(line => line.replace(/^-\s*/, "").trim());
					
					overviewData[milestoneId]!.keyFeatures = features;
				}
			});

			// Parse deliverables
			const deliverablesRegex = /\*\*Deliverables\*\*:\s*([\s\S]*?)(?=\n\*\*|\n---|\n###|$)/g;
			const deliverablesMatches = [...content.matchAll(deliverablesRegex)];
			
			deliverablesMatches.forEach((match, index) => {
				if (milestoneIds[index]) {
					const milestoneId = milestoneIds[index]!;
					const deliverablesText = match[1]!.trim();
					const deliverables = deliverablesText
						.split("\n")
						.filter(line => line.trim().startsWith("-"))
						.map(line => line.replace(/^-\s*/, "").trim());
					
					overviewData[milestoneId]!.deliverables = deliverables;
				}
			});

			// Parse dependencies
			const dependenciesRegex = /\*\*Dependencies\*\*:\s*([^\n]+)/g;
			const dependencyMatches = [...content.matchAll(dependenciesRegex)];
			
			dependencyMatches.forEach((match, index) => {
				if (milestoneIds[index]) {
					const milestoneId = milestoneIds[index]!;
					const deps = match[1]!.trim();
					
					if (deps.toLowerCase() === "none") {
						overviewData[milestoneId]!.dependencies = [];
					} else {
						overviewData[milestoneId]!.dependencies = deps.split(",").map(d => d.trim());
					}
				}
			});

			return overviewData;
		} catch (error) {
			console.error("Error parsing milestones overview:", error);
			return {};
		}
	}

	/**
	 * Parse a single milestone directory
	 */
	private async parseSingleMilestone(
		directoryName: string, 
		milestonePath: string, 
		overviewData: Record<string, any>
	): Promise<MilestoneProgress | null> {
		try {
			const milestoneId = this.extractMilestoneId(directoryName);
			const milestoneName = this.extractMilestoneName(directoryName);
			
			if (!milestoneId) {
				console.warn(`Invalid milestone directory format: ${directoryName}`);
				return null;
			}

			// Get overview data for this milestone
			const overview = overviewData[milestoneId] || {};

			// Parse milestone requirements from files
			const requirements = await this.parseMilestoneRequirements(milestonePath);
			
			// Determine phase based on milestone ID
			const phase = this.determineMilestonePhase(milestoneId);

			// Calculate completion percentage (will be updated by sprint analyzer)
			const completionPercentage = 0; // Will be calculated based on related sprints

			const milestone: MilestoneProgress = {
				id: milestoneId,
				directoryName: directoryName,
				name: overview.name || milestoneName,
				status: overview.status || "not_started",
				completionPercentage,
				sprints: [], // Will be populated by sprint analyzer
				deliverables: overview.deliverables || requirements.deliverables || [],
				startWeek: overview.startWeek || 0,
				endWeek: overview.endWeek || 0,
				dependencies: overview.dependencies || requirements.dependencies || [],
				risks: requirements.riskMitigation || [],
				estimatedDuration: (overview.endWeek || 0) - (overview.startWeek || 0),
				keyFeatures: overview.keyFeatures || requirements.keyFeatures || [],
				phase,
			};

			return milestone;
		} catch (error) {
			console.error(`Error parsing milestone ${directoryName}:`, error);
			return null;
		}
	}

	/**
	 * Parse milestone requirements from individual files
	 */
	private async parseMilestoneRequirements(milestonePath: string): Promise<MilestoneRequirements> {
		const requirements: MilestoneRequirements = {
			id: "",
			name: "",
			description: "",
			deliverables: [],
			keyFeatures: [],
			dependencies: [],
			successMetrics: [],
			qualityGates: [],
			riskMitigation: [],
			resourceAllocation: {
				developers: 0,
				weeks: 0,
				specializations: [],
			},
		};

		try {
			const files = await readdir(milestonePath);
			
			for (const file of files) {
				if (file.endsWith(".md")) {
					const filePath = join(milestonePath, file);
					const content = await readFile(filePath, "utf-8");
					
					if (file.includes("PRD")) {
						this.parsePRD(content, requirements);
					} else if (file.includes("API_Specs") || file.includes("Database_Schema")) {
						this.parseSpecs(content, requirements);
					} else if (file.includes("User_Stories")) {
						this.parseUserStories(content, requirements);
					}
				}
			}
		} catch (error) {
			console.error(`Error reading milestone requirements from ${milestonePath}:`, error);
		}

		return requirements;
	}

	/**
	 * Parse PRD file for requirements
	 */
	private parsePRD(content: string, requirements: MilestoneRequirements): void {
		// Extract deliverables
		const deliverablesMatch = content.match(/## Deliverables?\s*([\s\S]*?)(?=\n##|\n---|\n#|$)/i);
		if (deliverablesMatch) {
			const deliverables = deliverablesMatch[1]!
				.split("\n")
				.filter(line => line.trim().startsWith("-"))
				.map(line => line.replace(/^-\s*/, "").trim());
			requirements.deliverables.push(...deliverables);
		}

		// Extract key features
		const featuresMatch = content.match(/## (?:Key )?Features?\s*([\s\S]*?)(?=\n##|\n---|\n#|$)/i);
		if (featuresMatch) {
			const features = featuresMatch[1]!
				.split("\n")
				.filter(line => line.trim().startsWith("-"))
				.map(line => line.replace(/^-\s*/, "").trim());
			requirements.keyFeatures.push(...features);
		}

		// Extract success metrics
		const metricsMatch = content.match(/## Success (?:Metrics|Criteria)\s*([\s\S]*?)(?=\n##|\n---|\n#|$)/i);
		if (metricsMatch) {
			const metrics = metricsMatch[1]!
				.split("\n")
				.filter(line => line.trim().startsWith("-"))
				.map(line => line.replace(/^-\s*/, "").trim());
			requirements.successMetrics.push(...metrics);
		}

		// Extract risks
		const risksMatch = content.match(/## Risk(?:s|Mitigation)?\s*([\s\S]*?)(?=\n##|\n---|\n#|$)/i);
		if (risksMatch) {
			const risks = risksMatch[1]!
				.split("\n")
				.filter(line => line.trim().startsWith("-"))
				.map(line => line.replace(/^-\s*/, "").trim());
			requirements.riskMitigation.push(...risks);
		}
	}

	/**
	 * Parse specs file for technical requirements
	 */
	private parseSpecs(content: string, requirements: MilestoneRequirements): void {
		// Extract API endpoints or database tables as deliverables
		const endpointsMatch = content.match(/## (?:API )?Endpoints?\s*([\s\S]*?)(?=\n##|\n---|\n#|$)/i);
		if (endpointsMatch) {
			const endpoints = endpointsMatch[1]!
				.split("\n")
				.filter(line => line.trim().startsWith("-") || line.trim().startsWith("*"))
				.map(line => line.replace(/^[-*]\s*/, "").trim());
			requirements.deliverables.push(...endpoints);
		}

		const tablesMatch = content.match(/## (?:Database )?(?:Tables|Schema)\s*([\s\S]*?)(?=\n##|\n---|\n#|$)/i);
		if (tablesMatch) {
			const tables = tablesMatch[1]!
				.split("\n")
				.filter(line => line.trim().startsWith("-") || line.trim().startsWith("*"))
				.map(line => line.replace(/^[-*]\s*/, "").trim());
			requirements.deliverables.push(...tables);
		}
	}

	/**
	 * Parse user stories file
	 */
	private parseUserStories(content: string, requirements: MilestoneRequirements): void {
		// Extract user stories as features
		const storiesMatch = content.match(/As a.*?I want.*?So that.*?/gs);
		if (storiesMatch) {
			const stories = storiesMatch.map(story => story.trim());
			requirements.keyFeatures.push(...stories);
		}
	}

	/**
	 * Extract milestone ID from directory name (M01, M02, etc.)
	 */
	private extractMilestoneId(directoryName: string): string | null {
		const match = directoryName.match(/^(M\d+)/);
		return match ? match[1]! : null;
	}

	/**
	 * Extract readable milestone name from directory name
	 */
	private extractMilestoneName(directoryName: string): string {
		const parts = directoryName.split("_");
		if (parts.length > 1) {
			return parts.slice(1).join(" ").replace(/_/g, " ");
		}
		return directoryName;
	}

	/**
	 * Determine project phase based on milestone ID
	 */
	private determineMilestonePhase(milestoneId: string): string {
		const milestoneNum = parseInt(milestoneId.replace("M", ""), 10);
		
		if (milestoneNum === 1) return "Foundation";
		if (milestoneNum >= 2 && milestoneNum <= 3) return "Core Features";
		if (milestoneNum >= 4 && milestoneNum <= 5) return "User Experience";
		if (milestoneNum >= 6) return "Polish";
		
		return "Unknown";
	}
}