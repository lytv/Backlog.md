import React, { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import type { ProjectProgress } from '../../types/progress';
import LoadingSpinner from './LoadingSpinner';
import MilestoneCard from './MilestoneCard';
import SprintTimeline from './SprintTimeline';
import ProgressCharts from './ProgressCharts';
import HealthIndicators from './HealthIndicators';
import TaskBreakdown from './TaskBreakdown';
import MilestoneDetailModal from './MilestoneDetailModal';
import SprintDetailModal from './SprintDetailModal';
import { getProgressSettings, updateProgressSettings } from '../utils/pageSettings';

interface ProjectDashboardProps {
	projectName?: string;
}

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ projectName }) => {
	const [progress, setProgress] = useState<ProjectProgress | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [loadingMessage, setLoadingMessage] = useState('Loading project progress...');
	
	// Initialize state from localStorage
	const progressSettings = getProgressSettings();
	
	// Filter state - initialized from localStorage
	const [showMilestones, setShowMilestones] = useState(progressSettings.showMilestones);
	const [showSprints, setShowSprints] = useState(progressSettings.showSprints);
	
	// Focus mode state - initialized from localStorage
	const [focusedMilestone, setFocusedMilestone] = useState<string | null>(progressSettings.focusedMilestone);
	
	// Modal state
	const [selectedMilestone, setSelectedMilestone] = useState<ProjectProgress['milestones'][0] | null>(null);
	const [selectedSprint, setSelectedSprint] = useState<ProjectProgress['sprints'][0] | null>(null);
	const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
	const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);

	useEffect(() => {
		let isMounted = true;
		let messageInterval: NodeJS.Timeout | undefined;

		const fetchProgress = async () => {
			if (!isMounted) return;
			
			try {
				setLoading(true);
				setError(null);
				
				// Loading messages that reflect actual backend operations
				const loadingMessages = [
					'Loading project progress...',
					'Parsing milestone requirements...',
					'Analyzing sprint data...',
					'Calculating progress metrics...',
					'Processing task completion rates...',
					'Generating health indicators...',
					'Building timeline data...'
				];

				// Start with first message
				if (isMounted) setLoadingMessage(loadingMessages[0] || '');

				// Cycle through loading messages
				let messageIndex = 0;
				messageInterval = setInterval(() => {
					if (!isMounted || messageIndex >= loadingMessages.length - 1) {
						clearInterval(messageInterval);
						return;
					}
					messageIndex++;
					setLoadingMessage(loadingMessages[messageIndex] || '');
				}, 800);

				// Fetch progress data
				const response = await fetch('/api/progress');
				const data = await response.json();
				
				// Stop the message cycling once data arrives
				if (messageInterval) {
					clearInterval(messageInterval);
				}
				
				if (!response.ok) {
					throw new Error(data.message || 'Failed to load project progress');
				}
				
				if (isMounted) {
					setProgress(data.data);
				}
			} catch (err) {
				if (isMounted) {
					console.error('Failed to fetch project progress:', err);
					setError(err instanceof Error ? err.message : 'Failed to load project progress');
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		fetchProgress();

		return () => {
			isMounted = false;
			if (messageInterval) {
				clearInterval(messageInterval);
			}
		};
	}, []);

	const handleMilestoneSelect = (milestone: ProjectProgress['milestones'][0]) => {
		setSelectedMilestone(milestone);
		setIsMilestoneModalOpen(true);
	};

	const handleSprintSelect = (sprint: ProjectProgress['sprints'][0]) => {
		setSelectedSprint(sprint);
		setIsSprintModalOpen(true);
	};

	const handleCloseMilestoneModal = () => {
		setIsMilestoneModalOpen(false);
		setSelectedMilestone(null);
	};

	const handleCloseSprintModal = () => {
		setIsSprintModalOpen(false);
		setSelectedSprint(null);
	};

	const handleMilestoneFocusToggle = (milestoneId: string) => {
		setFocusedMilestone(prevFocused => 
			prevFocused === milestoneId ? null : milestoneId
		);
	};

	// Save settings to localStorage when state changes
	useEffect(() => {
		updateProgressSettings({ showMilestones });
	}, [showMilestones]);

	useEffect(() => {
		updateProgressSettings({ showSprints });
	}, [showSprints]);

	useEffect(() => {
		updateProgressSettings({ focusedMilestone });
	}, [focusedMilestone]);

	if (loading) {
		return (
			<div className="flex flex-col justify-center items-center h-64 space-y-4">
				<LoadingSpinner size="lg" text="" />
				<div className="text-center">
					<p className="text-lg font-medium text-gray-900 dark:text-gray-100">
						{loadingMessage}
					</p>
					<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
						Analyzing project structure and progress...
					</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-8 text-center">
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
					<p className="text-red-600 dark:text-red-400 font-medium">Error loading project progress</p>
					<p className="text-red-500 dark:text-red-300 text-sm mt-1">{error}</p>
					<button 
						onClick={() => window.location.reload()} 
						className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	if (!progress) {
		return (
			<div className="p-8 text-center">
				<p className="text-gray-500 dark:text-gray-400">No project progress data available</p>
			</div>
		);
	}

	const getHealthColor = () => {
		switch (progress.healthIndicators.overallHealth) {
			case 'healthy': return 'text-green-600 dark:text-green-400';
			case 'at_risk': return 'text-yellow-600 dark:text-yellow-400';
			case 'critical': return 'text-red-600 dark:text-red-400';
			default: return 'text-gray-600 dark:text-gray-400';
		}
	};

	const getHealthIcon = () => {
		switch (progress.healthIndicators.overallHealth) {
			case 'healthy': return '🟢';
			case 'at_risk': return '🟡';
			case 'critical': return '🔴';
			default: return '⚪';
		}
	};

	// Filter data based on focused milestone
	const filteredMilestones = focusedMilestone 
		? progress.milestones.filter(m => m.id === focusedMilestone)
		: progress.milestones;

	const filteredSprints = focusedMilestone
		? progress.sprints.filter(s => s.milestone === focusedMilestone)
		: progress.sprints;

	return (
		<div className="max-w-7xl mx-auto p-6 space-y-8">
			{/* Header */}
			<div className="text-center">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
					{projectName ? `${projectName} Progress` : 'VTL SaaS Project Progress'}
				</h1>
				<p className="text-gray-600 dark:text-gray-400">
					Comprehensive overview of milestones, sprints, and development progress
				</p>
			</div>

			{/* Filter Controls */}
			<div className="flex justify-center space-x-4">
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
					<div className="flex items-center space-x-4">
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
						
						<label className="flex items-center space-x-2 cursor-pointer">
							<input
								type="checkbox"
								checked={showMilestones}
								onChange={(e) => setShowMilestones(e.target.checked)}
								className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
							/>
							<span className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
								<span className="mr-1">📋</span>
								Milestones ({progress?.milestones.length || 0})
							</span>
						</label>
						
						<label className="flex items-center space-x-2 cursor-pointer">
							<input
								type="checkbox"
								checked={showSprints}
								onChange={(e) => setShowSprints(e.target.checked)}
								className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
							/>
							<span className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
								<span className="mr-1">🏃</span>
								Sprints ({progress?.sprints.length || 0})
							</span>
						</label>
						
						{!showMilestones && !showSprints && (
							<span className="text-xs text-red-600 dark:text-red-400 italic">
								⚠️ Select at least one option
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Overall Progress Header */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-6">
						<div className="text-center">
							<div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
								{progress.overallMetrics.overall.progressPercentage}%
							</div>
							<div className="text-sm text-gray-600 dark:text-gray-400">Overall Progress</div>
						</div>
						<div className="text-center">
							<div className={`text-2xl font-bold ${getHealthColor()}`}>
								{getHealthIcon()} {progress.healthIndicators.overallHealth.toUpperCase()}
							</div>
							<div className="text-sm text-gray-600 dark:text-gray-400">
								Health Score: {progress.overallMetrics.performance.healthScore}/100
							</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
								Week {progress.overallMetrics.timeline.currentWeek}/{progress.overallMetrics.timeline.totalWeeks}
							</div>
							<div className="text-sm text-gray-600 dark:text-gray-400">
								{progress.overallMetrics.timeline.onTrack ? 'On Track' : 'Behind Schedule'}
							</div>
						</div>
					</div>
					<div className="text-right">
						<div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
							{progress.overallMetrics.tasks.completedTasks}/{progress.overallMetrics.tasks.totalTasks} Tasks
						</div>
						<div className="text-sm text-gray-600 dark:text-gray-400">
							{progress.overallMetrics.sprints.completedSprints}/{progress.overallMetrics.sprints.totalSprints} Sprints Completed
						</div>
					</div>
				</div>

				{/* Overall Progress Bar */}
				<div className="mt-4">
					<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-circle h-3">
						<div 
							className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-circle transition-all duration-300"
							style={{ width: `${progress.overallMetrics.overall.progressPercentage}%` }}
						></div>
					</div>
					<div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
						<span>Started</span>
						<span>{progress.overallMetrics.overall.progressPercentage}% Complete</span>
						<span>Target: {progress.overallMetrics.timeline.totalWeeks} weeks</span>
					</div>
				</div>
			</div>

			{/* Main Dashboard Grid */}
			{(showMilestones || showSprints) ? (
				<div className={`grid grid-cols-1 ${
					showMilestones && showSprints 
						? 'lg:grid-cols-3' 
						: showMilestones || showSprints 
							? 'lg:grid-cols-2' 
							: 'lg:grid-cols-1'
				} gap-8`}>
					{/* Milestones Column */}
					{showMilestones && (
						<div className="lg:col-span-1 space-y-6">
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
									📋 Milestones ({filteredMilestones.length})
									{focusedMilestone && (
										<span className="ml-2 text-sm font-normal text-blue-600 dark:text-blue-400">
											(Focused on {focusedMilestone})
										</span>
									)}
								</h3>
								<div className="space-y-4">
									{filteredMilestones.map((milestone) => (
										<MilestoneCard 
											key={milestone.id} 
											milestone={milestone} 
											onSelect={handleMilestoneSelect}
											onFocusToggle={handleMilestoneFocusToggle}
											isFocused={focusedMilestone === milestone.id}
										/>
									))}
								</div>
							</div>
						</div>
					)}

					{/* Sprints Column */}
					{showSprints && (
						<div className="lg:col-span-1 space-y-6">
							<SprintTimeline 
								sprints={filteredSprints} 
								milestones={filteredMilestones}
								onSprintSelect={handleSprintSelect}
							/>
							<TaskBreakdown progress={progress} />
						</div>
					)}

					{/* Always show Health and Charts in available space */}
					<div className="lg:col-span-1 space-y-6">
						<HealthIndicators healthIndicators={progress.healthIndicators} />
						<ProgressCharts progress={progress} />
					</div>
				</div>
			) : (
				// Show message when no filters are selected
				<div className="text-center py-12">
					<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-8">
						<p className="text-yellow-700 dark:text-yellow-400 font-medium mb-2">
							📋 Please select view options
						</p>
						<p className="text-yellow-600 dark:text-yellow-300 text-sm">
							Choose to display Milestones, Sprints, or both using the filters above.
						</p>
					</div>
				</div>
			)}

			{/* Bottom Section - Recent Activity and Issues */}
			{(progress.healthIndicators.issues.overduesprints.length > 0 || 
			  progress.healthIndicators.issues.blockedMilestones.length > 0 ||
			  progress.healthIndicators.issues.riskFactors.length > 0) && (
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
						⚠️ Issues & Recommendations
					</h3>
					
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{progress.healthIndicators.issues.overduesprints.length > 0 && (
							<div>
								<h4 className="font-medium text-red-700 dark:text-red-400 mb-2">
									Overdue Sprints ({progress.healthIndicators.issues.overduesprints.length})
								</h4>
								{progress.healthIndicators.issues.overduesprints.slice(0, 3).map((sprint) => (
									<div key={sprint.id} className="text-sm text-gray-600 dark:text-gray-400 mb-1">
										• {sprint.id}: {sprint.progress.completionRate}% complete
									</div>
								))}
							</div>
						)}

						{progress.healthIndicators.issues.blockedMilestones.length > 0 && (
							<div>
								<h4 className="font-medium text-yellow-700 dark:text-yellow-400 mb-2">
									Blocked Milestones ({progress.healthIndicators.issues.blockedMilestones.length})
								</h4>
								{progress.healthIndicators.issues.blockedMilestones.slice(0, 3).map((milestone) => (
									<div key={milestone.id} className="text-sm text-gray-600 dark:text-gray-400 mb-1">
										• {milestone.id}: {milestone.name}
									</div>
								))}
							</div>
						)}

						{progress.healthIndicators.issues.recommendations.length > 0 && (
							<div>
								<h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">
									Recommendations
								</h4>
								{progress.healthIndicators.issues.recommendations.slice(0, 3).map((rec, index) => (
									<div key={index} className="text-sm text-gray-600 dark:text-gray-400 mb-1">
										• {rec}
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Milestone Detail Modal */}
			<MilestoneDetailModal
				milestone={selectedMilestone}
				isOpen={isMilestoneModalOpen}
				onClose={handleCloseMilestoneModal}
			/>

			{/* Sprint Detail Modal */}
			<SprintDetailModal
				sprint={selectedSprint}
				isOpen={isSprintModalOpen}
				onClose={handleCloseSprintModal}
			/>
		</div>
	);
};

export default ProjectDashboard;