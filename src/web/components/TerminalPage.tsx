import React, { useState, useEffect, useRef } from 'react';
import TerminalSidebar from './TerminalSidebar';
import TerminalSession from './TerminalSession';
import EnhancedTerminalSession from './EnhancedTerminalSession';
import TerminalCreateModal from './TerminalCreateModal';
import { type Task } from '../../types';
import type { TerminalSession as TerminalSessionType } from '../../types/terminal';
import { useTerminal } from '../hooks/useTerminal';

// Helper function to convert TerminalSessionType to display format
function convertSessionForDisplay(session: TerminalSessionType, isActive: boolean): any {
	const startTime = new Date(session.startedAt);
	const now = new Date();
	const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
	
	const formatDuration = (seconds: number): string => {
		if (seconds < 60) return `${seconds}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
		return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
	};

	return {
		id: session.id,
		taskId: session.taskId,
		title: session.name,
		isActive,
		status: session.status === 'running' ? 'running' : session.status === 'exited' ? 'exited' : 'idle',
		duration: session.status === 'exited' 
			? formatDuration(duration) + ' ago'
			: formatDuration(duration),
		command: session.command.join(' ')
	};
}

interface TerminalPageProps {
	tasks: Task[];
}

const TerminalPage: React.FC<TerminalPageProps> = ({ tasks }) => {
	const { sessions: realSessions, loading, error, createSession, killSession, refreshSessions } = useTerminal();

	const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
		const saved = localStorage.getItem('terminalSidebarCollapsed');
		return saved ? JSON.parse(saved) : false;
	});
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [modalTaskId, setModalTaskId] = useState<string | undefined>(undefined);

	// Convert real sessions to display format
	const sessions = realSessions.map(session => 
		convertSessionForDisplay(session, session.id === activeSessionId)
	);

	// Set first session as active if no active session is set
	useEffect(() => {
		if (!activeSessionId && sessions.length > 0) {
			setActiveSessionId(sessions[0].id);
		}
	}, [sessions, activeSessionId]);

	// Save sidebar state to localStorage
	useEffect(() => {
		localStorage.setItem('terminalSidebarCollapsed', JSON.stringify(isSidebarCollapsed));
	}, [isSidebarCollapsed]);

	const activeSession = sessions.find(s => s.id === activeSessionId);
	const activeTask = tasks.find(t => t.id === activeSession?.taskId);

	const handleSessionSelect = (sessionId: string) => {
		setActiveSessionId(sessionId);
	};

	const handleKillAll = async () => {
		if (confirm('Are you sure you want to kill all terminal sessions?')) {
			try {
				for (const session of realSessions) {
					await killSession(session.id);
				}
				
				// Refresh sessions list to ensure UI is updated
				await refreshSessions();
				
				setActiveSessionId(null);
				console.log('Successfully killed all sessions');
			} catch (error) {
				console.error('Error killing all sessions:', error);
				alert('Failed to kill all sessions');
			}
		}
	};

	const handleNewTerminal = (taskId?: string) => {
		console.log('[TerminalPage] Opening create terminal modal, taskId:', taskId);
		setModalTaskId(taskId);
		setShowCreateModal(true);
	};

	const handleDirectTerminalCreation = async (taskId: string) => {
		const task = tasks.find(t => t.id === taskId);
		if (!task) return;
		
		try {
			console.log('[TerminalPage] Creating direct terminal for task:', taskId);
			
			// Create a clean session request object for task-specific terminal
			const sessionRequest = {
				name: `Terminal (${task.id.replace('task-', 'TASK-')})`,
				taskId: taskId,
				workingDir: '', // Server will set worktree directory
				cols: 80,
				rows: 24,
			};
			
			console.log('[TerminalPage] Direct session request:', sessionRequest);
			const newSession = await createSession(sessionRequest);
			console.log('[TerminalPage] Direct terminal created successfully:', newSession);
			setActiveSessionId(newSession.id);
		} catch (error) {
			console.error('[TerminalPage] Error creating direct terminal:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			alert(`Failed to create terminal for task: ${errorMessage}`);
		}
	};

	const handleCreateTerminal = async (name: string, workingDir: string) => {
		try {
			console.log('[TerminalPage] Creating new terminal with name:', name, 'workingDir:', workingDir);
			
			// Create a clean session request object
			const sessionRequest = {
				name: name,
				taskId: modalTaskId,
				workingDir: workingDir,
				cols: 80,
				rows: 24,
			};
			
			console.log('[TerminalPage] Session request:', sessionRequest);
			const newSession = await createSession(sessionRequest);
			console.log('[TerminalPage] Terminal created successfully:', newSession);
			setActiveSessionId(newSession.id);
		} catch (error) {
			console.error('[TerminalPage] Error creating terminal:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			alert(`Failed to create new terminal: ${errorMessage}`);
		}
	};

	const handleKillSession = async (sessionId: string) => {
		try {
			await killSession(sessionId);
			
			// Refresh sessions list to ensure UI is updated
			await refreshSessions();
			
			// Update active session if needed
			if (sessionId === activeSessionId) {
				setActiveSessionId(null);
			}
			
			console.log(`Successfully killed session ${sessionId}`);
		} catch (error) {
			console.error('Error killing session:', error);
			alert('Failed to kill session');
		}
	};

	const handleSplitSession = () => {
		// TODO: Implement split terminal functionality
		alert('Split terminal functionality would be implemented here');
	};

	const handleDuplicateSession = async () => {
		if (!activeSession) return;
		
		try {
			const newSession = await createSession({
				name: `${activeSession.title} (Copy)`,
				taskId: activeSession.taskId,
				cols: 80,
				rows: 24,
			});
			setActiveSessionId(newSession.id);
		} catch (error) {
			console.error('Error duplicating session:', error);
			alert('Failed to duplicate session');
		}
	};

	// Show loading state
	if (loading && sessions.length === 0) {
		return (
			<div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-900">
				<div className="text-center text-gray-600 dark:text-gray-400">
					<div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-circle mx-auto mb-4"></div>
					<p>Loading terminals...</p>
				</div>
			</div>
		);
	}

	// Show error state
	if (error) {
		return (
			<div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-900">
				<div className="text-center text-red-600 dark:text-red-400">
					<svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
					</svg>
					<p className="text-lg font-medium mb-2">Terminal Error</p>
					<p className="text-sm mb-4">{error}</p>
					<button
						onClick={() => handleNewTerminal()}
						className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
					>
						Create New Terminal
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full bg-gray-100 dark:bg-gray-900">
			{/* Terminal Sidebar */}
			<TerminalSidebar
				sessions={sessions}
				activeSessionId={activeSessionId || ''}
				onSessionSelect={handleSessionSelect}
				onKillAll={handleKillAll}
				isCollapsed={isSidebarCollapsed}
				onToggleCollapsed={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
			/>

			{/* Main Terminal Area */}
			<div className="flex-1 flex flex-col h-full max-h-full overflow-hidden">
				{/* Task Context Header */}
				{activeTask && (
					<div className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 text-sm border-b border-gray-300 dark:border-gray-700">
						🎯 {activeTask.id.replace('task-', 'TASK-')}: {activeTask.title}
					</div>
				)}

				{/* Terminal Session */}
				{activeSession ? (
					<EnhancedTerminalSession
						session={activeSession}
						onKill={() => handleKillSession(activeSession.id)}
						onSplit={handleSplitSession}
						onDuplicate={handleDuplicateSession}
					/>
				) : (
					<div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
						<div className="text-center text-gray-600 dark:text-gray-400 max-w-md">
							<svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
							</svg>
							<p className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">No terminal session active</p>
							<p className="text-sm mb-6">Create a new terminal session to get started</p>
							
							<div className="space-y-3">
								<button
									onClick={() => handleNewTerminal()}
									className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
								>
									New Terminal
								</button>
								
								{tasks.length > 0 && (
									<div className="border-t border-gray-200 dark:border-gray-700 pt-4">
										<p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Or create terminal for a task:</p>
										<div className="max-h-32 overflow-y-auto space-y-1">
											{tasks.slice(0, 5).map(task => (
												<button
													key={task.id}
													onClick={() => handleDirectTerminalCreation(task.id)}
													className="w-full px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left"
												>
													<span className="font-medium">{task.id.replace('task-', 'TASK-')}</span>
													<span className="ml-2 text-gray-500 dark:text-gray-400 truncate">{task.title}</span>
												</button>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Floating New Terminal Button */}
			<button
				onClick={() => handleNewTerminal()}
				className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 dark:bg-blue-700 text-white rounded-circle shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 hover:scale-105 transition-all duration-200 z-50"
				title="Create new terminal session"
			>
				<svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
				</svg>
			</button>

			{/* Terminal Create Modal */}
			<TerminalCreateModal
				isOpen={showCreateModal}
				onClose={() => {
					setShowCreateModal(false);
					setModalTaskId(undefined);
				}}
				onCreateTerminal={handleCreateTerminal}
				defaultWorkingDir={
					modalTaskId && tasks.find(t => t.id === modalTaskId) 
						? '/Users/mac/tools/Backlog.md/.tree/' // Will be updated by server logic
						: '/Users/mac/tools/Backlog.md'
				}
				defaultName={
					modalTaskId && tasks.find(t => t.id === modalTaskId)
						? `Terminal (${tasks.find(t => t.id === modalTaskId)?.id.replace('task-', 'TASK-')})`
						: ''
				}
			/>
		</div>
	);
};

export default TerminalPage;