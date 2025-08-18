import React from 'react';
import type { ProjectProgress } from '../../types/progress';

interface TaskBreakdownProps {
	progress: ProjectProgress;
}

const TaskBreakdown: React.FC<TaskBreakdownProps> = ({ progress }) => {
	const { tasks, sprints: sprintMetrics, performance } = progress.overallMetrics;

	// Calculate additional metrics
	const activeTasks = sprintMetrics.activeSprints * (tasks.totalTasks / sprintMetrics.totalSprints);
	const pendingTasks = tasks.pendingTasks;
	const completedTasks = tasks.completedTasks;

	// Get velocity trend
	const velocityTrend = progress.healthIndicators.trends.velocityTrend;
	const velocityIcon = velocityTrend === 'improving' ? '📈' : 
					   velocityTrend === 'declining' ? '📉' : '➖';
	const velocityColor = velocityTrend === 'improving' ? 'text-green-600 dark:text-green-400' : 
						 velocityTrend === 'declining' ? 'text-red-600 dark:text-red-400' : 
						 'text-blue-600 dark:text-blue-400';

	// Calculate productivity metrics
	const avgTasksPerSprint = sprintMetrics.totalSprints > 0 ? 
		Math.round(tasks.totalTasks / sprintMetrics.totalSprints) : 0;
	
	const completionVelocity = sprintMetrics.averageVelocity;

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
			<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
				📝 Task Breakdown
			</h3>

			{/* Overall Task Stats */}
			<div className="grid grid-cols-2 gap-4 mb-6">
				<div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
						{tasks.totalTasks}
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Total Tasks
					</div>
				</div>
				<div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<div className="text-2xl font-bold text-green-600 dark:text-green-400">
						{tasks.completionRate}%
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Completion Rate
					</div>
				</div>
			</div>

			{/* Task Distribution */}
			<div className="space-y-3 mb-6">
				<h4 className="font-medium text-gray-900 dark:text-gray-100">Task Distribution</h4>
				
				{/* Completed Tasks */}
				<div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<div className="flex items-center space-x-3">
						<span className="text-lg">✅</span>
						<div>
							<div className="font-medium text-green-800 dark:text-green-200">
								Completed
							</div>
							<div className="text-xs text-green-600 dark:text-green-400">
								Tasks finished successfully
							</div>
						</div>
					</div>
					<div className="text-right">
						<div className="text-lg font-bold text-green-800 dark:text-green-200">
							{completedTasks}
						</div>
						<div className="text-xs text-green-600 dark:text-green-400">
							{Math.round((completedTasks / tasks.totalTasks) * 100)}%
						</div>
					</div>
				</div>

				{/* Pending Tasks */}
				<div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
					<div className="flex items-center space-x-3">
						<span className="text-lg">⏳</span>
						<div>
							<div className="font-medium text-yellow-800 dark:text-yellow-200">
								Pending
							</div>
							<div className="text-xs text-yellow-600 dark:text-yellow-400">
								Tasks in progress or planned
							</div>
						</div>
					</div>
					<div className="text-right">
						<div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
							{pendingTasks}
						</div>
						<div className="text-xs text-yellow-600 dark:text-yellow-400">
							{Math.round((pendingTasks / tasks.totalTasks) * 100)}%
						</div>
					</div>
				</div>
			</div>

			{/* Progress Visualization */}
			<div className="mb-6">
				<div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
					<span>Overall Progress</span>
					<span>{tasks.completionRate}%</span>
				</div>
				<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-circle h-3">
					<div 
						className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-circle transition-all duration-300"
						style={{ width: `${tasks.completionRate}%` }}
					></div>
				</div>
				<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
					<span>{completedTasks} done</span>
					<span>{pendingTasks} remaining</span>
				</div>
			</div>

			{/* Productivity Metrics */}
			<div className="space-y-3">
				<h4 className="font-medium text-gray-900 dark:text-gray-100">Productivity Metrics</h4>
				
				<div className="grid grid-cols-1 gap-3">
					<div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
						<div className="flex items-center space-x-2">
							<span className={velocityIcon}></span>
							<span className="text-sm text-gray-700 dark:text-gray-300">
								Velocity
							</span>
						</div>
						<div className="text-right">
							<span className={`text-sm font-medium ${velocityColor}`}>
								{completionVelocity} tasks/day
							</span>
						</div>
					</div>

					<div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
						<div className="flex items-center space-x-2">
							<span>📊</span>
							<span className="text-sm text-gray-700 dark:text-gray-300">
								Tasks per Sprint
							</span>
						</div>
						<div className="text-right">
							<span className="text-sm font-medium text-gray-900 dark:text-gray-100">
								~{avgTasksPerSprint} tasks
							</span>
						</div>
					</div>

					<div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
						<div className="flex items-center space-x-2">
							<span>⚡</span>
							<span className="text-sm text-gray-700 dark:text-gray-300">
								Performance Score
							</span>
						</div>
						<div className="text-right">
							<span className={`text-sm font-medium ${
								performance.healthScore >= 80 ? 'text-green-600 dark:text-green-400' :
								performance.healthScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
								'text-red-600 dark:text-red-400'
							}`}>
								{performance.healthScore}/100
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Estimated Completion */}
			{completionVelocity > 0 && pendingTasks > 0 && (
				<div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
					<div className="text-center">
						<div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
							Estimated Completion
						</div>
						<div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
							{Math.ceil(pendingTasks / completionVelocity)} days
						</div>
						<div className="text-xs text-gray-500 dark:text-gray-400">
							At current velocity ({completionVelocity} tasks/day)
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default TaskBreakdown;