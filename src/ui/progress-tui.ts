import blessed from "blessed";
import type { ProjectProgress } from "../types/progress.ts";
import { createScreen } from "./tui.ts";

/**
 * Render project progress in an interactive TUI
 */
export async function renderProgressTui(
	progress: ProjectProgress, 
	options: { showMilestones?: boolean; showSprints?: boolean } = {}
): Promise<void> {
	return new Promise<void>((resolve) => {
		const showMilestones = options.showMilestones !== false;
		const showSprints = options.showSprints !== false;
		
		const viewMode = !showMilestones && showSprints ? " (Sprints Only)" :
						 showMilestones && !showSprints ? " (Milestones Only)" : "";
		
		const screen = createScreen({ title: `VTL SaaS - Project Progress${viewMode}` });

		// Main container
		const container = blessed.box({
			parent: screen,
			width: "100%",
			height: "100%",
		});

		// Header with overall progress
		const headerBox = blessed.box({
			parent: container,
			top: 0,
			left: 0,
			width: "100%",
			height: 5,
			border: { type: "line" },
			style: {
				border: { fg: "cyan" },
			},
			tags: true,
		});

		const healthColor = progress.healthIndicators.overallHealth === "healthy" ? "green" : 
						   progress.healthIndicators.overallHealth === "at_risk" ? "yellow" : "red";

		headerBox.setContent(`{center}{bold}VTL SaaS Project Progress Dashboard{/bold}{/center}\n\n` +
			`{center}Overall Progress: {bold}${progress.overallMetrics.overall.progressPercentage}%{/bold} | ` +
			`Health: {${healthColor}-fg}{bold}${progress.healthIndicators.overallHealth.toUpperCase()}{/bold}{/${healthColor}-fg} | ` +
			`Timeline: {bold}Week ${progress.overallMetrics.timeline.currentWeek}/${progress.overallMetrics.timeline.totalWeeks}{/bold}{/center}`
		);

		// Milestones Section 
		let milestonesBox: blessed.Widgets.BoxElement | null = null;
		if (showMilestones) {
			const milestonesWidth = !showSprints ? "67%" : "33%";
			milestonesBox = blessed.box({
				parent: container,
				top: 5,
				left: 0,
				width: milestonesWidth,
				height: "45%",
				border: { type: "line" },
				label: " 📋 Milestones ",
				style: {
					border: { fg: "blue" },
				},
				tags: true,
				scrollable: true,
				alwaysScroll: true,
				keys: true,
				vi: true,
				mouse: true,
			});

			let milestonesContent = "";
			for (const milestone of progress.milestones) {
				const statusIcon = milestone.status === "completed" ? "✅" : 
								  milestone.status === "in_progress" ? "🔄" : 
								  milestone.status === "blocked" ? "🚫" : "⏳";
				
				const progressBarWidth = !showSprints ? 30 : 15;
				const progressBar = createProgressBar(milestone.completionPercentage, progressBarWidth);
				
				milestonesContent += `${statusIcon} {bold}${milestone.id}{/bold}: ${milestone.name}\n`;
				milestonesContent += `   ${progressBar} ${milestone.completionPercentage}%\n`;
				milestonesContent += `   Phase: {cyan-fg}${milestone.phase}{/cyan-fg}\n`;
				milestonesContent += `   Sprints: ${milestone.sprints.length} | Weeks: ${milestone.startWeek}-${milestone.endWeek}\n\n`;
			}
			milestonesBox.setContent(milestonesContent);
		}

		// Current Sprints Section
		let sprintsBox: blessed.Widgets.BoxElement | null = null;
		if (showSprints) {
			const sprintsLeft = showMilestones ? "33%" : 0;
			const sprintsWidth = !showMilestones ? "67%" : "34%";
			sprintsBox = blessed.box({
				parent: container,
				top: 5,
				left: sprintsLeft,
				width: sprintsWidth,
				height: "45%",
				border: { type: "line" },
				label: " 🏃 Active Sprints ",
				style: {
					border: { fg: "green" },
				},
				tags: true,
				scrollable: true,
				alwaysScroll: true,
				keys: true,
				vi: true,
				mouse: true,
			});

			let sprintsContent = "";
			const activeSprints = progress.sprints.filter(s => s.status === "active" || s.status === "overdue");
			const recentCompleted = progress.sprints.filter(s => s.status === "completed").slice(-3);

			if (activeSprints.length > 0) {
				sprintsContent += "{bold}🔄 Active:{/bold}\n";
				for (const sprint of activeSprints) {
					const statusColor = sprint.status === "overdue" ? "red" : "yellow";
					const progressBarWidth = !showMilestones ? 25 : 12;
					const progressBar = createProgressBar(sprint.progress.completionRate, progressBarWidth);
					
					sprintsContent += `  {${statusColor}-fg}●{/${statusColor}-fg} {bold}${sprint.id}{/bold}\n`;
					sprintsContent += `    ${sprint.title}\n`;
					sprintsContent += `    ${progressBar} ${sprint.progress.completionRate}%\n`;
					sprintsContent += `    Tasks: ${sprint.progress.completedTasks}/${sprint.progress.totalTasks}\n`;
					sprintsContent += `    Velocity: ${sprint.progress.velocity}/day\n\n`;
				}
			}

			if (recentCompleted.length > 0) {
				sprintsContent += "{bold}✅ Recently Completed:{/bold}\n";
				for (const sprint of recentCompleted) {
					sprintsContent += `  {green-fg}●{/green-fg} {bold}${sprint.id}{/bold}\n`;
					sprintsContent += `    ${sprint.title}\n`;
					sprintsContent += `    ${sprint.progress.completedTasks} tasks completed\n\n`;
				}
			}

			if (activeSprints.length === 0 && recentCompleted.length === 0) {
				sprintsContent = "{center}No active sprints{/center}";
			}

			sprintsBox.setContent(sprintsContent);
		}

		// Metrics Section (Always on the right)
		const metricsLeft = showMilestones && showSprints ? "67%" : 
						   showMilestones && !showSprints ? "67%" :
						   !showMilestones && showSprints ? "67%" : "0%";
		const metricsWidth = !showMilestones && !showSprints ? "100%" : "33%";
		
		const metricsBox = blessed.box({
			parent: container,
			top: 5,
			left: metricsLeft,
			width: metricsWidth,
			height: "45%",
			border: { type: "line" },
			label: " 📊 Key Metrics ",
			style: {
				border: { fg: "magenta" },
			},
			tags: true,
		});

		const onTrackIcon = progress.overallMetrics.timeline.onTrack ? "✅" : "⚠️";
		const velocityTrendIcon = progress.healthIndicators.trends.velocityTrend === "improving" ? "📈" : 
								 progress.healthIndicators.trends.velocityTrend === "declining" ? "📉" : "➖";

		metricsBox.setContent(
			`{bold}📋 Tasks:{/bold}\n` +
			`  Total: ${progress.overallMetrics.tasks.totalTasks}\n` +
			`  Completed: {green-fg}${progress.overallMetrics.tasks.completedTasks}{/green-fg}\n` +
			`  Pending: {yellow-fg}${progress.overallMetrics.tasks.pendingTasks}{/yellow-fg}\n` +
			`  Rate: ${progress.overallMetrics.tasks.completionRate}%\n\n` +
			
			`{bold}🏃 Sprints:{/bold}\n` +
			`  Total: ${progress.overallMetrics.sprints.totalSprints}\n` +
			`  Completed: {green-fg}${progress.overallMetrics.sprints.completedSprints}{/green-fg}\n` +
			`  Active: {yellow-fg}${progress.overallMetrics.sprints.activeSprints}{/yellow-fg}\n` +
			`  Avg Velocity: ${progress.overallMetrics.sprints.averageVelocity}/day\n\n` +
			
			`{bold}📈 Performance:{/bold}\n` +
			`  Health Score: {${healthColor}-fg}${progress.overallMetrics.performance.healthScore}/100{/${healthColor}-fg}\n` +
			`  Risk Score: ${progress.overallMetrics.performance.riskScore}/100\n` +
			`  On Track: ${onTrackIcon}\n` +
			`  Velocity Trend: ${velocityTrendIcon}\n\n` +
			
			`{bold}📅 Timeline:{/bold}\n` +
			`  Current Week: ${progress.overallMetrics.timeline.currentWeek}\n` +
			`  Total Weeks: ${progress.overallMetrics.timeline.totalWeeks}\n` +
			`  Progress: ${progress.overallMetrics.timeline.progressPercentage}%\n` +
			`  Status: ${progress.healthIndicators.trends.completionTrend}`
		);

		// Health & Issues Section (Bottom)
		const healthBox = blessed.box({
			parent: container,
			top: "50%",
			left: 0,
			width: "100%",
			height: "50%",
			border: { type: "line" },
			label: " 🏥 Health & Issues ",
			style: {
				border: { fg: healthColor },
			},
			tags: true,
			scrollable: true,
			alwaysScroll: true,
			keys: true,
			vi: true,
			mouse: true,
		});

		let healthContent = "";
		
		// Health overview
		healthContent += `{bold}Overall Health: {${healthColor}-fg}${progress.healthIndicators.overallHealth.toUpperCase()}{/${healthColor}-fg}{/bold}\n\n`;

		// Issues
		if (progress.healthIndicators.issues.riskFactors.length > 0) {
			healthContent += "{bold}⚠️  Risk Factors:{/bold}\n";
			for (const risk of progress.healthIndicators.issues.riskFactors) {
				healthContent += `  • ${risk}\n`;
			}
			healthContent += "\n";
		}

		if (progress.healthIndicators.issues.overduesprints.length > 0) {
			healthContent += "{bold}🚨 Overdue Sprints:{/bold}\n";
			for (const sprint of progress.healthIndicators.issues.overduesprints) {
				healthContent += `  • {red-fg}${sprint.id}{/red-fg}: ${sprint.title}\n`;
				healthContent += `    ${sprint.progress.completionRate}% complete, ${sprint.progress.pendingTasks} tasks remaining\n`;
			}
			healthContent += "\n";
		}

		if (progress.healthIndicators.issues.blockedMilestones.length > 0) {
			healthContent += "{bold}🚫 Blocked Milestones:{/bold}\n";
			for (const milestone of progress.healthIndicators.issues.blockedMilestones) {
				healthContent += `  • {red-fg}${milestone.id}{/red-fg}: ${milestone.name}\n`;
				healthContent += `    Dependencies: ${milestone.dependencies.join(", ")}\n`;
			}
			healthContent += "\n";
		}

		// Recommendations
		if (progress.healthIndicators.issues.recommendations.length > 0) {
			healthContent += "{bold}💡 Recommendations:{/bold}\n";
			for (const rec of progress.healthIndicators.issues.recommendations) {
				healthContent += `  • ${rec}\n`;
			}
			healthContent += "\n";
		}

		// Trends
		healthContent += `{bold}📈 Trends:{/bold}\n`;
		healthContent += `  Velocity: ${velocityTrendIcon} ${progress.healthIndicators.trends.velocityTrend}\n`;
		healthContent += `  Timeline: ${progress.healthIndicators.trends.completionTrend}\n`;

		if (healthContent.trim() === "") {
			healthContent = "{center}{green-fg}All systems healthy! 🎉{/green-fg}{/center}";
		}

		healthBox.setContent(healthContent);

		// Help text
		const helpBox = blessed.box({
			parent: container,
			bottom: 0,
			left: 0,
			width: "100%",
			height: 1,
			content: "{center}Press 'q' to quit | Arrow keys or Vi keys to scroll{/center}",
			style: {
				fg: "gray",
			},
			tags: true,
		});

		// Event handlers
		screen.key(["escape", "q", "C-c"], () => {
			resolve();
		});

		screen.render();
	});
}

/**
 * Create a simple ASCII progress bar
 */
function createProgressBar(percentage: number, width: number): string {
	const filled = Math.round((percentage / 100) * width);
	const empty = width - filled;
	return "█".repeat(filled) + "░".repeat(empty);
}