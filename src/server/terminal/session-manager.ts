import { spawn } from "node:child_process";
import { exists, mkdir, readdir, readFile, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { TerminalPaths, TerminalSession } from "../../types/terminal.ts";

export class TerminalSessionManager {
	private controlPath: string;
	private static readonly SESSION_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

	constructor(projectPath?: string) {
		// Store terminal sessions in project-specific location
		if (projectPath) {
			this.controlPath = join(projectPath, ".backlog", "terminal");
		} else {
			this.controlPath = join(homedir(), ".backlog", "terminal");
		}
		this.ensureControlDirectory();
	}

	/**
	 * Validate session ID format for security
	 */
	private validateSessionId(sessionId: string): void {
		if (!TerminalSessionManager.SESSION_ID_REGEX.test(sessionId)) {
			throw new Error(
				`Invalid session ID format: "${sessionId}". Session IDs must only contain letters, numbers, hyphens (-), and underscores (_).`,
			);
		}
	}

	/**
	 * Ensure the control directory exists
	 */
	private async ensureControlDirectory(): Promise<void> {
		try {
			await mkdir(this.controlPath, { recursive: true });
			console.log(`[TerminalSessionManager] Control directory ensured: ${this.controlPath}`);
		} catch (error) {
			console.error("[TerminalSessionManager] Failed to create control directory:", error);
		}
	}

	/**
	 * Create a new session directory structure
	 */
	async createSessionDirectory(sessionId: string): Promise<TerminalPaths> {
		this.validateSessionId(sessionId);
		const controlDir = join(this.controlPath, sessionId);

		// Create session directory
		await mkdir(controlDir, { recursive: true });

		const paths = this.getSessionPaths(sessionId);

		// Create FIFO pipe for stdin (or regular file on systems without mkfifo)
		await this.createStdinPipe(paths.stdinPath);

		console.log(`[TerminalSessionManager] Session directory created for ${sessionId}`);
		return paths;
	}

	/**
	 * Create stdin pipe (use regular file to avoid FIFO race conditions)
	 */
	private async createStdinPipe(stdinPath: string): Promise<void> {
		try {
			// Always use regular file instead of FIFO to avoid race conditions
			// FIFO pipes require careful synchronization between readers and writers
			// which is causing the ENXIO error when no writer is connected
			if (!(await exists(stdinPath))) {
				await writeFile(stdinPath, "");
				console.log(`[TerminalSessionManager] Stdin file created: ${stdinPath}`);
			}
		} catch (error) {
			console.error(`[TerminalSessionManager] Failed to create stdin file: ${stdinPath}`, error);
			throw error;
		}
	}

	/**
	 * Save session info to JSON file
	 */
	async saveSessionInfo(sessionId: string, sessionInfo: TerminalSession): Promise<void> {
		this.validateSessionId(sessionId);
		try {
			const sessionDir = join(this.controlPath, sessionId);
			const sessionJsonPath = join(sessionDir, "session.json");
			const tempPath = `${sessionJsonPath}.tmp`;

			// Ensure session directory exists before writing
			await mkdir(sessionDir, { recursive: true });

			const sessionInfoStr = JSON.stringify(sessionInfo, null, 2);

			// Write to temporary file first, then move to final location (atomic write)
			await writeFile(tempPath, sessionInfoStr, "utf8");

			// Use Bun's rename functionality for atomic operation
			await Bun.write(sessionJsonPath, sessionInfoStr);

			// Clean up temp file
			try {
				await unlink(tempPath);
			} catch {
				// Ignore cleanup errors
			}

			console.log(
				`[TerminalSessionManager] session.json saved for session ${sessionId} with name: ${sessionInfo.name}`,
			);
		} catch (error) {
			throw new Error(`Failed to save session info: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Load session info from JSON file
	 */
	async loadSessionInfo(sessionId: string): Promise<TerminalSession | null> {
		const sessionJsonPath = join(this.controlPath, sessionId, "session.json");
		try {
			if (!(await exists(sessionJsonPath))) {
				return null;
			}

			const content = await readFile(sessionJsonPath, "utf8");
			return JSON.parse(content) as TerminalSession;
		} catch (error) {
			console.warn(`[TerminalSessionManager] Failed to load session info for ${sessionId}:`, error);
			return null;
		}
	}

	/**
	 * Update session status
	 */
	async updateSessionStatus(
		sessionId: string,
		status: TerminalSession["status"],
		pid?: number,
		exitCode?: number,
	): Promise<void> {
		const sessionInfo = await this.loadSessionInfo(sessionId);
		if (!sessionInfo) {
			throw new Error("Session info not found");
		}

		if (pid !== undefined) {
			sessionInfo.pid = pid;
		}
		sessionInfo.status = status;
		if (exitCode !== undefined) {
			sessionInfo.exitCode = exitCode;
		}

		await this.saveSessionInfo(sessionId, sessionInfo);
		console.log(
			`[TerminalSessionManager] Session ${sessionId} status updated to ${status}${
				pid ? ` (pid: ${pid})` : ""
			}${exitCode !== undefined ? ` (exit code: ${exitCode})` : ""}`,
		);
	}

	/**
	 * List all sessions
	 */
	async listSessions(): Promise<TerminalSession[]> {
		try {
			if (!(await exists(this.controlPath))) {
				return [];
			}

			const sessions: TerminalSession[] = [];
			const entries = await readdir(this.controlPath, { withFileTypes: true });

			for (const entry of entries) {
				if (entry.isDirectory()) {
					const sessionId = entry.name;
					const sessionDir = join(this.controlPath, sessionId);
					const stdoutPath = join(sessionDir, "stdout");

					const sessionInfo = await this.loadSessionInfo(sessionId);
					if (sessionInfo) {
						// Check if stdout file exists and get its modification time
						try {
							const stdoutStat = await stat(stdoutPath);
							sessionInfo.lastModified = stdoutStat.mtime.toISOString();
						} catch {
							sessionInfo.lastModified = sessionInfo.startedAt;
						}

						sessions.push(sessionInfo);
					}
				}
			}

			// Sort by startedAt timestamp (newest first)
			sessions.sort((a, b) => {
				const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
				const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
				return bTime - aTime;
			});

			console.log(`[TerminalSessionManager] Found ${sessions.length} sessions`);
			return sessions;
		} catch (error) {
			throw new Error(`Failed to list sessions: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Check if a session exists
	 */
	async sessionExists(sessionId: string): Promise<boolean> {
		const sessionDir = join(this.controlPath, sessionId);
		const sessionJsonPath = join(sessionDir, "session.json");
		return await exists(sessionJsonPath);
	}

	/**
	 * Cleanup a specific session
	 */
	async cleanupSession(sessionId: string): Promise<void> {
		if (!sessionId) {
			throw new Error("Session ID is required for cleanup");
		}

		try {
			const sessionDir = join(this.controlPath, sessionId);

			if (await exists(sessionDir)) {
				console.log(`[TerminalSessionManager] Cleaning up session directory: ${sessionDir}`);

				// Log session info before cleanup for debugging
				const sessionInfo = await this.loadSessionInfo(sessionId);
				if (sessionInfo) {
					console.log(`[TerminalSessionManager] Cleaning up session ${sessionId} with status: ${sessionInfo.status}`);
				}

				// Remove directory and all contents recursively
				await rmdir(sessionDir, { recursive: true });
				console.log(`[TerminalSessionManager] Session ${sessionId} cleaned up`);
			} else {
				console.log(`[TerminalSessionManager] Session directory ${sessionDir} does not exist, nothing to clean up`);
			}
		} catch (error) {
			throw new Error(
				`Failed to cleanup session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get session paths for a given session ID
	 */
	getSessionPaths(sessionId: string): TerminalPaths {
		const sessionDir = join(this.controlPath, sessionId);

		return {
			controlDir: sessionDir,
			stdoutPath: join(sessionDir, "stdout"),
			stdinPath: join(sessionDir, "stdin"),
			sessionJsonPath: join(sessionDir, "session.json"),
		};
	}

	/**
	 * Write to stdin file
	 */
	async writeToStdin(sessionId: string, data: string): Promise<void> {
		const paths = this.getSessionPaths(sessionId);

		if (!(await exists(paths.stdinPath))) {
			throw new Error(`Session ${sessionId} stdin file not found`);
		}

		try {
			// Append data to stdin file (no longer using FIFO pipes)
			const file = Bun.file(paths.stdinPath);
			const existingContent = await file.text();
			await Bun.write(paths.stdinPath, existingContent + data);
			console.log(`[TerminalSessionManager] Wrote ${data.length} bytes to stdin for session ${sessionId}`);
		} catch (error) {
			console.error(`[TerminalSessionManager] Error writing to stdin for session ${sessionId}:`, error);
			throw new Error(
				`Failed to write to stdin for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get control path
	 */
	getControlPath(): string {
		return this.controlPath;
	}
}
