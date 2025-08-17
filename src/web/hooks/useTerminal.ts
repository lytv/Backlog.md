import { useCallback, useEffect, useRef, useState } from "react";
import type { CreateTerminalRequest, TerminalInput, TerminalSession } from "../../types/terminal";
import { TerminalAPI, TerminalWebSocket } from "../services/terminal-api";

export interface UseTerminalReturn {
	sessions: TerminalSession[];
	loading: boolean;
	error: string | null;
	createSession: (request: CreateTerminalRequest) => Promise<TerminalSession>;
	killSession: (sessionId: string) => Promise<void>;
	refreshSessions: () => Promise<void>;
}

export function useTerminal(): UseTerminalReturn {
	const [sessions, setSessions] = useState<TerminalSession[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const apiRef = useRef(new TerminalAPI());

	const refreshSessions = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const sessionList = await apiRef.current.listSessions();
			setSessions(sessionList);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load sessions");
			console.error("Error loading terminal sessions:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	const createSession = useCallback(async (request: CreateTerminalRequest): Promise<TerminalSession> => {
		try {
			setError(null);
			const newSession = await apiRef.current.createSession(request);
			setSessions((prev) => [newSession, ...prev]);
			return newSession;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to create session";
			setError(errorMessage);
			throw new Error(errorMessage);
		}
	}, []);

	const killSession = useCallback(async (sessionId: string): Promise<void> => {
		try {
			setError(null);
			await apiRef.current.killSession(sessionId);
			setSessions((prev) => prev.filter((s) => s.id !== sessionId));
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to kill session";
			setError(errorMessage);
			throw new Error(errorMessage);
		}
	}, []);

	// Load sessions on mount
	useEffect(() => {
		refreshSessions();
	}, [refreshSessions]);

	// Auto refresh sessions periodically
	useEffect(() => {
		const interval = setInterval(refreshSessions, 10000); // Refresh every 10 seconds
		return () => clearInterval(interval);
	}, [refreshSessions]);

	return {
		sessions,
		loading,
		error,
		createSession,
		killSession,
		refreshSessions,
	};
}

export interface UseTerminalSessionReturn {
	session: TerminalSession | null;
	connected: boolean;
	output: string;
	sendInput: (input: TerminalInput) => void;
	resize: (cols: number, rows: number) => void;
	connect: () => Promise<void>;
	disconnect: () => void;
}

export function useTerminalSession(sessionId: string | null): UseTerminalSessionReturn {
	const [session, setSession] = useState<TerminalSession | null>(null);
	const [connected, setConnected] = useState(false);
	const [output, setOutput] = useState("");
	const wsRef = useRef<TerminalWebSocket | null>(null);
	const apiRef = useRef(new TerminalAPI());

	const connect = useCallback(async () => {
		if (!sessionId) return;

		try {
			// Load session info
			const sessionInfo = await apiRef.current.getSession(sessionId);
			setSession(sessionInfo);

			// Connect WebSocket
			wsRef.current = new TerminalWebSocket(sessionId);

			// Set up event listeners
			wsRef.current.addEventListener("output", (message) => {
				if (message.data && typeof message.data === "string") {
					setOutput((prev) => prev + message.data);
				}
			});

			wsRef.current.addEventListener("clear", (message) => {
				console.log(`Terminal session ${sessionId} cleared`);
				// Clear the output and show only the data from clear command (which includes prompt)
				if (message.data && typeof message.data === "string") {
					setOutput(message.data);
				} else {
					setOutput("$ ");
				}
			});

			wsRef.current.addEventListener("exit", (message) => {
				console.log(`Terminal session ${sessionId} exited with code ${message.exitCode}`);
				setConnected(false);
			});

			wsRef.current.addEventListener("*", (message) => {
				if (message.type === "terminal_connected") {
					setConnected(true);
				}
			});

			await wsRef.current.connect();

			// Load initial output
			const initialOutput = await apiRef.current.getOutput(sessionId);
			setOutput(initialOutput);
		} catch (error) {
			console.error("Failed to connect to terminal session:", error);
			setConnected(false);
		}
	}, [sessionId]);

	const disconnect = useCallback(() => {
		if (wsRef.current) {
			wsRef.current.disconnect();
			wsRef.current = null;
		}
		setConnected(false);
	}, []);

	const sendInput = useCallback(
		(input: TerminalInput) => {
			if (wsRef.current && connected) {
				wsRef.current.sendInput(input);
			}
		},
		[connected],
	);

	const resize = useCallback(
		(cols: number, rows: number) => {
			if (wsRef.current && connected) {
				wsRef.current.resize(cols, rows);
			}
		},
		[connected],
	);

	// Connect when sessionId changes
	useEffect(() => {
		if (sessionId) {
			connect();
		} else {
			disconnect();
		}

		return () => {
			disconnect();
		};
	}, [sessionId, connect, disconnect]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			disconnect();
		};
	}, [disconnect]);

	return {
		session,
		connected,
		output,
		sendInput,
		resize,
		connect,
		disconnect,
	};
}
