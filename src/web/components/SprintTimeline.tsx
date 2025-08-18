import React from 'react';
import type { SprintProgress, MilestoneProgress } from '../../types/progress';

interface SprintTimelineProps {
	sprints: SprintProgress[];
	milestones: MilestoneProgress[];
	onSprintSelect?: (sprint: SprintProgress) => void;
}

const SprintTimeline: React.FC<SprintTimelineProps> = ({ sprints, milestones, onSprintSelect }) => {
	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'completed': return '✅';
			case 'active': return '🔄';
			case 'overdue': return '🚨';
			default: return '⏳';
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'completed': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
			case 'active': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
			case 'overdue': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
			default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
		}
	};

	// Group sprints by milestone for better organization
	const sprintsByMilestone = sprints.reduce((acc, sprint) => {
		const milestone = sprint.milestone;
		if (!acc[milestone]) {
			acc[milestone] = [];
		}
		acc[milestone].push(sprint);
		return acc;
	}, {} as Record<string, SprintProgress[]>);

	// Helper function to extract milestone number for sorting
	const getMilestoneNumber = (milestoneId: string): number => {
		const match = milestoneId.match(/M(\d+)/);
		return match ? parseInt(match[1], 10) : 999;
	};

	// Helper function to extract sprint number for sorting
	const getSprintNumber = (sprintId: string): number => {
		const match = sprintId.match(/S(\d+)_/);
		return match ? parseInt(match[1], 10) : 999;
	};

	// Get filtered sprints with tasks
	const filteredSprints = sprints
		.filter(s => 
			// Include if has active status OR has tasks (totalTasks > 0)
			s.status === 'active' || 
			s.status === 'overdue' ||
			s.status === 'completed' ||
			s.progress.totalTasks > 0
		);

	// Group filtered sprints by milestone
	const groupedSprintsByMilestone = filteredSprints.reduce((acc, sprint) => {
		const milestone = sprint.milestone;
		if (!acc[milestone]) {
			acc[milestone] = [];
		}
		acc[milestone].push(sprint);
		return acc;
	}, {} as Record<string, SprintProgress[]>);

	// Sort milestones by number (M01, M02, M03, etc.)
	const sortedMilestoneIds = Object.keys(groupedSprintsByMilestone)
		.sort((a, b) => getMilestoneNumber(a) - getMilestoneNumber(b));

	// Sort sprints within each milestone by status priority, then by sprint number
	const sortSprintsByPriority = (sprintsList: SprintProgress[]) => {
		return sprintsList.sort((a, b) => {
			const statusPriority = { 'overdue': 0, 'active': 1, 'completed': 2, 'planned': 3 };
			const aPriority = statusPriority[a.status as keyof typeof statusPriority] || 4;
			const bPriority = statusPriority[b.status as keyof typeof statusPriority] || 4;
			
			if (aPriority !== bPriority) {
				return aPriority - bPriority;
			}
			
			// If same status priority, sort by sprint number (S01, S02, S03, etc.)
			const aSprintNumber = getSprintNumber(a.id);
			const bSprintNumber = getSprintNumber(b.id);
			
			if (aSprintNumber !== bSprintNumber) {
				return aSprintNumber - bSprintNumber;
			}
			
			// Finally, sort by date if sprint numbers are the same
			return new Date(b.timeline.startDate || '').getTime() - new Date(a.timeline.startDate || '').getTime();
		});
	};

	const formatDate = (dateStr: string) => {
		if (!dateStr) return 'TBD';
		try {
			const date = new Date(dateStr);
			return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
		} catch {
			return dateStr;
		}
	};

	const calculateDaysLeft = (endDate: string) => {
		if (!endDate) return null;
		try {
			const end = new Date(endDate);
			const now = new Date();
			const diffTime = end.getTime() - now.getTime();
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
			return diffDays;
		} catch {
			return null;
		}
	};

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
			<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
				🏃 Sprint Timeline
			</h3>
			
			{sortedMilestoneIds.length === 0 ? (
				<div className="text-center py-8 text-gray-500 dark:text-gray-400">
					No active sprints found
				</div>
			) : (
				<div className="space-y-6">
					{sortedMilestoneIds.map((milestoneId) => {
						const milestoneSprintsList = sortSprintsByPriority(groupedSprintsByMilestone[milestoneId]);
						const milestone = milestones.find(m => m.id === milestoneId);
						
						return (
							<div key={milestoneId} className="space-y-3">
								{/* Milestone Header */}
								<div className="flex items-center space-x-2 pb-2 border-b border-gray-200 dark:border-gray-600">
									<span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
										{milestoneId}
									</span>
									{milestone && (
										<span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
											{milestone.directoryName || milestone.name}
										</span>
									)}
									<span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
										{milestoneSprintsList.length} sprint{milestoneSprintsList.length !== 1 ? 's' : ''}
									</span>
								</div>

								{/* Sprints in this milestone */}
								<div className="space-y-2 ml-4">
									{milestoneSprintsList.map((sprint) => {
										const daysLeft = calculateDaysLeft(sprint.timeline.endDate);
										const isOverdue = daysLeft !== null && daysLeft < 0;
										
										return (
											<div 
												key={sprint.id}
												className={`border rounded-lg p-3 transition-all duration-200 ${getStatusColor(sprint.status)} ${
													onSprintSelect 
														? 'hover:shadow-md hover:scale-[1.01] cursor-pointer' 
														: ''
												}`}
												onClick={() => onSprintSelect?.(sprint)}
											>
												<div className="flex items-start justify-between">
													<div className="flex items-start space-x-3 min-w-0 flex-1">
														<span className="text-lg flex-shrink-0 mt-1">
															{getStatusIcon(sprint.status)}
														</span>
														<div className="min-w-0 flex-1">
															<h4 className="font-medium text-sm truncate">
																{sprint.id}
															</h4>
															<p className="text-xs opacity-75 mt-1 line-clamp-2">
																{sprint.title}
															</p>
															<div className="flex items-center space-x-4 mt-2 text-xs">
																<span>
																	{sprint.progress.completedTasks}/{sprint.progress.totalTasks} tasks
																</span>
																<span>
																	{sprint.progress.completionRate}%
																</span>
																{sprint.progress.velocity > 0 && (
																	<span>
																		{sprint.progress.velocity}/day
																	</span>
																)}
															</div>
														</div>
													</div>
													<div className="text-right text-xs flex-shrink-0 ml-3">
														<div className="opacity-75 mt-1">
															{formatDate(sprint.timeline.startDate)} - {formatDate(sprint.timeline.endDate)}
														</div>
														{daysLeft !== null && (
															<div className={`mt-1 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
																{isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
															</div>
														)}
													</div>
												</div>
												
												{/* Progress bar */}
												<div className="mt-3">
													<div className="w-full bg-white/50 dark:bg-gray-800/50 rounded-circle h-1.5">
														<div 
															className={`h-1.5 rounded-circle transition-all duration-300 ${
																sprint.status === 'completed' ? 'bg-green-600' :
																sprint.status === 'overdue' ? 'bg-red-600' :
																'bg-blue-600'
															}`}
															style={{ width: `${sprint.progress.completionRate}%` }}
														></div>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						);
					})}
				</div>
			)}
			
			{/* Summary Stats */}
			<div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
				<div className="grid grid-cols-2 gap-4 text-sm">
					<div className="text-center">
						<div className="font-semibold text-gray-900 dark:text-gray-100">
							{sprints.filter(s => s.status === 'active').length}
						</div>
						<div className="text-gray-600 dark:text-gray-400 text-xs">
							Active Sprints
						</div>
					</div>
					<div className="text-center">
						<div className="font-semibold text-gray-900 dark:text-gray-100">
							{sprints.filter(s => s.status === 'completed').length}
						</div>
						<div className="text-gray-600 dark:text-gray-400 text-xs">
							Completed
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SprintTimeline;