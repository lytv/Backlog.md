import type { Core } from "../core/backlog.ts";
import { ProjectProgressService } from "../core/project-progress.ts";
import { renderProgressTui } from "../ui/progress-tui.ts";
import { createLoadingScreen } from "../ui/loading.ts";

export async function runProgressCommand(
	core: Core,
	options: {
		milestone?: string;
		sprint?: string;
		export?: boolean;
		format?: "json" | "csv" | "pdf";
		health?: boolean;
		milestonesOnly?: boolean;
		sprintsOnly?: boolean;
	} = {}
): Promise<void> {
	const startTime = performance.now();
	const progressService = new ProjectProgressService(core.projectPath);

	// Show loading screen
	const loadingScreen = await createLoadingScreen("Loading project progress");

	try {
		if (options.milestone) {
			loadingScreen?.update("Loading milestone progress...");
			const milestoneProgress = await progressService.getMilestoneProgress(options.milestone);
			loadingScreen?.close();
			
			console.log(`\n📊 Milestone Progress: ${milestoneProgress.milestone.name}`);
			console.log(`Status: ${milestoneProgress.milestone.status}`);
			console.log(`Completion: ${milestoneProgress.milestone.completionPercentage}%`);
			console.log(`Sprints: ${milestoneProgress.sprints.length}`);
			console.log(`Timeline: Week ${milestoneProgress.milestone.startWeek} - ${milestoneProgress.milestone.endWeek}`);
			
			if (milestoneProgress.sprints.length > 0) {
				console.log("\n📋 Related Sprints:");
				for (const sprint of milestoneProgress.sprints) {
					console.log(`  • ${sprint.id}: ${sprint.title} (${sprint.progress.completionRate}%)`);
				}
			}
			
		} else if (options.sprint) {
			loadingScreen?.update("Loading sprint details...");
			const sprintProgress = await progressService.getSprintProgress(options.sprint);
			loadingScreen?.close();
			
			console.log(`\n🏃 Sprint: ${sprintProgress.sprint.title}`);
			console.log(`Status: ${sprintProgress.sprint.status}`);
			console.log(`Progress: ${sprintProgress.sprint.progress.completionRate}%`);
			console.log(`Tasks: ${sprintProgress.sprint.progress.completedTasks}/${sprintProgress.sprint.progress.totalTasks}`);
			console.log(`Velocity: ${sprintProgress.sprint.progress.velocity} tasks/day`);
			console.log(`Timeline: ${sprintProgress.sprint.timeline.startDate} → ${sprintProgress.sprint.timeline.endDate}`);
			
			if (sprintProgress.detailedTasks?.length > 0) {
				console.log(`\n📝 Tasks (${sprintProgress.detailedTasks.length}):`);
				const completed = sprintProgress.detailedTasks.filter(t => t.status === "completed");
				const pending = sprintProgress.detailedTasks.filter(t => t.status === "pending");
				
				if (completed.length > 0) {
					console.log(`\n  ✅ Completed (${completed.length}):`);
					for (const task of completed.slice(0, 5)) {
						console.log(`    • ${task.id}: ${task.title}`);
					}
					if (completed.length > 5) {
						console.log(`    ... and ${completed.length - 5} more`);
					}
				}
				
				if (pending.length > 0) {
					console.log(`\n  ⏳ Pending (${pending.length}):`);
					for (const task of pending.slice(0, 5)) {
						console.log(`    • ${task.id}: ${task.title}`);
					}
					if (pending.length > 5) {
						console.log(`    ... and ${pending.length - 5} more`);
					}
				}
			}
			
		} else if (options.health) {
			loadingScreen?.update("Analyzing project health...");
			const progress = await progressService.getProjectProgress();
			loadingScreen?.close();
			
			const health = progress.healthIndicators;
			console.log(`\n🏥 Project Health: ${health.overallHealth.toUpperCase()}`);
			console.log(`Health Score: ${progress.overallMetrics.performance.healthScore}/100`);
			console.log(`Risk Score: ${progress.overallMetrics.performance.riskScore}/100`);
			
			if (health.issues.riskFactors.length > 0) {
				console.log(`\n⚠️  Risk Factors:`);
				for (const risk of health.issues.riskFactors) {
					console.log(`  • ${risk}`);
				}
			}
			
			if (health.issues.recommendations.length > 0) {
				console.log(`\n💡 Recommendations:`);
				for (const rec of health.issues.recommendations) {
					console.log(`  • ${rec}`);
				}
			}
			
			console.log(`\n📈 Trends:`);
			console.log(`  Velocity: ${health.trends.velocityTrend}`);
			console.log(`  Timeline: ${health.trends.completionTrend}`);
			
		} else if (options.export) {
			loadingScreen?.update("Generating project report...");
			const progress = await progressService.getProjectProgress();
			loadingScreen?.close();
			
			const format = options.format || "json";
			const timestamp = new Date().toISOString().split("T")[0];
			const fileName = `project_progress_${timestamp}.${format}`;
			
			if (format === "json") {
				const fs = await import("node:fs/promises");
				await fs.writeFile(fileName, JSON.stringify(progress, null, 2));
				console.log(`\n📄 Project progress exported to ${fileName}`);
			} else {
				console.log(`\n❌ Export format '${format}' not yet supported`);
			}
			
		} else {
			// Full project overview
			loadingScreen?.update("Loading project overview...");
			const progress = await progressService.getProjectProgress();
			loadingScreen?.close();
			
			const totalTime = Math.round(performance.now() - startTime);
			
			// Apply view filters
			const showMilestones = !options.sprintsOnly;
			const showSprints = !options.milestonesOnly;
			
			// Display TUI or render simple console output
			if (process.stdout.isTTY) {
				await renderProgressTui(progress, { showMilestones, showSprints });
			} else {
				// Plain text output for non-TTY environments
				const viewMode = options.milestonesOnly ? " (Milestones Only)" : 
								options.sprintsOnly ? " (Sprints Only)" : "";
				console.log(`\n📊 VTL SaaS Project Progress${viewMode}`);
				console.log(`=================================`);
				console.log(`Overall Progress: ${progress.overallMetrics.overall.progressPercentage}%`);
				console.log(`Health: ${progress.healthIndicators.overallHealth.toUpperCase()}`);
				
				if (showMilestones) {
					console.log(`\n📋 Milestones (${progress.milestones.length}):`);
					for (const milestone of progress.milestones) {
						const statusIcon = milestone.status === "completed" ? "✅" : 
										 milestone.status === "in_progress" ? "🔄" : 
										 milestone.status === "blocked" ? "🚫" : "⏳";
						console.log(`  ${statusIcon} ${milestone.id}: ${milestone.name} (${milestone.completionPercentage}%)`);
					}
				}
				
				if (showSprints) {
					console.log(`\n🏃 Sprints (${progress.sprints.length}):`);
					const recentSprints = progress.sprints.slice(-5);
					for (const sprint of recentSprints) {
						const statusIcon = sprint.status === "completed" ? "✅" : 
										  sprint.status === "active" ? "🔄" : 
										  sprint.status === "overdue" ? "🚨" : "⏳";
						console.log(`  ${statusIcon} ${sprint.id}: ${sprint.progress.completionRate}% (${sprint.progress.completedTasks}/${sprint.progress.totalTasks} tasks)`);
					}
				}
				
				if (!showMilestones && !showSprints) {
					console.log(`\n⚠️  No data to display. Please specify --milestones-only or --sprints-only, or run without filters for full view.`);
				}
				
				console.log(`\n📈 Summary:`);
				console.log(`  Tasks: ${progress.overallMetrics.tasks.completedTasks}/${progress.overallMetrics.tasks.totalTasks} (${progress.overallMetrics.tasks.completionRate}%)`);
				console.log(`  Timeline: Week ${progress.overallMetrics.timeline.currentWeek}/${progress.overallMetrics.timeline.totalWeeks} (${progress.overallMetrics.timeline.progressPercentage}%)`);
				console.log(`  Velocity: ${progress.overallMetrics.sprints.averageVelocity} tasks/day`);
				console.log(`  Status: ${progress.overallMetrics.timeline.onTrack ? "On Track" : "Behind Schedule"}`);
			}
			
			console.log(`\nLoaded in ${totalTime}ms`);
		}
		
	} catch (error) {
		loadingScreen?.close();
		console.error("❌ Error loading project progress:", error);
		process.exit(1);
	}
}