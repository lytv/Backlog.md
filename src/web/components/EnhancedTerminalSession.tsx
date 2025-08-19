import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTerminalSession } from '../hooks/useTerminal';

// Import xterm.js if available
let Terminal: any = null;
let FitAddon: any = null;
let WebLinksAddon: any = null;
let hasXterm = false;

try {
	// Dynamic import to avoid SSR issues
	if (typeof window !== 'undefined') {
		const xtermModule = require('xterm');
		const fitModule = require('xterm-addon-fit');
		const webLinksModule = require('xterm-addon-web-links');
		
		Terminal = xtermModule.Terminal;
		FitAddon = fitModule.FitAddon;
		WebLinksAddon = webLinksModule.WebLinksAddon;
		hasXterm = true;
		console.log('[EnhancedTerminalSession] xterm.js loaded successfully');
	}
} catch (error) {
	console.warn('[EnhancedTerminalSession] xterm.js not available, using fallback:', error);
	hasXterm = false;
}

interface TerminalSession {
	id: string;
	taskId?: string;
	title: string;
	isActive: boolean;
	status: 'running' | 'idle' | 'exited';
	duration: string;
	command?: string;
}

interface EnhancedTerminalSessionProps {
	session: TerminalSession;
	onKill: () => void;
	onSplit: () => void;
	onDuplicate: () => void;
}

const TERMINAL_THEMES = {
	default: {
		background: '#1e1e1e',
		foreground: '#d4d4d4',
		cursor: '#ffffff',
		cursorAccent: '#000000',
		selection: '#264f78',
		black: '#000000',
		brightBlack: '#666666',
		red: '#cd3131',
		brightRed: '#f14c4c',
		green: '#0dbc79',
		brightGreen: '#23d18b',
		yellow: '#e5e510',
		brightYellow: '#f5f543',
		blue: '#2472c8',
		brightBlue: '#3b8eea',
		magenta: '#bc3fbc',
		brightMagenta: '#d670d6',
		cyan: '#11a8cd',
		brightCyan: '#29b8db',
		white: '#e5e5e5',
		brightWhite: '#ffffff',
	},
	vibeTunnel: {
		background: '#0c0c0c',
		foreground: '#cccccc',
		cursor: '#00ff00',
		cursorAccent: '#000000',
		selection: '#404040',
		black: '#0c0c0c',
		brightBlack: '#767676',
		red: '#c50f1f',
		brightRed: '#e74856',
		green: '#13a10e',
		brightGreen: '#16c60c',
		yellow: '#c19c00',
		brightYellow: '#f9f1a5',
		blue: '#0037da',
		brightBlue: '#3b78ff',
		magenta: '#881798',
		brightMagenta: '#b4009e',
		cyan: '#3a96dd',
		brightCyan: '#61d6d6',
		white: '#cccccc',
		brightWhite: '#f2f2f2',
	}
};

const EnhancedTerminalSession: React.FC<EnhancedTerminalSessionProps> = ({
	session,
	onKill,
	onSplit,
	onDuplicate
}) => {
	const terminalRef = useRef<HTMLDivElement>(null);
	const xtermRef = useRef<any>(null);
	const fitAddonRef = useRef<any>(null);
	const [isXtermReady, setIsXtermReady] = useState(false);
	const [theme, setTheme] = useState<keyof typeof TERMINAL_THEMES>('default');
	
	// Connect to real terminal session
	const { 
		session: realSession, 
		connected, 
		output, 
		sendInput, 
		resize 
	} = useTerminalSession(session.id);

	// Initialize xterm.js terminal
	useEffect(() => {
		if (!terminalRef.current || !Terminal || xtermRef.current) return;

		try {
			console.log('[EnhancedTerminalSession] Initializing xterm.js terminal');
			
			// Create terminal instance
			const terminal = new Terminal({
				theme: TERMINAL_THEMES[theme],
				fontFamily: '"Fira Code", "SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace',
				fontSize: 14,
				fontWeight: 400,
				fontWeightBold: 700,
				lineHeight: 1.2,
				letterSpacing: 0,
				cursor: 'block',
				cursorBlink: true,
				cursorStyle: 'block',
				bellStyle: 'none',
				scrollback: 10000,
				tabStopWidth: 4,
				rightClickSelectsWord: true,
				fastScrollModifier: 'alt',
				fastScrollSensitivity: 5,
				scrollSensitivity: 1,
				macOptionIsMeta: true,
				macOptionClickForcesSelection: false,
				convertEol: true,
				allowTransparency: false,
				drawBoldTextInBrightColors: true,
				minimumContrastRatio: 4.5,
			});

			// Create fit addon
			const fitAddon = new FitAddon();
			terminal.loadAddon(fitAddon);
			
			// Add web links addon if available
			if (WebLinksAddon) {
				const webLinksAddon = new WebLinksAddon();
				terminal.loadAddon(webLinksAddon);
			}

			// Open terminal
			terminal.open(terminalRef.current);
			
			// Store references
			xtermRef.current = terminal;
			fitAddonRef.current = fitAddon;

			// Set up input handling with debugging
			terminal.onData((data: string) => {
				console.log('[EnhancedTerminalSession] Input received:', JSON.stringify(data));
				if (connected) {
					console.log('[EnhancedTerminalSession] Sending input to backend');
					sendInput({ text: data });
				} else {
					console.warn('[EnhancedTerminalSession] Not connected, cannot send input');
				}
			});

			// Set up key handling for special keys
			terminal.onKey(({ key, domEvent }: { key: string; domEvent: KeyboardEvent }) => {
				console.log('[EnhancedTerminalSession] Key pressed:', { key, ctrlKey: domEvent.ctrlKey, code: domEvent.code });
				// Handle special key combinations
				if (domEvent.ctrlKey && domEvent.key === 'c') {
					if (connected) {
						console.log('[EnhancedTerminalSession] Sending Ctrl+C');
						sendInput({ text: '\x03' }); // Ctrl+C
					}
					domEvent.preventDefault();
				} else if (domEvent.ctrlKey && domEvent.key === 'd') {
					if (connected) {
						console.log('[EnhancedTerminalSession] Sending Ctrl+D');
						sendInput({ text: '\x04' }); // Ctrl+D
					}
					domEvent.preventDefault();
				} else if (domEvent.ctrlKey && domEvent.key === 'z') {
					if (connected) {
						console.log('[EnhancedTerminalSession] Sending Ctrl+Z');
						sendInput({ text: '\x1a' }); // Ctrl+Z
					}
					domEvent.preventDefault();
				}
			});

			// Fit terminal to container
			setTimeout(() => {
				fitAddon.fit();
				setIsXtermReady(true);
				console.log('[EnhancedTerminalSession] xterm.js terminal ready');
			}, 100);

			// Focus terminal
			terminal.focus();

			console.log('[EnhancedTerminalSession] xterm.js terminal initialized successfully');

		} catch (error) {
			console.error('[EnhancedTerminalSession] Error initializing xterm.js:', error);
			setIsXtermReady(false);
		}

		// Cleanup on unmount
		return () => {
			if (xtermRef.current) {
				xtermRef.current.dispose();
				xtermRef.current = null;
			}
		};
	}, [terminalRef.current, Terminal, theme, connected, sendInput]);

	// Handle output from terminal session
	useEffect(() => {
		if (!xtermRef.current || !output) return;

		try {
			// Write output to xterm.js terminal
			xtermRef.current.write(output);
		} catch (error) {
			console.error('[EnhancedTerminalSession] Error writing to xterm.js:', error);
		}
	}, [output]);

	// Handle terminal resize
	const handleResize = useCallback(() => {
		if (fitAddonRef.current && xtermRef.current && connected) {
			try {
				fitAddonRef.current.fit();
				const { cols, rows } = xtermRef.current;
				resize(cols, rows);
			} catch (error) {
				console.error('[EnhancedTerminalSession] Error resizing terminal:', error);
			}
		}
	}, [connected, resize]);

	// Set up resize observer
	useEffect(() => {
		if (!terminalRef.current) return;

		const resizeObserver = new ResizeObserver(() => {
			handleResize();
		});

		resizeObserver.observe(terminalRef.current);

		return () => {
			resizeObserver.disconnect();
		};
	}, [handleResize]);

	// Handle window resize
	useEffect(() => {
		const handleWindowResize = () => {
			setTimeout(handleResize, 100);
		};

		window.addEventListener('resize', handleWindowResize);
		return () => window.removeEventListener('resize', handleWindowResize);
	}, [handleResize]);

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

	const toggleTheme = () => {
		setTheme(current => current === 'default' ? 'vibeTunnel' : 'default');
	};

	// Clear terminal
	const clearTerminal = () => {
		if (xtermRef.current) {
			xtermRef.current.clear();
		}
	};

	// Fallback component when xterm.js is not available
	const FallbackTerminal = () => {
		const fallbackRef = useRef<HTMLDivElement>(null);
		const [inputValue, setInputValue] = useState('');

		// Auto-scroll to bottom
		useEffect(() => {
			if (fallbackRef.current) {
				fallbackRef.current.scrollTop = fallbackRef.current.scrollHeight;
			}
		}, [output]);

		const handleInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter' && connected) {
				e.preventDefault();
				const value = inputValue.trim();
				if (value) {
					sendInput({ text: value + '\n' });
					setInputValue('');
				}
			}
		};

		const outputLines = output.split('\n').map((line, index) => ({
			id: index,
			content: line,
		}));

		return (
			<>
				{/* Terminal Content */}
				<div
					ref={fallbackRef}
					className="flex-1 overflow-auto bg-gray-900 text-green-400 p-4 font-mono text-sm leading-relaxed min-h-0"
					style={{ 
						scrollBehavior: 'smooth',
						maxHeight: 'calc(100vh - 200px)',
						height: '100%'
					}}
				>
					{!connected ? (
						<div className="text-yellow-400">
							Connecting to terminal session...
						</div>
					) : outputLines.length === 0 ? (
						<div className="text-gray-500">
							Terminal session started. Type commands below.
						</div>
					) : (
						outputLines.map((line, index) => (
							<div key={line.id} className="mb-1">
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
							<span className="text-blue-400">$</span>
							<span className="ml-1 animate-pulse text-green-400">▋</span>
						</div>
					)}
				</div>

				{/* Terminal Input */}
				<div className="bg-gray-900 border-t border-gray-700 p-4">
					<div className="flex items-center text-sm font-mono">
						<span className="text-blue-400">$</span>
						<input
							type="text"
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onKeyDown={handleInputSubmit}
							disabled={!connected || session.status !== 'running'}
							className={`flex-1 ml-2 bg-transparent outline-none ${
								connected && session.status === 'running'
									? 'text-green-400 placeholder-gray-500'
									: 'text-gray-600 placeholder-gray-600'
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
							<span className="text-xs text-gray-500 ml-2">
								Connected
							</span>
						)}
					</div>
				</div>
			</>
		);
	};

	return (
		<div className="flex-1 flex flex-col bg-white dark:bg-gray-900 h-full max-h-full overflow-hidden">
			{/* Terminal Header */}
			<div className="px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
				<div className="flex items-center text-gray-900 dark:text-white">
					<div className={`w-1.5 h-1.5 rounded-circle mr-2 ${getStatusColor()}`} />
					<span className="text-sm font-medium">{session.title}</span>
					{Terminal && (
						<span className="ml-2 text-xs text-green-600 dark:text-green-400">
							xterm.js
						</span>
					)}
				</div>
				
				<div className="flex items-center space-x-2">
					{Terminal && (
						<>
							<button
								onClick={toggleTheme}
								className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
								title="Toggle theme"
							>
								🎨
							</button>
							<button
								onClick={clearTerminal}
								className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
								title="Clear terminal"
							>
								🗑️
							</button>
						</>
					)}
					<button
						onClick={onSplit}
						className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
						title="Split terminal"
					>
						Split
					</button>
					<button
						onClick={onDuplicate}
						className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
						title="Duplicate terminal"
					>
						Duplicate
					</button>
					<button
						onClick={onKill}
						className="px-3 py-1 text-xs bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 rounded transition-colors"
						title="Kill terminal"
					>
						Kill
					</button>
				</div>
			</div>

			{/* Terminal Content */}
			{Terminal ? (
				<div 
					ref={terminalRef}
					className="flex-1 overflow-hidden"
					style={{ height: '100%' }}
				/>
			) : (
				<FallbackTerminal />
			)}

			{/* Connection Status */}
			{!connected && (
				<div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
					<div className="bg-gray-800 text-white px-4 py-2 rounded">
						<div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-circle mx-auto mb-2"></div>
						<div className="text-sm">Connecting to terminal...</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default EnhancedTerminalSession;