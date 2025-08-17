export interface TerminalSession {
	id: string;
	taskId?: string;
	name: string;
	status: "starting" | "running" | "exited";
	pid?: number;
	exitCode?: number;
	workingDir: string;
	startedAt: string;
	command: string[];
	cols: number;
	rows: number;
	lastModified?: string;
}

export interface CreateTerminalRequest {
	name?: string;
	taskId?: string;
	workingDir?: string;
	command?: string[];
	cols?: number;
	rows?: number;
}

export interface TerminalInput {
	text?: string;
	key?: SpecialKey;
}

export type SpecialKey =
	| "Enter"
	| "Tab"
	| "Backspace"
	| "Delete"
	| "ArrowUp"
	| "ArrowDown"
	| "ArrowLeft"
	| "ArrowRight"
	| "Home"
	| "End"
	| "PageUp"
	| "PageDown"
	| "Escape"
	| "F1"
	| "F2"
	| "F3"
	| "F4"
	| "F5"
	| "F6"
	| "F7"
	| "F8"
	| "F9"
	| "F10"
	| "F11"
	| "F12"
	| "Ctrl+A"
	| "Ctrl+C"
	| "Ctrl+D"
	| "Ctrl+Z"
	| "Ctrl+L"
	| "Ctrl+U"
	| "Ctrl+K";

export interface TerminalMessage {
	type: "output" | "input" | "resize" | "error" | "exit" | "clear";
	sessionId: string;
	data?: string | Buffer;
	cols?: number;
	rows?: number;
	exitCode?: number;
}

export interface TerminalPaths {
	controlDir: string;
	stdoutPath: string;
	stdinPath: string;
	sessionJsonPath: string;
}
