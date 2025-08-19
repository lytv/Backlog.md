import { EventEmitter } from "node:events";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { v4 as uuidv4 } from "uuid";

// Import node-pty with proper error handling
let pty: any;
try {
	pty = await import("node-pty");
	console.log("[EnhancedTerminalManager] node-pty loaded successfully");
} catch (error) {
	console.warn("[EnhancedTerminalManager] node-pty not available, using fallback shell mode:", error);
	pty = null;
}

import type { CreateTerminalRequest, TerminalInput, TerminalMessage, TerminalSession } from "../../types/terminal.ts";
import { TerminalSessionManager } from "./session-manager.ts";

interface ActiveSession {
	session: TerminalSession;
	ptyProcess?: any; // IPty from node-pty or Node.js ChildProcess
	persistentShell?: any; // For persistent shell fallback
	eventListeners: Set<(message: TerminalMessage) => void>;
	bufferData: string; // Store raw terminal buffer data
	lastActivity: Date;
}

export class EnhancedTerminalManager extends EventEmitter {
	private sessions = new Map<string, ActiveSession>();
	private sessionManager: TerminalSessionManager;
	private projectPath: string;
	private cleanupIntervalId?: NodeJS.Timeout;

	constructor(projectPath: string) {
		super();
		this.projectPath = projectPath;
		this.sessionManager = new TerminalSessionManager(projectPath);
		console.log(`[EnhancedTerminalManager] Initialized for project: ${projectPath}`);
		
		// Load existing sessions on startup
		this.loadExistingSessions();
	}

	/**
	 * Minimal terminal output cleaning - preserve most formatting
	 */
	private cleanTerminalOutput(output: string): string {
		// Only remove very specific problematic sequences
		return output
			// Remove bracketed paste mode enable/disable
			.replace(/\x1b\[\?2004[hl]/g, '')
			// Normalize line endings but keep most ANSI sequences
			.replace(/\r\n/g, '\n');
	}

	/**
	 * Process terminal buffer data with xterm.js compatibility
	 */
	private processBufferData(data: string): { raw: string; cleaned: string; isControl: boolean } {
		const cleaned = this.cleanTerminalOutput(data);
		const isControl = /^[\x00-\x1f\x7f-\x9f]/.test(data) && !data.includes('\n');
		
		return {
			raw: data,
			cleaned,
			isControl
		};
	}

	/**
	 * Create a new terminal session with enhanced PTY support
	 */
	async createSession(request: CreateTerminalRequest): Promise<TerminalSession> {
		const sessionId = uuidv4();
		const { name, workingDir = this.projectPath, cols = 80, rows = 24, taskId } = request;

		// Determine shell command
		const command = this.getShellCommand();
		const resolvedWorkingDir = resolve(workingDir);

		// Create session object
		const session: TerminalSession = {
			id: sessionId,
			name,
			command,
			workingDir: resolvedWorkingDir,
			taskId,
			cols,
			rows,
			status: "idle",
			startedAt: new Date().toISOString(),
		};

		try {
			// Create session directory
			const paths = await this.sessionManager.createSessionDirectory(sessionId);
			await this.sessionManager.saveSessionInfo(sessionId, session);

			// Create PTY or fallback process
			let terminalProcess: any = null;

			// Skip PTY on systems with persistent ENXIO errors (like this macOS system)
			// and use enhanced shell that better supports interactive applications
			console.log(`[EnhancedTerminalManager] Using enhanced shell mode for better interactive app compatibility`);
			terminalProcess = await this.createShellProcess(sessionId, session, command, resolvedWorkingDir);

			// Optional: Try PTY as backup if shell fails (currently disabled due to ENXIO)
			// if (pty && !terminalProcess) {
			//     terminalProcess = await this.createPtyProcess(sessionId, session, command, resolvedWorkingDir, cols, rows);
			// }

			// Store active session
			this.sessions.set(sessionId, {
				session,
				ptyProcess: terminalProcess,
				eventListeners: new Set(),
				bufferData: "",
				lastActivity: new Date(),
			});

			console.log(`[EnhancedTerminalManager] Created session ${sessionId} successfully`);
			return session;

		} catch (error) {
			console.error(`[EnhancedTerminalManager] Failed to create session ${sessionId}:`, error);
			// Clean up on failure
			try {
				await this.sessionManager.cleanupSession(sessionId);
			} catch (cleanupError) {
				console.warn(`[EnhancedTerminalManager] Cleanup failed for session ${sessionId}:`, cleanupError);
			}
			throw error;
		}
	}

	/**
	 * Create a PTY process with robust error handling and ENXIO protection
	 */
	private async createPtyProcess(sessionId: string, session: TerminalSession, command: string[], workingDir: string, cols: number, rows: number): Promise<any> {
		console.log(`[EnhancedTerminalManager] Attempting PTY creation for session ${sessionId}`);
		
		const ptyOptions = {
			name: "xterm-256color",
			cols,
			rows,
			cwd: workingDir,
			env: {
				...process.env,
				TERM: "xterm-256color",
				COLORTERM: "truecolor",
				LANG: "en_US.UTF-8",
				LC_ALL: "en_US.UTF-8",
				// Enable TTY-like behavior for interactive applications
				FORCE_COLOR: "1",
				// Disable problematic features that cause ENXIO
				NO_UPDATE_NOTIFIER: "1",
				CI: "false",
			},
			useConpty: process.platform === "win32" ? false : undefined,
			handleFlowControl: false,
			windowsHide: process.platform === "win32"
		};

		try {
			// Use interactive shell directly for better compatibility
			let ptyProcess = pty.spawn('/bin/zsh', ['-i'], ptyOptions);
			
			// Test PTY immediately to catch ENXIO errors early
			if (!ptyProcess?.pid) {
				throw new Error("PTY process failed to initialize - no PID");
			}

			// Give PTY minimal time to initialize and test for ENXIO
			await new Promise((resolve, reject) => {
				let resolved = false;
				const timeout = setTimeout(() => {
					if (!resolved) {
						resolved = true;
						resolve(null);
					}
				}, 200);

				// Listen for immediate errors (like ENXIO)
				const errorHandler = (error: Error) => {
					if (!resolved) {
						resolved = true;
						clearTimeout(timeout);
						reject(error);
					}
				};

				if (ptyProcess.onError) {
					ptyProcess.onError(errorHandler);
				}
				
				// Also catch process errors
				ptyProcess.on?.('error', errorHandler);
			});

			// Update session with PID
			session.pid = ptyProcess.pid;
			session.status = "running";
			await this.sessionManager.saveSessionInfo(sessionId, session);

			// Set up PTY event handlers
			this.setupPtyHandlers(sessionId, ptyProcess);
			
			console.log(`[EnhancedTerminalManager] PTY created successfully for session ${sessionId} with PID ${session.pid}`);
			return ptyProcess;

		} catch (primaryError) {
			console.warn(`[EnhancedTerminalManager] PTY creation failed (${primaryError.code || primaryError.message}), using shell fallback`);
			return null;
		}
	}

	/**
	 * Create enhanced shell process fallback
	 */
	private async createShellProcess(sessionId: string, session: TerminalSession, command: string[], workingDir: string): Promise<any> {
		console.log(`[EnhancedTerminalManager] Creating enhanced shell process for session ${sessionId}`);
		
		const shellProcess = spawn('/bin/zsh', ['-i', '-l'], {
			cwd: workingDir,
			stdio: ['pipe', 'pipe', 'pipe'],
			env: {
				...process.env,
				SHELL: '/bin/zsh',
				HOME: process.env.HOME,
				USER: process.env.USER,
				TERM: 'xterm-256color',
				COLORTERM: 'truecolor',
				LANG: 'en_US.UTF-8',
				LC_ALL: 'en_US.UTF-8',
				// Force loading of interactive and login shell configs
				PS1: '$ ',
				// Enable TTY-like behavior for interactive apps
				FORCE_COLOR: '1',
				// Ensure shell loads all configurations
				ZDOTDIR: process.env.ZDOTDIR || process.env.HOME,
				// Help interactive applications work without real TTY
				NO_UPDATE_NOTIFIER: '1',
				CI: 'false',
				// Enable better terminal emulation
				TERM_PROGRAM: 'xterm',
				TERM_PROGRAM_VERSION: '1.0',
			},
			// Enable TTY-like behavior without PTY
			windowsHide: false,
		});

		if (!shellProcess.pid) {
			throw new Error("Failed to create shell process - no PID");
		}

		// Update session
		session.pid = shellProcess.pid;
		session.status = "running";
		await this.sessionManager.saveSessionInfo(sessionId, session);

		// Set up enhanced shell handlers
		this.setupShellHandlers(sessionId, shellProcess);
		
		// Initialize shell with proper prompt and TTY simulation
		setTimeout(() => {
			try {
				console.log(`[EnhancedTerminalManager] Starting shell initialization for session ${sessionId}`);
				// Force reload shell configuration to ensure aliases are available
				shellProcess.stdin?.write('source ~/.zshrc 2>/dev/null || true\n');
				shellProcess.stdin?.write('source ~/.zprofile 2>/dev/null || true\n');
				shellProcess.stdin?.write('source ~/.profile 2>/dev/null || true\n');
				// Directly set the cl alias to ensure it works
				shellProcess.stdin?.write('alias cl="claude --dangerously-skip-permissions"\n');
				// Test if alias was set
				shellProcess.stdin?.write('echo "DEBUG: Alias set. Testing with alias command:"\n');
				shellProcess.stdin?.write('alias cl\n');
				// Set up better shell environment for interactive applications
				shellProcess.stdin?.write('export PS1="$ "\n');
				shellProcess.stdin?.write('export FORCE_COLOR=1\n');
				shellProcess.stdin?.write('export NO_UPDATE_NOTIFIER=1\n');
				shellProcess.stdin?.write('export CI=false\n');
				shellProcess.stdin?.write('stty -echo 2>/dev/null || true\n'); // Disable shell echo since we handle it
				shellProcess.stdin?.write('exec 2>&1\n'); // Merge stderr with stdout
				shellProcess.stdin?.write('echo "Enhanced Terminal ready - supports interactive applications and aliases"\n');
				shellProcess.stdin?.write('printf "$ "\n');
				console.log(`[EnhancedTerminalManager] Shell initialization commands sent for session ${sessionId}`);
			} catch (error) {
				console.warn(`[EnhancedTerminalManager] Shell initialization warning:`, error);
			}
		}, 300);
		
		// Send initial welcome message
		const initialMessage = `\x1b[H\x1b[2J\x1b[32mTerminal Session Started\x1b[0m\nWorking Directory: \x1b[36m${workingDir}\x1b[0m\n\n`;
		this.emitToSession(sessionId, {
			type: "output",
			sessionId,
			data: initialMessage,
		});

		return shellProcess;
	}

	/**
	 * Set up enhanced PTY event handlers
	 */
	private setupPtyHandlers(sessionId: string, ptyProcess: any): void {
		console.log(`[EnhancedTerminalManager] Setting up PTY handlers for session ${sessionId}`);
		
		// Handle PTY data output
		ptyProcess.onData((data: string) => {
			try {
				const processed = this.processBufferData(data);
				
				// Update session buffer
				const activeSession = this.sessions.get(sessionId);
				if (activeSession) {
					activeSession.bufferData += processed.cleaned;
					activeSession.lastActivity = new Date();
					
					// Keep buffer size manageable (last 100KB)
					if (activeSession.bufferData.length > 100000) {
						activeSession.bufferData = activeSession.bufferData.slice(-50000);
					}
				}
				
				// Emit to WebSocket clients
				this.emitToSession(sessionId, {
					type: "output",
					sessionId,
					data: processed.cleaned,
					raw: processed.raw,
					isControl: processed.isControl,
				});
			} catch (error) {
				console.error(`[EnhancedTerminalManager] Error in PTY data handler:`, error);
			}
		});

		// Handle PTY exit
		ptyProcess.onExit(async (event: { exitCode: number; signal?: number }) => {
			try {
				console.log(`[EnhancedTerminalManager] PTY session ${sessionId} exited with code ${event.exitCode}`);

				// Update session status
				await this.sessionManager.updateSessionStatus(sessionId, "exited", undefined, event.exitCode);

				// Send exit message
				const exitMessage = `\n\x1b[33m[Process exited with code ${event.exitCode}]\x1b[0m\n`;
				this.emitToSession(sessionId, {
					type: "exit",
					sessionId,
					exitCode: event.exitCode,
					data: exitMessage,
				});

				// Clean up session after delay
				setTimeout(() => {
					this.sessions.delete(sessionId);
				}, 5000);
			} catch (error) {
				console.error(`[EnhancedTerminalManager] Error in PTY exit handler:`, error);
			}
		});

		// Handle PTY errors
		if (ptyProcess.onError) {
			ptyProcess.onError((error: Error) => {
				console.error(`[EnhancedTerminalManager] PTY error for session ${sessionId}:`, error);
				
				const errorMessage = `\n\x1b[31m[Terminal Error: ${error.message}]\x1b[0m\n`;
				this.emitToSession(sessionId, {
					type: "error",
					sessionId,
					data: errorMessage,
				});
			});
		}
	}

	/**
	 * Set up enhanced shell process handlers
	 */
	private setupShellHandlers(sessionId: string, shellProcess: any): void {
		console.log(`[EnhancedTerminalManager] Setting up shell handlers for session ${sessionId}`);

		// Handle stdout
		shellProcess.stdout?.on('data', (data: Buffer) => {
			try {
				const dataStr = data.toString('utf8');
				console.log(`[EnhancedTerminalManager] Shell stdout data received for session ${sessionId}:`, JSON.stringify(dataStr));
				
				const processed = this.processBufferData(dataStr);
				
				// Update session buffer
				const activeSession = this.sessions.get(sessionId);
				if (activeSession) {
					activeSession.bufferData += processed.cleaned;
					activeSession.lastActivity = new Date();
					
					// Keep buffer manageable
					if (activeSession.bufferData.length > 100000) {
						activeSession.bufferData = activeSession.bufferData.slice(-50000);
					}
				}
				
				// Emit to clients
				console.log(`[EnhancedTerminalManager] Emitting shell output to session ${sessionId}:`, JSON.stringify(processed.cleaned));
				this.emitToSession(sessionId, {
					type: "output",
					sessionId,
					data: processed.cleaned,
				});
			} catch (error) {
				console.error(`[EnhancedTerminalManager] Error in shell stdout handler:`, error);
			}
		});

		// Handle stderr
		shellProcess.stderr?.on('data', (data: Buffer) => {
			try {
				const processed = this.processBufferData(data.toString('utf8'));
				
				// Color stderr output red
				const stderrMarked = `\x1b[31m${processed.cleaned}\x1b[0m`;
				
				// Update session buffer
				const activeSession = this.sessions.get(sessionId);
				if (activeSession) {
					activeSession.bufferData += stderrMarked;
					activeSession.lastActivity = new Date();
				}
				
				// Emit stderr as output
				this.emitToSession(sessionId, {
					type: "output",
					sessionId,
					data: stderrMarked,
				});
			} catch (error) {
				console.error(`[EnhancedTerminalManager] Error in shell stderr handler:`, error);
			}
		});

		// Handle shell exit
		shellProcess.on('exit', async (code: number | null, signal: string | null) => {
			try {
				const exitCode = code ?? 0;
				console.log(`[EnhancedTerminalManager] Shell session ${sessionId} exited with code ${exitCode}`);

				// Update session status
				await this.sessionManager.updateSessionStatus(sessionId, "exited", undefined, exitCode);

				// Send exit message
				const exitMessage = `\n\x1b[33m[Shell exited with code ${exitCode}]\x1b[0m\n`;
				this.emitToSession(sessionId, {
					type: "exit",
					sessionId,
					exitCode,
					data: exitMessage,
				});

				// Clean up after delay
				setTimeout(() => {
					this.sessions.delete(sessionId);
				}, 5000);
			} catch (error) {
				console.error(`[EnhancedTerminalManager] Error in shell exit handler:`, error);
			}
		});

		// Handle shell errors
		shellProcess.on('error', (error: Error) => {
			console.error(`[EnhancedTerminalManager] Shell error for session ${sessionId}:`, error);
			
			const errorMessage = `\n\x1b[31m[Shell Error: ${error.message}]\x1b[0m\n`;
			this.emitToSession(sessionId, {
				type: "error",
				sessionId,
				data: errorMessage,
			});
		});
	}

	/**
	 * Get appropriate shell command for the platform
	 */
	private getShellCommand(): string[] {
		if (process.platform === "win32") {
			return [process.env.COMSPEC || "cmd.exe"];
		}
		
		// Prefer user's shell, fallback to zsh, then bash
		const userShell = process.env.SHELL || "/bin/zsh";
		return [userShell, "-l"];
	}

	/**
	 * Send input to terminal session with graceful error handling
	 */
	async sendInput(sessionId: string, input: TerminalInput): Promise<void> {
		console.log(`[EnhancedTerminalManager] sendInput called for session ${sessionId}:`, input);
		
		const activeSession = this.sessions.get(sessionId);
		if (!activeSession) {
			// Try to use the session manager's stdin file approach for compatibility
			console.warn(`[EnhancedTerminalManager] Session ${sessionId} not active, attempting file-based input`);
			try {
				let inputData: string;
				if (input.text) {
					inputData = input.text;
				} else if (input.key) {
					inputData = this.mapKeyToSequence(input.key);
				} else {
					throw new Error("Either text or key must be provided");
				}
				console.log(`[EnhancedTerminalManager] Writing to stdin file:`, inputData);
				await this.sessionManager.writeToStdin(sessionId, inputData);
				return;
			} catch (fallbackError) {
				console.error(`[EnhancedTerminalManager] Fallback input failed:`, fallbackError);
				throw new Error(`Session ${sessionId} not found or not active`);
			}
		}

		// Process input
		let inputData: string;
		if (input.text) {
			inputData = input.text;
		} else if (input.key) {
			inputData = this.mapKeyToSequence(input.key);
		} else {
			throw new Error("Either text or key must be provided");
		}

		console.log(`[EnhancedTerminalManager] Processed input data:`, JSON.stringify(inputData));

		// Send to process
		try {
			if (typeof activeSession.ptyProcess?.write === 'function') {
				// Real PTY process - send input directly (PTY handles echoing)
				console.log(`[EnhancedTerminalManager] Writing to PTY process:`, JSON.stringify(inputData));
				activeSession.ptyProcess.write(inputData);
			} else if (activeSession.ptyProcess?.stdin?.write) {
				// Shell process - handle special keys and input
				console.log(`[EnhancedTerminalManager] Processing shell input`);
				
				if (inputData === '\r' || inputData === '\n') {
					// Enter key - execute command
					console.log(`[EnhancedTerminalManager] Enter key pressed, sending newline to shell`);
					// Echo newline to UI for visual feedback
					this.emitToSession(sessionId, {
						type: "output",
						sessionId,
						data: '\n',
					});
					// Send only newline to shell, not carriage return
					activeSession.ptyProcess.stdin.write('\n');
				} else if (inputData === '' || inputData === '\b' || inputData === '\x7f') {
					// Backspace/Delete key - handle character deletion
					console.log(`[EnhancedTerminalManager] Backspace key pressed`);
					// Send backspace sequence to UI for visual feedback
					this.emitToSession(sessionId, {
						type: "output",
						sessionId,
						data: '\b \b', // Backspace, space, backspace
					});
					// Send backspace to shell
					activeSession.ptyProcess.stdin.write('\b');
				} else if (inputData.length === 1 && inputData.charCodeAt(0) >= 32) {
					// Printable characters - send to shell and echo back to UI
					activeSession.ptyProcess.stdin.write(inputData);
					this.emitToSession(sessionId, {
						type: "output",
						sessionId,
						data: inputData,
					});
				} else {
					// Handle special control sequences
					if (inputData === '\x03') {
						// Ctrl+C - send interrupt signal
						console.log(`[EnhancedTerminalManager] Ctrl+C pressed, sending SIGINT`);
						try {
							if (activeSession.ptyProcess.pid) {
								process.kill(activeSession.ptyProcess.pid, 'SIGINT');
							}
						} catch (error) {
							console.warn(`[EnhancedTerminalManager] Could not send SIGINT:`, error);
						}
						// Also echo ^C to terminal
						this.emitToSession(sessionId, {
							type: "output",
							sessionId,
							data: '^C\n$ ',
						});
					} else {
						// Other input - send to shell directly
						console.log(`[EnhancedTerminalManager] Sending special input to shell:`, JSON.stringify(inputData));
						activeSession.ptyProcess.stdin.write(inputData);
					}
				}
			} else {
				console.error(`[EnhancedTerminalManager] No writable process found for session ${sessionId}`);
				console.error(`[EnhancedTerminalManager] Process type:`, typeof activeSession.ptyProcess);
				console.error(`[EnhancedTerminalManager] Process write function:`, typeof activeSession.ptyProcess?.write);
				console.error(`[EnhancedTerminalManager] Process stdin:`, typeof activeSession.ptyProcess?.stdin);
				console.error(`[EnhancedTerminalManager] Process stdin write:`, typeof activeSession.ptyProcess?.stdin?.write);
				throw new Error(`Process for session ${sessionId} is not writable`);
			}
			
			// Update last activity
			activeSession.lastActivity = new Date();
			console.log(`[EnhancedTerminalManager] Input sent successfully to session ${sessionId}`);
			
		} catch (error) {
			console.error(`[EnhancedTerminalManager] Error sending input to session ${sessionId}:`, error);
			throw error;
		}
	}

	/**
	 * Map special keys to terminal sequences
	 */
	private mapKeyToSequence(key: string): string {
		const keyMap: Record<string, string> = {
			'ArrowUp': '\x1b[A',
			'ArrowDown': '\x1b[B',
			'ArrowRight': '\x1b[C',
			'ArrowLeft': '\x1b[D',
			'Home': '\x1b[H',
			'End': '\x1b[F',
			'PageUp': '\x1b[5~',
			'PageDown': '\x1b[6~',
			'Delete': '\x1b[3~',
			'Backspace': '\x7f',
			'Tab': '\t',
			'Enter': '\r',
			'Escape': '\x1b',
			// Control sequences
			'Ctrl+C': '\x03',
			'Ctrl+D': '\x04',
			'Ctrl+Z': '\x1a',
			// Function keys
			'F1': '\x1bOP',
			'F2': '\x1bOQ',
			'F3': '\x1bOR',
			'F4': '\x1bOS',
			'F5': '\x1b[15~',
			'F6': '\x1b[17~',
			'F7': '\x1b[18~',
			'F8': '\x1b[19~',
			'F9': '\x1b[20~',
			'F10': '\x1b[21~',
			'F11': '\x1b[23~',
			'F12': '\x1b[24~',
		};

		return keyMap[key] || key;
	}

	/**
	 * Resize terminal session with graceful handling
	 */
	async resizeSession(sessionId: string, cols: number, rows: number): Promise<void> {
		const activeSession = this.sessions.get(sessionId);
		if (!activeSession) {
			// Don't throw error - just log and return gracefully
			console.warn(`[EnhancedTerminalManager] Resize requested for inactive session ${sessionId}`);
			return;
		}

		try {
			if (typeof activeSession.ptyProcess?.resize === 'function') {
				// Real PTY process
				activeSession.ptyProcess.resize(cols, rows);
				console.log(`[EnhancedTerminalManager] Resized PTY session ${sessionId} to ${cols}x${rows}`);
			} else {
				// Shell process - resize not supported but don't error
				console.log(`[EnhancedTerminalManager] Resize not supported for shell session ${sessionId}`);
			}
			
			// Update session info
			activeSession.session.cols = cols;
			activeSession.session.rows = rows;
			await this.sessionManager.saveSessionInfo(sessionId, activeSession.session);
			
		} catch (error) {
			console.warn(`[EnhancedTerminalManager] Error resizing session ${sessionId}:`, error);
			// Don't throw - resize failure shouldn't break the session
		}
	}

	/**
	 * Kill terminal session
	 */
	async killSession(sessionId: string): Promise<void> {
		const activeSession = this.sessions.get(sessionId);

		if (activeSession?.ptyProcess) {
			try {
				if (typeof activeSession.ptyProcess.kill === 'function') {
					// Graceful termination
					activeSession.ptyProcess.kill('SIGTERM');
					console.log(`[EnhancedTerminalManager] Sent SIGTERM to session ${sessionId}`);
					
					// Force kill after 5 seconds if still running
					setTimeout(() => {
						if (activeSession.ptyProcess && !activeSession.ptyProcess.killed) {
							try {
								activeSession.ptyProcess.kill('SIGKILL');
								console.log(`[EnhancedTerminalManager] Force killed session ${sessionId}`);
							} catch (error) {
								console.warn(`[EnhancedTerminalManager] Error force killing session ${sessionId}:`, error);
							}
						}
					}, 5000);
				}
			} catch (error) {
				console.warn(`[EnhancedTerminalManager] Error killing session ${sessionId}:`, error);
			}
		}

		// Clean up session
		this.sessions.delete(sessionId);
		
		// Update session status
		try {
			await this.sessionManager.updateSessionStatus(sessionId, "exited");
		} catch (error) {
			console.warn(`[EnhancedTerminalManager] Error updating session status:`, error);
		}
	}

	/**
	 * Get session output (buffered)
	 */
	async getSessionOutput(sessionId: string): Promise<string> {
		const activeSession = this.sessions.get(sessionId);
		if (activeSession) {
			return activeSession.bufferData;
		}

		// Try to load from file for non-active sessions
		try {
			const paths = this.sessionManager.getSessionPaths(sessionId);
			return await readFile(paths.stdoutPath, 'utf8');
		} catch (error) {
			console.warn(`[EnhancedTerminalManager] Could not read output for session ${sessionId}:`, error);
			return "";
		}
	}

	/**
	 * Load existing sessions from storage
	 */
	private async loadExistingSessions(): Promise<void> {
		try {
			const persistedSessions = await this.sessionManager.listSessions();
			console.log(`[EnhancedTerminalManager] Found ${persistedSessions.length} persisted sessions`);
			
			// Note: We don't restore running processes, just mark them as available for connection
			for (const session of persistedSessions) {
				if (session.status === "running") {
					// Mark as exited since we can't restore the actual process
					await this.sessionManager.updateSessionStatus(session.id, "exited");
				}
			}
		} catch (error) {
			console.error(`[EnhancedTerminalManager] Error loading existing sessions:`, error);
		}
	}

	/**
	 * Get session by ID
	 */
	async getSession(sessionId: string): Promise<TerminalSession | null> {
		const activeSession = this.sessions.get(sessionId);
		if (activeSession) {
			return activeSession.session;
		}

		// Try to load from persistence
		return await this.sessionManager.loadSessionInfo(sessionId);
	}

	/**
	 * List all sessions
	 */
	async listSessions(): Promise<TerminalSession[]> {
		return await this.sessionManager.listSessions();
	}

	/**
	 * Add session listener
	 */
	addSessionListener(sessionId: string, listener: (message: TerminalMessage) => void): void {
		const activeSession = this.sessions.get(sessionId);
		if (activeSession) {
			activeSession.eventListeners.add(listener);
		}
	}

	/**
	 * Remove session listener
	 */
	removeSessionListener(sessionId: string, listener: (message: TerminalMessage) => void): void {
		const activeSession = this.sessions.get(sessionId);
		if (activeSession) {
			activeSession.eventListeners.delete(listener);
		}
	}

	/**
	 * Emit message to session listeners
	 */
	private emitToSession(sessionId: string, message: TerminalMessage): void {
		const activeSession = this.sessions.get(sessionId);
		if (activeSession) {
			for (const listener of activeSession.eventListeners) {
				try {
					listener(message);
				} catch (error) {
					console.error(`[EnhancedTerminalManager] Error in session listener:`, error);
				}
			}
		}
	}

	/**
	 * Start periodic cleanup of old sessions
	 */
	startPeriodicCleanup(intervalHours: number = 6, maxAgeHours: number = 24): void {
		if (this.cleanupIntervalId) {
			clearInterval(this.cleanupIntervalId);
		}

		this.cleanupIntervalId = setInterval(async () => {
			await this.cleanupOldSessions(maxAgeHours);
		}, intervalHours * 60 * 60 * 1000);

		console.log(`[EnhancedTerminalManager] Started periodic cleanup (every ${intervalHours}h, max age ${maxAgeHours}h)`);
	}

	/**
	 * Clean up old sessions
	 */
	private async cleanupOldSessions(maxAgeHours: number): void {
		try {
			const sessions = await this.sessionManager.listSessions();
			const now = new Date();
			const maxAge = maxAgeHours * 60 * 60 * 1000;

			for (const session of sessions) {
				if (session.status === "exited") {
					const sessionAge = now.getTime() - new Date(session.startedAt).getTime();
					if (sessionAge > maxAge) {
						console.log(`[EnhancedTerminalManager] Cleaning up old session ${session.id}`);
						await this.sessionManager.cleanupSession(session.id);
					}
				}
			}
		} catch (error) {
			console.error(`[EnhancedTerminalManager] Error during cleanup:`, error);
		}
	}

	/**
	 * Manual cleanup of all old/exited sessions
	 */
	async cleanupAllOldSessions(): Promise<{ cleaned: number, total: number }> {
		try {
			const sessions = await this.sessionManager.listSessions();
			let cleaned = 0;
			const total = sessions.length;

			console.log(`[EnhancedTerminalManager] Starting manual cleanup of ${total} sessions`);

			for (const session of sessions) {
				if (session.status === "exited") {
					try {
						await this.sessionManager.cleanupSession(session.id);
						cleaned++;
						console.log(`[EnhancedTerminalManager] Manually cleaned up session ${session.id}`);
					} catch (error) {
						console.error(`[EnhancedTerminalManager] Error cleaning session ${session.id}:`, error);
					}
				}
			}

			console.log(`[EnhancedTerminalManager] Manual cleanup completed: ${cleaned}/${total} sessions cleaned`);
			return { cleaned, total };
		} catch (error) {
			console.error(`[EnhancedTerminalManager] Error during manual cleanup:`, error);
			throw error;
		}
	}

	/**
	 * Cleanup all sessions
	 */
	async cleanup(): Promise<void> {
		console.log(`[EnhancedTerminalManager] Cleaning up ${this.sessions.size} active sessions`);

		// Stop cleanup interval
		if (this.cleanupIntervalId) {
			clearInterval(this.cleanupIntervalId);
		}

		// Kill all active sessions
		for (const [sessionId, activeSession] of this.sessions) {
			if (activeSession.ptyProcess) {
				try {
					if (typeof activeSession.ptyProcess.kill === 'function') {
						activeSession.ptyProcess.kill('SIGTERM');
						console.log(`[EnhancedTerminalManager] Terminated session ${sessionId} during cleanup`);
					}
				} catch (error) {
					console.warn(`[EnhancedTerminalManager] Error terminating session ${sessionId}:`, error);
				}
			}
		}

		this.sessions.clear();
		console.log(`[EnhancedTerminalManager] Cleanup completed`);
	}
}