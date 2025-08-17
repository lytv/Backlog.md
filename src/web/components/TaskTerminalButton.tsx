import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TerminalAPI } from '../services/terminal-api';
import type { Task } from '../../types';

interface TaskTerminalButtonProps {
	task: Task;
	className?: string;
	children?: React.ReactNode;
}

const TaskTerminalButton: React.FC<TaskTerminalButtonProps> = ({ 
	task, 
	className = '', 
	children 
}) => {
	const [isCreating, setIsCreating] = useState(false);
	const navigate = useNavigate();
	const terminalAPI = new TerminalAPI();

	const handleCreateTerminal = async () => {
		if (isCreating) return;

		try {
			setIsCreating(true);

			// Create terminal session for this task
			const session = await terminalAPI.createSession({
				name: `Terminal (${task.id.replace('task-', 'TASK-')})`,
				taskId: task.id,
				workingDir: undefined, // Will use project root for now
				cols: 80,
				rows: 24,
			});

			// Navigate to terminal page
			navigate('/terminal');

			console.log(`Created terminal session ${session.id} for task ${task.id}`);
		} catch (error) {
			console.error('Error creating terminal for task:', error);
			alert(`Failed to create terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<button
			onClick={handleCreateTerminal}
			disabled={isCreating}
			className={`
				inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md
				bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
				hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white
				disabled:opacity-50 disabled:cursor-not-allowed
				transition-colors duration-200
				${className}
			`}
			title={`Create terminal session for ${task.id}`}
		>
			{isCreating ? (
				<>
					<div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-circle mr-1.5"></div>
					Creating...
				</>
			) : (
				<>
					<svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
					{children || 'Terminal'}
				</>
			)}
		</button>
	);
};

export default TaskTerminalButton;