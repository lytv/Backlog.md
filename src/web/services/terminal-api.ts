import type { CreateTerminalRequest, TerminalInput, TerminalMessage, TerminalSession } from "../../types/terminal";

export class TerminalAPI {
	private baseUrl: string;

	constructor(baseUrl = "") {
		this.baseUrl = baseUrl;
	}

	/**
	 * List all terminal sessions
	 */
	async listSessions(): Promise<TerminalSession[]> {
		const response = await fetch(`${this.baseUrl}/api/terminals`);
		if (!response.ok) {
			throw new Error(`Failed to list terminals: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Create a new terminal session
	 */
	async createSession(request: CreateTerminalRequest): Promise<TerminalSession> {
		try {
			console.log("[TerminalAPI] Creating session with request:", request);

			// Sanitize the request to prevent circular references
			const sanitizedRequest = this.sanitizeRequestData(request);

			const response = await fetch(`${this.baseUrl}/api/terminals`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(sanitizedRequest),
			});

			console.log("[TerminalAPI] Response status:", response.status, response.statusText);

			if (!response.ok) {
				let errorMessage: string;
				try {
					const error = await response.json();
					errorMessage = error.error || `Failed to create terminal: ${response.statusText}`;
				} catch (parseError) {
					errorMessage = `Failed to create terminal: ${response.statusText} (${response.status})`;
				}
				console.error("[TerminalAPI] Terminal creation failed:", errorMessage);
				throw new Error(errorMessage);
			}

			const result = await response.json();
			console.log("[TerminalAPI] Terminal created successfully:", result);
			return result;
		} catch (error) {
			console.error("[TerminalAPI] Error in createSession:", error);
			throw error;
		}
	}

	/**
	 * Get a terminal session by ID
	 */
	async getSession(sessionId: string): Promise<TerminalSession> {
		const response = await fetch(`${this.baseUrl}/api/terminals/${sessionId}`);
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || `Failed to get terminal: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Kill a terminal session
	 */
	async killSession(sessionId: string): Promise<void> {
		const response = await fetch(`${this.baseUrl}/api/terminals/${sessionId}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || `Failed to kill terminal: ${response.statusText}`);
		}
	}

	/**
	 * Clean up all old/exited terminal sessions
	 */
	async cleanupSessions(): Promise<{ cleaned: number; total: number; message: string }> {
		const response = await fetch(`${this.baseUrl}/api/terminals/cleanup`, {
			method: "POST",
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || `Failed to cleanup terminals: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Send input to a terminal session
	 */
	async sendInput(sessionId: string, input: TerminalInput): Promise<void> {
		const response = await fetch(`${this.baseUrl}/api/terminals/${sessionId}/input`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(input),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || `Failed to send input: ${response.statusText}`);
		}
	}

	/**
	 * Resize a terminal session
	 */
	async resizeSession(sessionId: string, cols: number, rows: number): Promise<void> {
		const response = await fetch(`${this.baseUrl}/api/terminals/${sessionId}/resize`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ cols, rows }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || `Failed to resize terminal: ${response.statusText}`);
		}
	}

	/**
	 * Get terminal output
	 */
	async getOutput(sessionId: string): Promise<string> {
		const response = await fetch(`${this.baseUrl}/api/terminals/${sessionId}/output`);
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || `Failed to get output: ${response.statusText}`);
		}
		const data = await response.json();
		return data.output || "";
	}

	/**
	 * Sanitize request data to prevent circular references
	 */
	private sanitizeRequestData(data: any): any {
		if (data === null || data === undefined) {
			return data;
		}

		if (typeof data === "object") {
			// Check for DOM elements
			if (data instanceof Element || data instanceof Node) {
				return undefined;
			}

			// Check for React Fiber objects
			if (Object.hasOwn(data as object, "__reactFiber$") || Object.hasOwn(data as object, "stateNode")) {
				return undefined;
			}

			// For arrays
			if (Array.isArray(data)) {
				return data.map((item) => this.sanitizeRequestData(item)).filter((item) => item !== undefined);
			}

			// For plain objects, create a clean copy
			const cleaned: Record<string, any> = {};
			for (const key in data) {
				if (Object.hasOwn(data as object, key)) {
					const value = this.sanitizeRequestData((data as Record<string, any>)[key]);
					if (value !== undefined) {
						cleaned[key] = value;
					}
				}
			}
			return cleaned;
		}

		// For primitives, return as-is
		return data;
	}
}

export class TerminalWebSocket {
	private ws: WebSocket | null = null;
	private sessionId: string;
	private url: string;
	private listeners: Map<string, Set<(message: TerminalMessage) => void>> = new Map();
	private reconnectInterval = 5000;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 10;

	constructor(sessionId: string, wsUrl?: string) {
		this.sessionId = sessionId;
		this.url = wsUrl || this.getWebSocketUrl();
	}

	private getWebSocketUrl(): string {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		return `${protocol}//${window.location.host}`;
	}

	/**
	 * Connect to terminal WebSocket
	 */
	connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.ws = new WebSocket(this.url);

				this.ws.onopen = () => {
					console.log(`[TerminalWebSocket] Connected to session ${this.sessionId}`);
					this.reconnectAttempts = 0;

					// Send connection message
					this.send({
						type: "terminal_connect",
						sessionId: this.sessionId,
					});

					resolve();
				};

				this.ws.onmessage = (event) => {
					try {
						const message: TerminalMessage = JSON.parse(event.data);
						this.handleMessage(message);
					} catch (error) {
						console.error("[TerminalWebSocket] Error parsing message:", error);
					}
				};

				this.ws.onclose = () => {
					console.log(`[TerminalWebSocket] Disconnected from session ${this.sessionId}`);
					this.handleReconnect();
				};

				this.ws.onerror = (error) => {
					console.error("[TerminalWebSocket] WebSocket error:", error);
					reject(error);
				};
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Send message to WebSocket
	 */
	private send(data: any): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			try {
				// Sanitize data to prevent circular reference issues
				const sanitizedData = this.sanitizeData(data);
				this.ws.send(JSON.stringify(sanitizedData));
			} catch (error) {
				console.error("[TerminalWebSocket] Error serializing data:", error);
				console.error("[TerminalWebSocket] Problematic data:", data);
			}
		}
	}

	/**
	 * Sanitize data to remove circular references and DOM elements
	 */
	private sanitizeData(data: unknown): unknown {
		if (data === null || data === undefined) {
			return data;
		}

		// Check for DOM elements and other problematic objects
		if (typeof data === "object") {
			// Check if it's a DOM element
			if (data instanceof Element || data instanceof Node) {
				return "[DOM Element]";
			}

			// Check for React Fiber objects
			if (Object.hasOwn(data as object, "__reactFiber$") || Object.hasOwn(data as object, "stateNode")) {
				return "[React Fiber]";
			}

			// Check for window or other global objects
			if (data === window || data === document) {
				return "[Global Object]";
			}

			// For arrays and plain objects, recursively sanitize
			if (Array.isArray(data)) {
				return data.map((item) => this.sanitizeData(item));
			}

			// For plain objects, create a clean copy
			const cleaned: Record<string, unknown> = {};
			for (const key in data) {
				if (Object.hasOwn(data as object, key)) {
					try {
						cleaned[key] = this.sanitizeData((data as Record<string, unknown>)[key]);
					} catch (error) {
						// Skip problematic properties
						console.warn(`[TerminalWebSocket] Skipping property "${key}" due to serialization error`);
					}
				}
			}
			return cleaned;
		}

		// For primitives, return as-is
		return data;
	}

	/**
	 * Send input to terminal via WebSocket
	 */
	sendInput(input: TerminalInput): void {
		this.send({
			type: "terminal_input",
			sessionId: this.sessionId,
			input,
		});
	}

	/**
	 * Resize terminal via WebSocket
	 */
	resize(cols: number, rows: number): void {
		this.send({
			type: "terminal_resize",
			sessionId: this.sessionId,
			cols,
			rows,
		});
	}

	/**
	 * Add event listener for terminal messages
	 */
	addEventListener(type: string, listener: (message: TerminalMessage) => void): void {
		if (!this.listeners.has(type)) {
			this.listeners.set(type, new Set());
		}
		this.listeners.get(type)?.add(listener);
	}

	/**
	 * Remove event listener
	 */
	removeEventListener(type: string, listener: (message: TerminalMessage) => void): void {
		const typeListeners = this.listeners.get(type);
		if (typeListeners) {
			typeListeners.delete(listener);
		}
	}

	/**
	 * Handle incoming WebSocket messages
	 */
	private handleMessage(message: TerminalMessage): void {
		// Emit to type-specific listeners
		const typeListeners = this.listeners.get(message.type);
		if (typeListeners) {
			typeListeners.forEach((listener) => {
				try {
					listener(message);
				} catch (error) {
					console.error("[TerminalWebSocket] Error in listener:", error);
				}
			});
		}

		// Emit to all listeners
		const allListeners = this.listeners.get("*");
		if (allListeners) {
			allListeners.forEach((listener) => {
				try {
					listener(message);
				} catch (error) {
					console.error("[TerminalWebSocket] Error in all listener:", error);
				}
			});
		}
	}

	/**
	 * Handle reconnection
	 */
	private handleReconnect(): void {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			console.log(
				`[TerminalWebSocket] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
			);

			setTimeout(() => {
				this.connect().catch((error) => {
					console.error("[TerminalWebSocket] Reconnection failed:", error);
				});
			}, this.reconnectInterval);
		} else {
			console.error("[TerminalWebSocket] Max reconnection attempts reached");
		}
	}

	/**
	 * Disconnect from WebSocket
	 */
	disconnect(): void {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.listeners.clear();
	}

	/**
	 * Check if WebSocket is connected
	 */
	isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}
}
