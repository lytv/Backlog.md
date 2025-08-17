import React, { useRef, useEffect, useState } from 'react';
import { useTerminalSession } from '../hooks/useTerminal';

interface TerminalSession {
	id: string;
	taskId?: string;
	title: string;
	isActive: boolean;
	status: 'running' | 'idle' | 'exited';
	duration: string;
	command?: string;
}

interface TerminalSessionProps {
	session: TerminalSession;
	onKill: () => void;
	onSplit: () => void;
	onDuplicate: () => void;
}

const TerminalSession: React.FC<TerminalSessionProps> = ({
	session,
	onKill,
	onSplit,
	onDuplicate
}) => {
	const terminalRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = useState('');
	
	// Connect to real terminal session
	const { 
		session: realSession, 
		connected, 
		output, 
		sendInput, 
		resize 
	} = useTerminalSession(session.id);

	// Auto-scroll to bottom when content changes
	useEffect(() => {
		if (terminalRef.current) {
			terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
		}
	}, [output]);

	const getStatusColor = () => {
		switch (session.status) {
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

	// Handle input submission
	const handleInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && connected) {
			e.preventDefault();
			const value = inputValue.trim();
			if (value) {
				// Create a clean input object without any DOM references
				const cleanInput = { text: value + '\n' };
				sendInput(cleanInput);
				setInputValue('');
			}
		}
	};

	// Parse terminal output into lines
	const outputLines = output.split('\n').map((line, index) => ({
		id: index,
		content: line,
		type: 'output' // Simple for now, could be enhanced with ANSI parsing
	}));

	const getLineColor = (type: string) => {
		switch (type) {
			case 'success':
				return 'text-green-600 dark:text-green-400';
			case 'error':
				return 'text-red-600 dark:text-red-400';
			case 'prompt':
				return 'text-blue-600 dark:text-blue-400';
			case 'output':
				return 'text-gray-700 dark:text-gray-300';
			default:
				return 'text-gray-700 dark:text-gray-300';
		}
	};

	return (
		<div className="flex-1 flex flex-col bg-white dark:bg-gray-900 h-full max-h-full overflow-hidden">
			{/* Terminal Header */}
			<div className="px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
				<div className="flex items-center text-gray-900 dark:text-white">
					<div className={`w-1.5 h-1.5 rounded-circle mr-2 ${getStatusColor()}`} />
					<span className="text-sm font-medium">{session.title}</span>
				</div>
				
				<div className="flex items-center space-x-2">
					<button
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onSplit();
						}}
						className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white rounded transition-colors duration-200"
					>
						Split
					</button>
					<button
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onDuplicate();
						}}
						className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white rounded transition-colors duration-200"
					>
						Duplicate
					</button>
					<button
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onKill();
						}}
						className="px-3 py-1 text-xs bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 rounded transition-colors duration-200"
					>
						Kill
					</button>
				</div>
			</div>

			{/* Terminal Content */}
			<div
				ref={terminalRef}
				className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-4 font-mono text-sm leading-relaxed min-h-0"
				style={{ 
					scrollBehavior: 'smooth',
					overflowAnchor: 'none', // Prevent scroll anchoring from interfering
					maxHeight: 'calc(100vh - 200px)', // Ensure it doesn't overflow the screen
					height: '100%'
				}}
			>
				{!connected ? (
					<div className="text-yellow-600 dark:text-yellow-400">
						Connecting to terminal session...
					</div>
				) : outputLines.length === 0 ? (
					<div className="text-gray-500 dark:text-gray-400">
						Terminal session started. Type commands below.
					</div>
				) : (
					outputLines.map((line, index) => (
						<div key={line.id} className={`mb-1 ${getLineColor(line.type)}`}>
							{line.content === '' ? (
								<div className="h-4"></div>
							) : (
								<div style={{ whiteSpace: 'pre-wrap' }}>{line.content}</div>
							)}
						</div>
					))
				)}
				{connected && session.status === 'running' && (
					<div className="flex">
						<span className="text-blue-600 dark:text-blue-400">$</span>
						<span className="ml-1 animate-pulse text-gray-800 dark:text-gray-200">▋</span>
					</div>
				)}
			</div>

			{/* Terminal Input */}
			<div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4">
				<div className="flex items-center text-sm font-mono">
					<span className="text-blue-600 dark:text-blue-400">$</span>
					<input
						ref={inputRef}
						type="text"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleInputSubmit}
						disabled={!connected || session.status !== 'running'}
						className={`flex-1 ml-2 bg-transparent outline-none ${
							connected && session.status === 'running'
								? 'text-gray-800 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400'
								: 'text-gray-400 dark:text-gray-600 placeholder-gray-400 dark:placeholder-gray-600'
						}`}
						placeholder={
							!connected 
								? 'Connecting...' 
								: session.status !== 'running' 
									? 'Terminal not running' 
									: 'Type command and press Enter...'
						}
						autoFocus={connected && session.status === 'running'}
					/>
					{connected && session.status === 'running' && (
						<span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
							Connected
						</span>
					)}
				</div>
			</div>
		</div>
	);
};

export default TerminalSession;