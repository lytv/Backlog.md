import React from 'react';

interface TerminalSession {
	id: string;
	taskId?: string;
	title: string;
	isActive: boolean;
	status: 'running' | 'idle' | 'exited';
	duration: string;
	command?: string;
}

interface TerminalSidebarProps {
	sessions: TerminalSession[];
	activeSessionId: string;
	onSessionSelect: (sessionId: string) => void;
	onKillAll: () => void;
	isCollapsed?: boolean;
	onToggleCollapsed?: () => void;
}

const TerminalSidebar: React.FC<TerminalSidebarProps> = ({
	sessions,
	activeSessionId,
	onSessionSelect,
	onKillAll,
	isCollapsed = false,
	onToggleCollapsed
}) => {
	const getStatusColor = (status: TerminalSession['status']) => {
		switch (status) {
			case 'running':
				return 'bg-green-500';
			case 'idle':
				return 'bg-yellow-500';
			case 'exited':
				return 'bg-red-500';
			default:
				return 'bg-gray-500';
		}
	};

	return (
		<div className={`${isCollapsed ? 'w-16' : 'w-80'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 relative`}>
			{/* Collapse Toggle Button */}
			{onToggleCollapsed && (
				<button
					onClick={onToggleCollapsed}
					className="absolute -right-3 top-6 z-10 flex items-center justify-center w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-circle shadow-sm hover:shadow-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200"
					aria-label={isCollapsed ? 'Expand terminal sidebar' : 'Collapse terminal sidebar'}
					title={isCollapsed ? 'Expand terminal sidebar' : 'Collapse terminal sidebar'}
				>
					{isCollapsed ? (
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
						</svg>
					) : (
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
					)}
				</button>
			)}

			{/* Sidebar Header */}
			<div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
				{!isCollapsed ? (
					<>
						<div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Terminal Sessions</div>
						<div className="text-xs text-gray-500 dark:text-gray-400">{sessions.length} sessions</div>
					</>
				) : (
					<div className="flex items-center justify-center">
						<svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					</div>
				)}
			</div>

			{/* Session List */}
			<div className="flex-1 overflow-y-auto p-2">
				{sessions.length === 0 ? (
					<div className="text-center py-8 text-gray-500 dark:text-gray-400">
						{!isCollapsed && (
							<>
								<svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
								</svg>
								<p className="text-sm">No active sessions</p>
							</>
						)}
					</div>
				) : (
					<div className={`space-y-1 ${isCollapsed ? 'space-y-2' : ''}`}>
						{sessions.map((session) => (
							<div
								key={session.id}
								onClick={() => onSessionSelect(session.id)}
								className={`${
									isCollapsed 
										? 'flex items-center justify-center p-2 rounded-lg cursor-pointer transition-all duration-200'
										: 'flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 border'
								} ${
									session.id === activeSessionId
										? isCollapsed
											? 'bg-blue-100 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300'
											: 'bg-blue-50 dark:bg-gray-700 border-blue-200 dark:border-blue-500 text-blue-900 dark:text-white'
										: isCollapsed
											? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
											: 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
								}`}
								title={isCollapsed ? `${session.title} - ${session.duration}` : undefined}
							>
								{isCollapsed ? (
									/* Collapsed View - Just Status Dot */
									<div className={`w-3 h-3 rounded-circle ${getStatusColor(session.status)}`} />
								) : (
									/* Expanded View - Full Info */
									<>
										{/* Status Indicator */}
										<div className={`w-2 h-2 rounded-circle mr-3 flex-shrink-0 ${getStatusColor(session.status)}`} />

										{/* Session Info */}
										<div className="flex-1 min-w-0">
											<div className="text-sm font-medium truncate">
												{session.title}
											</div>
											{session.command && (
												<div className="text-xs text-gray-500 dark:text-gray-400 truncate">
													{session.command}
												</div>
											)}
										</div>

										{/* Duration */}
										<div className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
											{session.duration}
										</div>
									</>
								)}
							</div>
						))}
					</div>
				)}
			</div>

			{/* Sidebar Footer */}
			{sessions.length > 0 && !isCollapsed && (
				<div className="p-4 border-t border-gray-200 dark:border-gray-700">
					<button
						onClick={onKillAll}
						className="w-full px-4 py-2 bg-red-600 dark:bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-200"
					>
						Kill All
					</button>
				</div>
			)}
		</div>
	);
};

export default TerminalSidebar;