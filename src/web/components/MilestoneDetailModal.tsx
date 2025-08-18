import React from 'react';
import type { MilestoneProgress } from '../../types/progress';

interface MilestoneDetailModalProps {
	milestone: MilestoneProgress | null;
	isOpen: boolean;
	onClose: () => void;
}

const MilestoneDetailModal: React.FC<MilestoneDetailModalProps> = ({ 
	milestone, 
	isOpen, 
	onClose 
}) => {
	if (!isOpen || !milestone) return null;

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
			case 'completed': return 'text-green-600 dark:text-green-400';
			case 'in_progress': return 'text-blue-600 dark:text-blue-400';
			case 'blocked': return 'text-red-600 dark:text-red-400';
			default: return 'text-gray-600 dark:text-gray-400';
		}
	};

	const getProgressBarColor = () => {
		if (milestone.completionPercentage >= 100) return 'bg-green-500';
		if (milestone.completionPercentage >= 75) return 'bg-blue-500';
		if (milestone.completionPercentage >= 50) return 'bg-yellow-500';
		return 'bg-gray-400';
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div 
				className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
				onClick={onClose}
			></div>
			
			{/* Modal */}
			<div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center space-x-3">
						<span className="text-2xl">{getStatusIcon()}</span>
						<div>
							<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
								{milestone.directoryName || milestone.id}
							</h2>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								{milestone.name}
							</p>
						</div>
					</div>
					<div className="flex items-center space-x-3">
						<span className={`px-3 py-1 rounded-circle text-sm font-medium capitalize ${getStatusColor()}`}>
							{milestone.status.replace('_', ' ')}
						</span>
						<button
							onClick={onClose}
							className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
					<div className="space-y-6">
						{/* Progress Overview */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
								<div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
									{milestone.completionPercentage}%
								</div>
								<div className="text-sm text-gray-600 dark:text-gray-400">Completion</div>
							</div>
							<div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
								<div className="text-2xl font-bold text-green-600 dark:text-green-400">
									{milestone.sprints.length}
								</div>
								<div className="text-sm text-gray-600 dark:text-gray-400">Sprints</div>
							</div>
							<div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
								<div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
									{milestone.endWeek - milestone.startWeek + 1}
								</div>
								<div className="text-sm text-gray-600 dark:text-gray-400">Weeks Duration</div>
							</div>
						</div>

						{/* Progress Bar */}
						<div>
							<div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
								<span>Overall Progress</span>
								<span>{milestone.completionPercentage}%</span>
							</div>
							<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-circle h-3">
								<div 
									className={`h-3 rounded-circle transition-all duration-300 ${getProgressBarColor()}`}
									style={{ width: `${milestone.completionPercentage}%` }}
								></div>
							</div>
						</div>

						{/* Details Grid */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Timeline & Phase */}
							<div className="space-y-4">
								<div>
									<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
										📅 Timeline & Phase
									</h3>
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-gray-600 dark:text-gray-400">Phase:</span>
											<span className="text-gray-900 dark:text-gray-100 font-medium">{milestone.phase}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-600 dark:text-gray-400">Timeline:</span>
											<span className="text-gray-900 dark:text-gray-100">
												Week {milestone.startWeek} - {milestone.endWeek}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-600 dark:text-gray-400">Estimated Duration:</span>
											<span className="text-gray-900 dark:text-gray-100">
												{milestone.estimatedDuration} weeks
											</span>
										</div>
										{milestone.actualDuration && (
											<div className="flex justify-between">
												<span className="text-gray-600 dark:text-gray-400">Actual Duration:</span>
												<span className="text-gray-900 dark:text-gray-100">
													{milestone.actualDuration} weeks
												</span>
											</div>
										)}
									</div>
								</div>

								{/* Dependencies */}
								{milestone.dependencies.length > 0 && (
									<div>
										<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
											🔗 Dependencies
										</h3>
										<div className="space-y-1">
											{milestone.dependencies.map((dep, index) => (
												<div key={index} className="text-sm text-gray-600 dark:text-gray-400">
													• {dep}
												</div>
											))}
										</div>
									</div>
								)}
							</div>

							{/* Sprints & Deliverables */}
							<div className="space-y-4">
								{/* Related Sprints */}
								{milestone.sprints.length > 0 && (
									<div>
										<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
											🏃 Related Sprints ({milestone.sprints.length})
										</h3>
										<div className="space-y-1">
											{milestone.sprints.map((sprint, index) => (
												<div key={index} className="text-sm text-gray-600 dark:text-gray-400">
													• {sprint}
												</div>
											))}
										</div>
									</div>
								)}

								{/* Deliverables */}
								{milestone.deliverables.length > 0 && (
									<div>
										<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
											📦 Deliverables ({milestone.deliverables.length})
										</h3>
										<div className="space-y-1">
											{milestone.deliverables.map((deliverable, index) => (
												<div key={index} className="text-sm text-gray-600 dark:text-gray-400">
													• {deliverable}
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Key Features */}
						{milestone.keyFeatures.length > 0 && (
							<div>
								<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
									✨ Key Features ({milestone.keyFeatures.length})
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
									{milestone.keyFeatures.map((feature, index) => (
										<div key={index} className="text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-700 rounded">
											• {feature}
										</div>
									))}
								</div>
							</div>
						)}

						{/* Risks */}
						{milestone.risks.length > 0 && (
							<div>
								<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
									⚠️ Risk Factors ({milestone.risks.length})
								</h3>
								<div className="space-y-2">
									{milestone.risks.map((risk, index) => (
										<div key={index} className="text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded">
											• {risk}
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default MilestoneDetailModal;