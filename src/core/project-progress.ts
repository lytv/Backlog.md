import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { MilestoneParser } from "./milestone-parser.ts";
import { SprintAnalyzer } from "./sprint-analyzer.ts";
import type { ProjectProgress, ProjectMetrics, HealthMetrics } from "../types/progress.ts";

export class ProjectProgressService {
	private projectPath: string;
	private milestoneParser: MilestoneParser;
	private sprintAnalyzer: SprintAnalyzer;

	constructor(projectPath: string) {
		this.projectPath = projectPath;
		this.milestoneParser = new MilestoneParser(projectPath);
		this.sprintAnalyzer = new SprintAnalyzer(projectPath);
	}

	/**
	 * Get comprehensive project progress data
	 */
	async getProjectProgress(): Promise<ProjectProgress> {
		const [milestones, sprints] = await Promise.all([
			this.milestoneParser.parseMilestones(),
			this.sprintAnalyzer.analyzeSprints(),
		]);

		// Link sprints to milestones and update milestone status
		const linkedMilestones = this.linkSprintsToMilestones(milestones, sprints);

		const overallMetrics = this.calculateOverallMetrics(linkedMilestones, sprints);
		const healthIndicators = this.calculateHealthMetrics(linkedMilestones, sprints);

		return {
			milestones: linkedMilestones,
			sprints,
			overallMetrics,
			timeline: this.buildTimeline(linkedMilestones, sprints),
			healthIndicators,
		};
	}

	/**
	 * Get progress for specific milestone
	 */
	async getMilestoneProgress(milestoneId: string) {
		const milestones = await this.milestoneParser.parseMilestones();
		const milestone = milestones.find(m => m.id === milestoneId);
		
		if (!milestone) {
			throw new Error(`Milestone ${milestoneId} not found`);
		}

		// Get related sprints
		const sprints = await this.sprintAnalyzer.analyzeSprints();
		const relatedSprints = sprints.filter(s => s.milestone === milestoneId);

		return {
			milestone,
			sprints: relatedSprints,
			progress: this.calculateMilestoneProgress(milestone, relatedSprints),
		};
	}

	/**
	 * Get progress for specific sprint
	 */
	async getSprintProgress(sprintId: string) {
		const sprints = await this.sprintAnalyzer.analyzeSprints();
		const sprint = sprints.find(s => s.id === sprintId);

		if (!sprint) {
			throw new Error(`Sprint ${sprintId} not found`);
		}

		return {
			sprint,
			detailedTasks: await this.sprintAnalyzer.getSprintTasks(sprintId),
		};
	}

	/**
	 * Link sprints to their corresponding milestones and update milestone status
	 */
	private linkSprintsToMilestones(milestones: any[], sprints: any[]): any[] {
		return milestones.map(milestone => {
			// Find all sprints that belong to this milestone
			// Pattern: SXX_M01_* should match milestone M01
			const relatedSprints = sprints.filter(sprint => {
				const sprintId = sprint.id;
				// Extract milestone ID from sprint ID (e.g., S01_M01_Foundation_Infrastructure -> M01)
				const match = sprintId.match(/S\d+_([^_]+)_/);
				return match && match[1] === milestone.id;
			});

			// Update milestone with related sprints
			const updatedMilestone = {
				...milestone,
				sprints: relatedSprints.map(s => s.id),
			};

			// Update milestone status based on sprint existence and completion
			if (relatedSprints.length === 0) {
				updatedMilestone.status = "not_started";
				updatedMilestone.completionPercentage = 0;
			} else {
				// Calculate completion based on related sprints
				const totalTasks = relatedSprints.reduce((sum, s) => sum + s.progress.totalTasks, 0);
				const completedTasks = relatedSprints.reduce((sum, s) => sum + s.progress.completedTasks, 0);
				const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
				
				updatedMilestone.completionPercentage = completionPercentage;
				
				// Update status based on completion and sprint statuses
				const completedSprints = relatedSprints.filter(s => s.status === "completed").length;
				const blockedSprints = relatedSprints.filter(s => s.status === "blocked").length;
				
				if (completionPercentage >= 100) {
					updatedMilestone.status = "completed";
				} else if (blockedSprints > 0) {
					updatedMilestone.status = "blocked";
				} else if (relatedSprints.length > 0) {
					// If milestone has sprints, it means it has started
					updatedMilestone.status = "in_progress";
				} else {
					updatedMilestone.status = "not_started";
				}
			}

			return updatedMilestone;
		});
	}

	/**
	 * Calculate overall project metrics
	 */
	private calculateOverallMetrics(milestones: any[], sprints: any[]): ProjectMetrics {
		const completedMilestones = milestones.filter(m => m.status === "completed").length;
		const activeMilestones = milestones.filter(m => m.status === "in_progress").length;
		const blockedMilestones = milestones.filter(m => m.status === "blocked").length;

		const completedSprints = sprints.filter(s => s.status === "completed").length;
		const activeSprints = sprints.filter(s => s.status === "active").length;

		const totalTasks = sprints.reduce((sum, s) => sum + s.progress.totalTasks, 0);
		const completedTasks = sprints.reduce((sum, s) => sum + s.progress.completedTasks, 0);

		// Calculate average velocity from completed sprints
		const completedSprintsWithVelocity = sprints.filter(s => s.status === "completed" && s.progress.velocity > 0);
		const averageVelocity = completedSprintsWithVelocity.length > 0
			? completedSprintsWithVelocity.reduce((sum, s) => sum + s.progress.velocity, 0) / completedSprintsWithVelocity.length
			: 0;

		// Calculate overall progress based on milestones
		const milestoneProgress = milestones.reduce((sum, m) => sum + m.completionPercentage, 0) / milestones.length;

		// Timeline calculations
		const projectStartDate = this.getProjectStartDate(milestones, sprints);
		const estimatedEndDate = this.calculateEstimatedEndDate(milestones);
		const currentWeek = this.calculateCurrentWeek(projectStartDate);
		const totalWeeks = this.calculateTotalWeeks(milestones);

		return {
			overall: {
				totalMilestones: milestones.length,
				completedMilestones,
				activeMilestones,
				blockedMilestones,
				progressPercentage: Math.round(milestoneProgress),
			},
			sprints: {
				totalSprints: sprints.length,
				completedSprints,
				activeSprints,
				averageVelocity: Math.round(averageVelocity * 100) / 100,
			},
			tasks: {
				totalTasks,
				completedTasks,
				pendingTasks: totalTasks - completedTasks,
				completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
			},
			timeline: {
				projectStartDate,
				estimatedEndDate,
				currentWeek,
				totalWeeks,
				progressPercentage: totalWeeks > 0 ? Math.round((currentWeek / totalWeeks) * 100) : 0,
				onTrack: this.isProjectOnTrack(milestoneProgress, currentWeek, totalWeeks),
			},
			performance: {
				averageSprintCompletion: this.calculateAverageSprintCompletion(sprints),
				taskVelocity: averageVelocity,
				riskScore: this.calculateRiskScore(milestones, sprints),
				healthScore: this.calculateHealthScore(milestones, sprints),
			},
		};
	}

	/**
	 * Calculate health metrics and identify issues
	 */
	private calculateHealthMetrics(milestones: any[], sprints: any[]): HealthMetrics {
		const overduesprints = sprints.filter(s => s.status === "overdue");
		const blockedMilestones = milestones.filter(m => m.status === "blocked");
		const riskFactors = this.identifyRiskFactors(milestones, sprints);
		const recommendations = this.generateRecommendations(milestones, sprints);

		const healthScore = this.calculateHealthScore(milestones, sprints);
		const overallHealth = healthScore >= 80 ? "healthy" : healthScore >= 60 ? "at_risk" : "critical";

		const velocityTrend = this.calculateVelocityTrend(sprints);
		const completionTrend = this.calculateCompletionTrend(milestones, sprints);

		return {
			overallHealth,
			issues: {
				overduesprints,
				blockedMilestones,
				riskFactors,
				recommendations,
			},
			trends: {
				velocityTrend,
				completionTrend,
			},
		};
	}

	/**
	 * Calculate milestone completion percentage based on its sprints
	 */
	private calculateMilestoneProgress(milestone: any, relatedSprints: any[]) {
		if (relatedSprints.length === 0) {
			return { completionPercentage: 0, status: "not_started" };
		}

		const totalTasks = relatedSprints.reduce((sum, s) => sum + s.progress.totalTasks, 0);
		const completedTasks = relatedSprints.reduce((sum, s) => sum + s.progress.completedTasks, 0);
		
		const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
		
		let status = "not_started";
		if (completionPercentage === 100) {
			status = "completed";
		} else if (completionPercentage > 0) {
			status = "in_progress";
		}

		return { completionPercentage, status };
	}

	/**
	 * Build timeline data for visualization
	 */
	private buildTimeline(milestones: any[], sprints: any[]) {
		return {
			milestones: milestones.map(m => ({
				id: m.id,
				name: m.name,
				startWeek: m.startWeek,
				endWeek: m.endWeek,
				status: m.status,
			})),
			sprints: sprints.map(s => ({
				id: s.id,
				milestone: s.milestone,
				startDate: s.timeline.startDate,
				endDate: s.timeline.endDate,
				status: s.status,
			})),
		};
	}

	/**
	 * Helper methods for calculations
	 */
	private getProjectStartDate(milestones: any[], sprints: any[]): string {
		// Get earliest start date from sprints
		const sprintDates = sprints
			.filter(s => s.timeline.startDate)
			.map(s => new Date(s.timeline.startDate))
			.sort((a, b) => a.getTime() - b.getTime());
		
		return sprintDates.length > 0 ? sprintDates[0]!.toISOString().split("T")[0]! : new Date().toISOString().split("T")[0]!;
	}

	private calculateEstimatedEndDate(milestones: any[]): string {
		// Calculate based on milestone end weeks
		const maxWeek = Math.max(...milestones.map(m => m.endWeek || 0));
		const startDate = new Date();
		const endDate = new Date(startDate.getTime() + maxWeek * 7 * 24 * 60 * 60 * 1000);
		return endDate.toISOString().split("T")[0]!;
	}

	private calculateCurrentWeek(startDate: string): number {
		const start = new Date(startDate);
		const now = new Date();
		const diffTime = now.getTime() - start.getTime();
		const diffWeeks = Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000));
		return Math.max(0, diffWeeks);
	}

	private calculateTotalWeeks(milestones: any[]): number {
		return Math.max(...milestones.map(m => m.endWeek || 0));
	}

	private isProjectOnTrack(progressPercentage: number, currentWeek: number, totalWeeks: number): boolean {
		const expectedProgress = totalWeeks > 0 ? (currentWeek / totalWeeks) * 100 : 0;
		return progressPercentage >= expectedProgress - 10; // 10% tolerance
	}

	private calculateAverageSprintCompletion(sprints: any[]): number {
		const completedSprints = sprints.filter(s => s.status === "completed");
		if (completedSprints.length === 0) return 0;
		
		const avgCompletion = completedSprints.reduce((sum, s) => sum + s.progress.completionRate, 0) / completedSprints.length;
		return Math.round(avgCompletion);
	}

	private calculateRiskScore(milestones: any[], sprints: any[]): number {
		let riskScore = 0;
		
		// Add risk for overdue sprints
		const overdueSprints = sprints.filter(s => s.status === "overdue").length;
		riskScore += overdueSprints * 15;
		
		// Add risk for blocked milestones
		const blockedMilestones = milestones.filter(m => m.status === "blocked").length;
		riskScore += blockedMilestones * 25;
		
		// Add risk for low velocity sprints
		const lowVelocitySprints = sprints.filter(s => s.progress.velocity < 1).length;
		riskScore += lowVelocitySprints * 10;
		
		return Math.min(100, riskScore);
	}

	private calculateHealthScore(milestones: any[], sprints: any[]): number {
		const riskScore = this.calculateRiskScore(milestones, sprints);
		return Math.max(0, 100 - riskScore);
	}

	private identifyRiskFactors(milestones: any[], sprints: any[]): string[] {
		const risks: string[] = [];
		
		const overdueSprints = sprints.filter(s => s.status === "overdue").length;
		if (overdueSprints > 0) {
			risks.push(`${overdueSprints} overdue sprint${overdueSprints > 1 ? "s" : ""}`);
		}
		
		const blockedMilestones = milestones.filter(m => m.status === "blocked").length;
		if (blockedMilestones > 0) {
			risks.push(`${blockedMilestones} blocked milestone${blockedMilestones > 1 ? "s" : ""}`);
		}
		
		const lowVelocitySprints = sprints.filter(s => s.progress.velocity < 1).length;
		if (lowVelocitySprints > 0) {
			risks.push(`${lowVelocitySprints} sprint${lowVelocitySprints > 1 ? "s" : ""} with low velocity`);
		}
		
		return risks;
	}

	private generateRecommendations(milestones: any[], sprints: any[]): string[] {
		const recommendations: string[] = [];
		
		const overdueSprints = sprints.filter(s => s.status === "overdue");
		if (overdueSprints.length > 0) {
			recommendations.push("Review and reschedule overdue sprints");
		}
		
		const blockedMilestones = milestones.filter(m => m.status === "blocked");
		if (blockedMilestones.length > 0) {
			recommendations.push("Address dependencies blocking milestone progress");
		}
		
		const activeSprints = sprints.filter(s => s.status === "active");
		if (activeSprints.length > 3) {
			recommendations.push("Consider reducing concurrent active sprints");
		}
		
		const lowVelocitySprints = sprints.filter(s => s.progress.velocity < 1);
		if (lowVelocitySprints.length > 0) {
			recommendations.push("Investigate and address low sprint velocity");
		}
		
		return recommendations;
	}

	private calculateVelocityTrend(sprints: any[]): "improving" | "stable" | "declining" {
		const recentSprints = sprints
			.filter(s => s.status === "completed")
			.sort((a, b) => new Date(b.timeline.endDate || "").getTime() - new Date(a.timeline.endDate || "").getTime())
			.slice(0, 5); // Last 5 completed sprints
		
		if (recentSprints.length < 2) return "stable";
		
		const firstHalf = recentSprints.slice(0, Math.ceil(recentSprints.length / 2));
		const secondHalf = recentSprints.slice(Math.ceil(recentSprints.length / 2));
		
		const firstAvg = firstHalf.reduce((sum, s) => sum + s.progress.velocity, 0) / firstHalf.length;
		const secondAvg = secondHalf.reduce((sum, s) => sum + s.progress.velocity, 0) / secondHalf.length;
		
		if (firstAvg > secondAvg + 0.2) return "improving";
		if (secondAvg > firstAvg + 0.2) return "declining";
		return "stable";
	}

	private calculateCompletionTrend(milestones: any[], sprints: any[]): "ahead" | "on_track" | "behind" {
		// Compare actual progress vs planned progress
		const totalPlannedWeeks = Math.max(...milestones.map(m => m.endWeek || 0));
		const currentWeek = this.calculateCurrentWeek(this.getProjectStartDate(milestones, sprints));
		const expectedProgress = totalPlannedWeeks > 0 ? (currentWeek / totalPlannedWeeks) * 100 : 0;
		
		const actualProgress = milestones.reduce((sum, m) => sum + m.completionPercentage, 0) / milestones.length;
		
		if (actualProgress > expectedProgress + 10) return "ahead";
		if (actualProgress < expectedProgress - 10) return "behind";
		return "on_track";
	}
}