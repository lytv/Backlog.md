import React from 'react';
import type { HealthMetrics } from '../../types/progress';

interface HealthIndicatorsProps {
	healthIndicators: HealthMetrics;
}

const HealthIndicators: React.FC<HealthIndicatorsProps> = ({ healthIndicators }) => {
	const getHealthIcon = () => {
		switch (healthIndicators.overallHealth) {
			case 'healthy': return '🟢';
			case 'at_risk': return '🟡';
			case 'critical': return '🔴';
			default: return '⚪';
		}
	};

	const getHealthColor = () => {
		switch (healthIndicators.overallHealth) {
			case 'healthy': return 'text-green-600 dark:text-green-400';
			case 'at_risk': return 'text-yellow-600 dark:text-yellow-400';
			case 'critical': return 'text-red-600 dark:text-red-400';
			default: return 'text-gray-600 dark:text-gray-400';
		}
	};

	const getHealthBgColor = () => {
		switch (healthIndicators.overallHealth) {
			case 'healthy': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
			case 'at_risk': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
			case 'critical': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
			default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
		}
	};

	const getTrendIcon = (trend: string) => {
		switch (trend) {
			case 'improving': return '📈';
			case 'declining': return '📉';
			case 'stable': return '➖';
			case 'ahead': return '🚀';
			case 'behind': return '🐌';
			case 'on_track': return '✅';
			default: return '❓';
		}
	};

	const getTrendColor = (trend: string) => {
		switch (trend) {
			case 'improving':
			case 'ahead':
				return 'text-green-600 dark:text-green-400';
			case 'declining':
			case 'behind':
				return 'text-red-600 dark:text-red-400';
			case 'stable':
			case 'on_track':
				return 'text-blue-600 dark:text-blue-400';
			default:
				return 'text-gray-600 dark:text-gray-400';
		}
	};

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
			<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
				🏥 Project Health
			</h3>

			{/* Overall Health Status */}
			<div className={`border rounded-lg p-4 mb-4 ${getHealthBgColor()}`}>
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center space-x-2">
						<span className="text-2xl">{getHealthIcon()}</span>
						<div>
							<h4 className={`font-semibold text-lg ${getHealthColor()}`}>
								{healthIndicators.overallHealth.toUpperCase()}
							</h4>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								Overall Project Health
							</p>
						</div>
					</div>
					<div className="text-right">
						<div className={`text-2xl font-bold ${getHealthColor()}`}>
							{/* Calculate health score from issues */}
							{healthIndicators.overallHealth === 'healthy' ? '85+' :
							 healthIndicators.overallHealth === 'at_risk' ? '60-85' : '<60'}
						</div>
						<div className="text-xs text-gray-600 dark:text-gray-400">
							Health Score
						</div>
					</div>
				</div>
			</div>

			{/* Health Trends */}
			<div className="space-y-3 mb-4">
				<h4 className="font-medium text-gray-900 dark:text-gray-100">📈 Trends</h4>
				
				<div className="grid grid-cols-1 gap-3">
					<div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
						<div className="flex items-center space-x-2">
							<span>{getTrendIcon(healthIndicators.trends.velocityTrend)}</span>
							<span className="text-sm text-gray-700 dark:text-gray-300">Velocity</span>
						</div>
						<span className={`text-sm font-medium ${getTrendColor(healthIndicators.trends.velocityTrend)}`}>
							{healthIndicators.trends.velocityTrend.replace('_', ' ')}
						</span>
					</div>

					<div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
						<div className="flex items-center space-x-2">
							<span>{getTrendIcon(healthIndicators.trends.completionTrend)}</span>
							<span className="text-sm text-gray-700 dark:text-gray-300">Timeline</span>
						</div>
						<span className={`text-sm font-medium ${getTrendColor(healthIndicators.trends.completionTrend)}`}>
							{healthIndicators.trends.completionTrend.replace('_', ' ')}
						</span>
					</div>
				</div>
			</div>

			{/* Issues Summary */}
			{(healthIndicators.issues.overduesprints.length > 0 ||
			  healthIndicators.issues.blockedMilestones.length > 0 ||
			  healthIndicators.issues.riskFactors.length > 0) && (
				<div className="space-y-3">
					<h4 className="font-medium text-gray-900 dark:text-gray-100">⚠️ Issues</h4>
					
					<div className="space-y-2">
						{healthIndicators.issues.overduesprints.length > 0 && (
							<div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
								<span className="text-sm text-red-700 dark:text-red-300">
									🚨 Overdue Sprints
								</span>
								<span className="text-sm font-medium text-red-800 dark:text-red-200">
									{healthIndicators.issues.overduesprints.length}
								</span>
							</div>
						)}

						{healthIndicators.issues.blockedMilestones.length > 0 && (
							<div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
								<span className="text-sm text-yellow-700 dark:text-yellow-300">
									🚫 Blocked Milestones
								</span>
								<span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
									{healthIndicators.issues.blockedMilestones.length}
								</span>
							</div>
						)}

						{healthIndicators.issues.riskFactors.length > 0 && (
							<div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
								<span className="text-sm text-orange-700 dark:text-orange-300">
									⚠️ Risk Factors:
								</span>
								<ul className="mt-1 text-xs text-orange-600 dark:text-orange-400">
									{healthIndicators.issues.riskFactors.slice(0, 2).map((risk, index) => (
										<li key={index} className="truncate">• {risk}</li>
									))}
									{healthIndicators.issues.riskFactors.length > 2 && (
										<li className="text-orange-500">
											... +{healthIndicators.issues.riskFactors.length - 2} more
										</li>
									)}
								</ul>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Recommendations */}
			{healthIndicators.issues.recommendations.length > 0 && (
				<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
					<h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">💡 Recommendations</h4>
					<ul className="space-y-1">
						{healthIndicators.issues.recommendations.slice(0, 3).map((rec, index) => (
							<li key={index} className="text-xs text-blue-600 dark:text-blue-400 flex items-start">
								<span className="mr-2">•</span>
								<span className="flex-1">{rec}</span>
							</li>
						))}
						{healthIndicators.issues.recommendations.length > 3 && (
							<li className="text-xs text-gray-500 dark:text-gray-400">
								... and {healthIndicators.issues.recommendations.length - 3} more recommendations
							</li>
						)}
					</ul>
				</div>
			)}

			{/* All Good State */}
			{healthIndicators.issues.overduesprints.length === 0 &&
			 healthIndicators.issues.blockedMilestones.length === 0 &&
			 healthIndicators.issues.riskFactors.length === 0 &&
			 healthIndicators.overallHealth === 'healthy' && (
				<div className="text-center py-4 text-green-600 dark:text-green-400">
					<div className="text-2xl mb-2">🎉</div>
					<div className="text-sm font-medium">All systems running smoothly!</div>
					<div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
						No issues detected. Keep up the good work!
					</div>
				</div>
			)}
		</div>
	);
};

export default HealthIndicators;