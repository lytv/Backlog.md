import React, { useState, useEffect } from 'react';
import type { SprintProgress, TaskDetail } from '../../types/progress';

interface SprintDetailModalProps {
	sprint: SprintProgress | null;
	isOpen: boolean;
	onClose: () => void;
}

const SprintDetailModal: React.FC<SprintDetailModalProps> = ({ sprint, isOpen, onClose }) => {
	const [tasks, setTasks] = useState<TaskDetail[]>([]);
	const [loadingTasks, setLoadingTasks] = useState(false);

	// Fetch task details when modal opens
	useEffect(() => {
		const fetchTasks = async () => {
			if (!sprint || !isOpen) return;
			
			setLoadingTasks(true);
			try {
				const response = await fetch(`/api/progress/sprint/${sprint.id}`);
				const data = await response.json();
				if (data.success && data.data.detailedTasks) {
					setTasks(data.data.detailedTasks);
				}
			} catch (error) {
				console.error('Failed to fetch sprint tasks:', error);
			} finally {
				setLoadingTasks(false);
			}
		};

		fetchTasks();
	}, [sprint?.id, isOpen]);

	if (!isOpen || !sprint) return null;

	const getStatusIcon = () => {
		switch (sprint.status) {
			case 'completed': return '✅';
			case 'active': return '🔄';
			case 'overdue': return '🚨';
			default: return '📋';
		}
	};

	const getStatusColor = () => {
		switch (sprint.status) {
			case 'completed': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
			case 'active': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
			case 'overdue': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
			default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
		}
	};

	const getProgressBarColor = () => {
		if (sprint.progress.completionRate >= 100) return 'bg-green-500';
		if (sprint.progress.completionRate >= 75) return 'bg-blue-500';
		if (sprint.progress.completionRate >= 50) return 'bg-yellow-500';
		return 'bg-gray-400';
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('vi-VN');
	};

	// Task helper functions
	const isTaskCompleted = (task: TaskDetail) => {
		return task.id.startsWith('TX') || task.status === 'completed';
	};

	const getTaskStatusIcon = (task: TaskDetail) => {
		if (isTaskCompleted(task)) return '✅';
		return '📝';
	};

	const getTaskStatusColor = (task: TaskDetail) => {
		if (isTaskCompleted(task)) {
			return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
		}
		return 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300';
	};

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			{/* Backdrop */}
			<div 
				className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
				onClick={onClose}
			></div>

			{/* Modal */}
			<div className="flex min-h-full items-center justify-center p-4">
				<div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all w-full max-w-4xl">
					{/* Header */}
					<div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-3">
								<span className="text-2xl">{getStatusIcon()}</span>
								<div>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
										{sprint.id}
									</h3>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										{sprint.title}
									</p>
								</div>
							</div>
							<div className="flex items-center space-x-3">
								<span className={`px-3 py-1 rounded-circle text-sm font-medium ${getStatusColor()}`}>
									{sprint.status.toUpperCase()}
								</span>
								<button
									onClick={onClose}
									className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
								>
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						</div>
					</div>

					{/* Content */}
					<div className="px-6 py-6 max-h-96 overflow-y-auto">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Left Column - Progress & Timeline */}
							<div className="space-y-6">
								{/* Progress Overview */}
								<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
									<h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
										🎯 Progress Overview
									</h4>
									<div className="space-y-3">
										<div className="flex justify-between items-center text-sm">
											<span className="text-gray-600 dark:text-gray-400">Completion</span>
											<span className="font-semibold text-gray-900 dark:text-gray-100">
												{sprint.progress.completionRate}%
											</span>
										</div>
										<div className="w-full bg-gray-200 dark:bg-gray-600 rounded-circle h-3">
											<div 
												className={`h-3 rounded-circle transition-all duration-300 ${getProgressBarColor()}`}
												style={{ width: `${sprint.progress.completionRate}%` }}
											></div>
										</div>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div className="text-center">
												<div className="font-semibold text-green-600 dark:text-green-400">
													{sprint.progress.completedTasks}
												</div>
												<div className="text-gray-500 dark:text-gray-400">Completed</div>
											</div>
											<div className="text-center">
												<div className="font-semibold text-blue-600 dark:text-blue-400">
													{sprint.progress.pendingTasks}
												</div>
												<div className="text-gray-500 dark:text-gray-400">Pending</div>
											</div>
										</div>
									</div>
								</div>

								{/* Timeline */}
								<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
									<h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
										📅 Timeline
									</h4>
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-gray-600 dark:text-gray-400">Start Date:</span>
											<span className="text-gray-900 dark:text-gray-100">
												{formatDate(sprint.timeline.startDate)}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-600 dark:text-gray-400">End Date:</span>
											<span className="text-gray-900 dark:text-gray-100">
												{formatDate(sprint.timeline.endDate)}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-600 dark:text-gray-400">Duration:</span>
											<span className="text-gray-900 dark:text-gray-100">
												{sprint.timeline.durationWeeks} weeks
											</span>
										</div>
										{sprint.timeline.actualStartDate && (
											<div className="flex justify-between">
												<span className="text-gray-600 dark:text-gray-400">Actual Start:</span>
												<span className="text-gray-900 dark:text-gray-100">
													{formatDate(sprint.timeline.actualStartDate)}
												</span>
											</div>
										)}
										{sprint.timeline.actualEndDate && (
											<div className="flex justify-between">
												<span className="text-gray-600 dark:text-gray-400">Actual End:</span>
												<span className="text-gray-900 dark:text-gray-100">
													{formatDate(sprint.timeline.actualEndDate)}
												</span>
											</div>
										)}
									</div>
								</div>

								{/* Team Info */}
								<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
									<h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
										👥 Team
									</h4>
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-gray-600 dark:text-gray-400">Team Size:</span>
											<span className="text-gray-900 dark:text-gray-100">
												{sprint.team.size} members
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-600 dark:text-gray-400">Velocity:</span>
											<span className="text-gray-900 dark:text-gray-100">
												{sprint.progress.velocity.toFixed(1)} tasks/day
											</span>
										</div>
										{sprint.team.allocation.length > 0 && (
											<div>
												<div className="text-gray-600 dark:text-gray-400 mb-1">Allocation:</div>
												<div className="flex flex-wrap gap-1">
													{sprint.team.allocation.map((member, index) => (
														<span 
															key={index}
															className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-xs"
														>
															{member}
														</span>
													))}
												</div>
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Right Column - Details */}
							<div className="space-y-6">
								{/* Sprint Goal */}
								{sprint.metadata.goal && (
									<div>
										<h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
											🎯 Sprint Goal
										</h4>
										<p className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
											{sprint.metadata.goal}
										</p>
									</div>
								)}

								{/* Key Deliverables */}
								{sprint.metadata.keyDeliverables.length > 0 && (
									<div>
										<h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
											📦 Key Deliverables
										</h4>
										<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
											{sprint.metadata.keyDeliverables.map((deliverable, index) => (
												<li key={index} className="flex items-start">
													<span className="text-blue-500 mr-2 flex-shrink-0">•</span>
													<span className="break-words">{deliverable}</span>
												</li>
											))}
										</ul>
									</div>
								)}

								{/* Success Criteria */}
								{sprint.metadata.successCriteria.length > 0 && (
									<div>
										<h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
											✅ Success Criteria
										</h4>
										<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
											{sprint.metadata.successCriteria.map((criteria, index) => (
												<li key={index} className="flex items-start">
													<span className="text-green-500 mr-2 flex-shrink-0">✓</span>
													<span className="break-words">{criteria}</span>
												</li>
											))}
										</ul>
									</div>
								)}

								{/* Dependencies */}
								{sprint.metadata.dependencies.length > 0 && (
									<div>
										<h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
											🔗 Dependencies
										</h4>
										<div className="flex flex-wrap gap-2">
											{sprint.metadata.dependencies.map((dep, index) => (
												<span 
													key={index}
													className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-circle text-xs"
												>
													{dep}
												</span>
											))}
										</div>
									</div>
								)}

								{/* Risks */}
								{sprint.metadata.risks.length > 0 && (
									<div>
										<h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
											⚠️ Risks
										</h4>
										<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
											{sprint.metadata.risks.map((risk, index) => (
												<li key={index} className="flex items-start">
													<span className="text-red-500 mr-2 flex-shrink-0">⚠</span>
													<span className="break-words">{risk}</span>
												</li>
											))}
										</ul>
									</div>
								)}

								{/* Tasks List */}
								<div>
									<h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
										📋 Tasks ({sprint.progress.totalTasks})
									</h4>
									{loadingTasks ? (
										<div className="text-center py-4">
											<div className="inline-block animate-spin rounded-circle h-4 w-4 border-b-2 border-blue-600"></div>
											<span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading tasks...</span>
										</div>
									) : tasks.length > 0 ? (
										<div className="space-y-2 max-h-48 overflow-y-auto">
											{tasks.map((task, index) => (
												<div 
													key={task.id}
													className={`p-2 rounded border text-xs ${getTaskStatusColor(task)}`}
												>
													<div className="flex items-start justify-between">
														<div className="flex items-start space-x-2 min-w-0 flex-1">
															<span className="flex-shrink-0">
																{getTaskStatusIcon(task)}
															</span>
															<div className="min-w-0 flex-1">
																<div className="font-medium truncate">
																	{task.id}: {task.title}
																</div>
																{task.description && (
																	<div className="opacity-75 mt-1 line-clamp-2">
																		{task.description}
																	</div>
																)}
															</div>
														</div>
														<span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ml-2 ${
															isTaskCompleted(task) 
																? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200'
																: 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
														}`}>
															{isTaskCompleted(task) ? 'Done' : 'Pending'}
														</span>
													</div>
												</div>
											))}
										</div>
									) : (
										<div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
											No tasks found
										</div>
									)}

									{/* Task Summary */}
									{tasks.length > 0 && (
										<div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
											<div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
												<span>
													✅ Completed: {tasks.filter(t => isTaskCompleted(t)).length}
												</span>
												<span>
													📝 Pending: {tasks.filter(t => !isTaskCompleted(t)).length}
												</span>
												<span>
													📊 Progress: {Math.round((tasks.filter(t => isTaskCompleted(t)).length / tasks.length) * 100)}%
												</span>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

					{/* Footer */}
					<div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
						<div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
							<div>
								Milestone: <span className="font-medium text-gray-700 dark:text-gray-300">{sprint.milestone}</span>
							</div>
							<div>
								Total Tasks: <span className="font-medium text-gray-700 dark:text-gray-300">{sprint.progress.totalTasks}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SprintDetailModal;