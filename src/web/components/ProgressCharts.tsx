import React from 'react';
import type { ProjectProgress } from '../../types/progress';

interface ProgressChartsProps {
	progress: ProjectProgress;
}

const ProgressCharts: React.FC<ProgressChartsProps> = ({ progress }) => {
	const { milestones, sprints, overallMetrics } = progress;

	// Calculate milestone completion data for pie chart visualization
	const milestoneStats = {
		completed: milestones.filter(m => m.status === 'completed').length,
		inProgress: milestones.filter(m => m.status === 'in_progress').length,
		blocked: milestones.filter(m => m.status === 'blocked').length,
		notStarted: milestones.filter(m => m.status === 'not_started').length,
	};

	// Calculate sprint status distribution
	const sprintStats = {
		completed: sprints.filter(s => s.status === 'completed').length,
		active: sprints.filter(s => s.status === 'active').length,
		overdue: sprints.filter(s => s.status === 'overdue').length,
		planned: sprints.filter(s => s.status === 'planned').length,
	};

	// Create simple ASCII bar chart for milestones
	const createMilestoneChart = () => {
		const total = milestones.length;
		if (total === 0) return null;

		const data = [
			{ label: 'Completed', count: milestoneStats.completed, color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-400' },
			{ label: 'In Progress', count: milestoneStats.inProgress, color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-400' },
			{ label: 'Blocked', count: milestoneStats.blocked, color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-400' },
			{ label: 'Not Started', count: milestoneStats.notStarted, color: 'bg-gray-400', textColor: 'text-gray-700 dark:text-gray-400' },
		];

		return data.filter(item => item.count > 0);
	};

	// Create sprint status chart
	const createSprintChart = () => {
		const total = sprints.length;
		if (total === 0) return null;

		const data = [
			{ label: 'Completed', count: sprintStats.completed, color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-400' },
			{ label: 'Active', count: sprintStats.active, color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-400' },
			{ label: 'Overdue', count: sprintStats.overdue, color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-400' },
			{ label: 'Planned', count: sprintStats.planned, color: 'bg-gray-400', textColor: 'text-gray-700 dark:text-gray-400' },
		];

		return data.filter(item => item.count > 0);
	};

	const milestoneChartData = createMilestoneChart();
	const sprintChartData = createSprintChart();

	// Calculate some key performance indicators
	const kpiData = [
		{
			label: 'Project Progress',
			value: overallMetrics.overall.progressPercentage,
			unit: '%',
			target: 100,
			color: overallMetrics.overall.progressPercentage >= 50 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
		},
		{
			label: 'Task Completion',
			value: overallMetrics.tasks.completionRate,
			unit: '%',
			target: 100,
			color: overallMetrics.tasks.completionRate >= 70 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
		},
		{
			label: 'Sprint Velocity',
			value: overallMetrics.sprints.averageVelocity,
			unit: 'tasks/day',
			target: 2,
			color: overallMetrics.sprints.averageVelocity >= 1.5 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
		},
		{
			label: 'Health Score',
			value: overallMetrics.performance.healthScore,
			unit: '/100',
			target: 80,
			color: overallMetrics.performance.healthScore >= 80 ? 'text-green-600 dark:text-green-400' : 
				   overallMetrics.performance.healthScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
		}
	];

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
			<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
				📊 Progress Analytics
			</h3>

			{/* Key Performance Indicators */}
			<div className="space-y-4 mb-6">
				<h4 className="font-medium text-gray-900 dark:text-gray-100">Key Metrics</h4>
				<div className="grid grid-cols-1 gap-3">
					{kpiData.map((kpi, index) => (
						<div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
							<div>
								<div className="text-sm text-gray-700 dark:text-gray-300">
									{kpi.label}
								</div>
								<div className="text-xs text-gray-500 dark:text-gray-400">
									Target: {kpi.target}{kpi.unit}
								</div>
							</div>
							<div className="text-right">
								<div className={`text-lg font-bold ${kpi.color}`}>
									{typeof kpi.value === 'number' && kpi.value % 1 !== 0 
										? kpi.value.toFixed(1) 
										: kpi.value}{kpi.unit}
								</div>
								{kpi.target && (
									<div className="text-xs text-gray-500 dark:text-gray-400">
										{kpi.value >= kpi.target ? '✅ On target' : '⚠️ Below target'}
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Milestone Distribution */}
			{milestoneChartData && milestoneChartData.length > 0 && (
				<div className="space-y-4 mb-6">
					<h4 className="font-medium text-gray-900 dark:text-gray-100">Milestone Status</h4>
					<div className="space-y-2">
						{milestoneChartData.map((item, index) => {
							const percentage = milestones.length > 0 ? Math.round((item.count / milestones.length) * 100) : 0;
							return (
								<div key={index} className="flex items-center space-x-3">
									<div className="flex-1">
										<div className="flex justify-between text-sm mb-1">
											<span className={item.textColor}>{item.label}</span>
											<span className="text-gray-600 dark:text-gray-400">
												{item.count} ({percentage}%)
											</span>
										</div>
										<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-circle h-2">
											<div 
												className={`h-2 rounded-circle transition-all duration-300 ${item.color}`}
												style={{ width: `${percentage}%` }}
											></div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Sprint Distribution */}
			{sprintChartData && sprintChartData.length > 0 && (
				<div className="space-y-4">
					<h4 className="font-medium text-gray-900 dark:text-gray-100">Sprint Status</h4>
					<div className="space-y-2">
						{sprintChartData.map((item, index) => {
							const percentage = sprints.length > 0 ? Math.round((item.count / sprints.length) * 100) : 0;
							return (
								<div key={index} className="flex items-center space-x-3">
									<div className="flex-1">
										<div className="flex justify-between text-sm mb-1">
											<span className={item.textColor}>{item.label}</span>
											<span className="text-gray-600 dark:text-gray-400">
												{item.count} ({percentage}%)
											</span>
										</div>
										<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-circle h-2">
											<div 
												className={`h-2 rounded-circle transition-all duration-300 ${item.color}`}
												style={{ width: `${percentage}%` }}
											></div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Timeline Progress */}
			<div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
				<h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Timeline Progress</h4>
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-gray-600 dark:text-gray-400">Project Timeline</span>
						<span className="text-gray-800 dark:text-gray-200">
							Week {overallMetrics.timeline.currentWeek} of {overallMetrics.timeline.totalWeeks}
						</span>
					</div>
					<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-circle h-2">
						<div 
							className={`h-2 rounded-circle transition-all duration-300 ${
								overallMetrics.timeline.onTrack ? 'bg-green-500' : 'bg-yellow-500'
							}`}
							style={{ width: `${overallMetrics.timeline.progressPercentage}%` }}
						></div>
					</div>
					<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
						<span>Started</span>
						<span>{overallMetrics.timeline.progressPercentage}% elapsed</span>
						<span>{overallMetrics.timeline.onTrack ? 'On Track' : 'Behind'}</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ProgressCharts;