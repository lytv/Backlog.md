import React from 'react';
import type { MilestoneProgress } from '../../types/progress';

interface MilestoneCardProps {
	milestone: MilestoneProgress;
	onSelect?: (milestone: MilestoneProgress) => void;
	onFocusToggle?: (milestoneId: string) => void;
	isFocused?: boolean;
}

const MilestoneCard: React.FC<MilestoneCardProps> = ({ milestone, onSelect, onFocusToggle, isFocused = false }) => {
	const getStatusIcon = () => {
		switch (milestone.status) {
			case 'completed': return '✅';
			case 'in_progress': return '🔄';
			case 'blocked': return '🚫';
			default: return '⏳';
		}
	};

	const getStatusColor = () => {
		switch (milestone.status) {
			case 'completed': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
			case 'in_progress': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
			case 'blocked': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
			default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
		}
	};

	const getProgressBarColor = () => {
		if (milestone.completionPercentage >= 100) return 'bg-green-500';
		if (milestone.completionPercentage >= 75) return 'bg-blue-500';
		if (milestone.completionPercentage >= 50) return 'bg-yellow-500';
		return 'bg-gray-400';
	};

	return (
		<div 
			className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-all duration-200 ${
				onSelect 
					? 'hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer' 
					: 'hover:shadow-md'
			}`}
			onClick={() => onSelect?.(milestone)}
		>
			<div className="flex items-start justify-between mb-2">
				<div className="flex items-start space-x-2 min-w-0 flex-1">
					<span className="text-lg flex-shrink-0">{getStatusIcon()}</span>
					{/* Focus Toggle Icon */}
					{onFocusToggle && (
						<button
							onClick={(e) => {
								e.stopPropagation();
								onFocusToggle(milestone.id);
							}}
							className={`flex-shrink-0 p-1 rounded-circle transition-all duration-200 ${
								isFocused 
									? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm' 
									: 'text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700'
							}`}
							title={isFocused ? "Exit focus mode" : "Focus on this milestone"}
						>
							{isFocused ? (
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
								</svg>
							) : (
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
							)}
						</button>
					)}
					<div className="min-w-0 flex-1">
						<h4 className="font-semibold text-gray-900 dark:text-gray-100 break-words text-sm leading-tight">
							{milestone.directoryName || milestone.id}
						</h4>
						<p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
							{milestone.name}
						</p>
					</div>
				</div>
				<span className={`px-2 py-1 rounded-circle text-xs font-medium flex-shrink-0 ml-2 ${getStatusColor()}`}>
					{milestone.status.replace('_', ' ')}
				</span>
			</div>

			{/* Progress Bar */}
			<div className="mb-3">
				<div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
					<span>Progress</span>
					<span>{milestone.completionPercentage}%</span>
				</div>
				<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-circle h-2">
					<div 
						className={`h-2 rounded-circle transition-all duration-300 ${getProgressBarColor()}`}
						style={{ width: `${milestone.completionPercentage}%` }}
					></div>
				</div>
			</div>

			{/* Metadata */}
			<div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
				<div className="flex justify-between items-center">
					<span className="flex-shrink-0">Phase:</span>
					<span className="text-gray-800 dark:text-gray-200 ml-2 truncate">{milestone.phase}</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="flex-shrink-0">Timeline:</span>
					<span className="text-gray-800 dark:text-gray-200 ml-2">
						Week {milestone.startWeek}-{milestone.endWeek}
					</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="flex-shrink-0">Sprints:</span>
					<span className="text-gray-800 dark:text-gray-200 ml-2">
						{milestone.sprints.length}
					</span>
				</div>
				{milestone.dependencies.length > 0 && (
					<div className="flex justify-between items-start">
						<span className="flex-shrink-0">Dependencies:</span>
						<span className="text-gray-800 dark:text-gray-200 ml-2 text-right break-words">
							{milestone.dependencies.join(', ')}
						</span>
					</div>
				)}
			</div>

			{/* Key Features Preview */}
			{milestone.keyFeatures.length > 0 && (
				<div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
					<p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Key Features:</p>
					<ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
						{milestone.keyFeatures.slice(0, 2).map((feature, index) => (
							<li key={index} className="break-words leading-relaxed">
								• {feature}
							</li>
						))}
						{milestone.keyFeatures.length > 2 && (
							<li className="text-gray-500 dark:text-gray-400 italic">
								... and {milestone.keyFeatures.length - 2} more
							</li>
						)}
					</ul>
				</div>
			)}
		</div>
	);
};

export default MilestoneCard;