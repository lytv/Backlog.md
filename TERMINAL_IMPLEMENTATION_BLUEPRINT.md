# VibeTunnel Terminal Implementation Blueprint

Đây là hướng dẫn chi tiết để implement một hệ thống terminal tương tự VibeTunnel, được thiết kế để junior developer có thể thực hiện được.

## Tổng Quan Kiến Trúc

VibeTunnel sử dụng kiến trúc 4 tầng với giao tiếp real-time:

```
┌─────────────────────────────────────────────────────────────┐
│                    macOS/iOS Native App                     │
│  - Swift/SwiftUI UI                                         │
│  - Server lifecycle management                              │
│  - Menu bar integration                                     │
└─────────────────┬───────────────────────────────────────────┘
                  │ REST API + WebSocket
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Node.js/Bun Server                         │
│  - PTY process management                                   │
│  - Session lifecycle                                        │
│  - WebSocket streams                                        │
│  - Buffer optimization                                      │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP + WebSocket
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Web Frontend                              │
│  - TypeScript/LitElement                                    │
│  - xterm.js rendering                                       │
│  - Real-time buffer updates                                 │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Core Server Setup

### 1.1 Project Structure

```
terminal-app/
├── server/
│   ├── pty/                    # PTY management
│   │   ├── pty-manager.ts      # Core PTY operations
│   │   ├── session-manager.ts  # Session lifecycle
│   │   └── types.ts           # Type definitions
│   ├── services/              # Business logic
│   │   ├── terminal-manager.ts # Terminal buffer management
│   │   └── buffer-aggregator.ts # WebSocket streaming
│   ├── routes/                # API endpoints
│   │   └── sessions.ts        # Session REST API
│   └── server.ts              # Main server entry
├── client/
│   ├── components/
│   │   ├── terminal.ts        # Terminal UI component
│   │   └── session-view.ts    # Session management UI
│   ├── services/
│   │   └── websocket-client.ts # WebSocket communication
│   └── app.ts                 # Main client app
└── shared/
    └── types.ts               # Shared type definitions
```

### 1.2 Dependencies và Setup

```bash
# Server dependencies
npm install node-pty express ws @types/ws uuid chalk
npm install -D @types/node typescript

# Client dependencies  
npm install lit xterm @xterm/headless

# Shared utilities
npm install uuid@^9.0.0
```

### 1.3 Basic Server Setup

```typescript
// server/server.ts
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { PtyManager } from './pty/pty-manager.js';
import { TerminalManager } from './services/terminal-manager.js';
import { BufferAggregator } from './services/buffer-aggregator.js';
import { createSessionRoutes } from './routes/sessions.js';

export class TerminalServer {
  private app = express();
  private server = createServer(this.app);
  private wss = new WebSocketServer({ server: this.server });
  private ptyManager = new PtyManager();
  private terminalManager = new TerminalManager();
  private bufferAggregator = new BufferAggregator();

  async start(port: number = 4020) {
    // Setup middleware
    this.app.use(express.json());
    
    // Setup routes
    this.app.use('/api/sessions', createSessionRoutes(this.ptyManager));
    
    // Setup WebSocket
    this.setupWebSocket();
    
    // Start server
    this.server.listen(port, () => {
      console.log(`Terminal server running on port ${port}`);
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url!, 'http://localhost');
      const sessionId = url.searchParams.get('sessionId');
      
      if (sessionId) {
        this.bufferAggregator.handleConnection(ws, sessionId);
      }
    });
  }
}
```

## Phase 2: PTY Management Layer

### 2.1 Session Management

```typescript
// server/pty/session-manager.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SessionInfo {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'exited';
  pid?: number;
  startedAt: string;
  exitCode?: number;
  workingDir?: string;
  cols: number;
  rows: number;
}

export class SessionManager {
  private controlPath: string;

  constructor(controlPath?: string) {
    this.controlPath = controlPath || path.join(os.homedir(), '.terminal-app', 'control');
    this.ensureControlDirectory();
  }

  private ensureControlDirectory(): void {
    if (!fs.existsSync(this.controlPath)) {
      fs.mkdirSync(this.controlPath, { recursive: true });
    }
  }

  createSessionDirectory(sessionId: string) {
    const sessionDir = path.join(this.controlPath, sessionId);
    
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    return {
      controlDir: sessionDir,
      stdoutPath: path.join(sessionDir, 'stdout'),
      stdinPath: path.join(sessionDir, 'stdin'),
      sessionJsonPath: path.join(sessionDir, 'session.json')
    };
  }

  saveSessionInfo(sessionId: string, sessionInfo: SessionInfo): void {
    const sessionDir = path.join(this.controlPath, sessionId);
    const sessionJsonPath = path.join(sessionDir, 'session.json');
    
    fs.writeFileSync(sessionJsonPath, JSON.stringify(sessionInfo, null, 2));
  }

  loadSessionInfo(sessionId: string): SessionInfo | null {
    const sessionJsonPath = path.join(this.controlPath, sessionId, 'session.json');
    
    try {
      if (fs.existsSync(sessionJsonPath)) {
        const content = fs.readFileSync(sessionJsonPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn(`Failed to load session info for ${sessionId}:`, error);
    }
    
    return null;
  }

  listSessions(): SessionInfo[] {
    if (!fs.existsSync(this.controlPath)) {
      return [];
    }

    const sessions: SessionInfo[] = [];
    const entries = fs.readdirSync(this.controlPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const sessionInfo = this.loadSessionInfo(entry.name);
        if (sessionInfo) {
          sessions.push(sessionInfo);
        }
      }
    }

    return sessions.sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  cleanupSession(sessionId: string): void {
    const sessionDir = path.join(this.controlPath, sessionId);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  }
}
```

### 2.2 PTY Process Management

```typescript
// server/pty/pty-manager.ts
import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { SessionManager } from './session-manager.js';

export interface PtySession {
  id: string;
  ptyProcess: pty.IPty;
  info: SessionInfo;
}

export interface CreateSessionOptions {
  name?: string;
  workingDir?: string;
  cols?: number;
  rows?: number;
  command?: string[];
  env?: Record<string, string>;
}

export class PtyManager extends EventEmitter {
  private sessions = new Map<string, PtySession>();
  private sessionManager = new SessionManager();

  async createSession(options: CreateSessionOptions = {}) {
    const sessionId = uuidv4();
    
    // Create session directory structure
    const paths = this.sessionManager.createSessionDirectory(sessionId);
    
    // Default options
    const {
      name = `Terminal ${new Date().toLocaleTimeString()}`,
      workingDir = process.cwd(),
      cols = 80,
      rows = 24,
      command = [process.platform === 'win32' ? 'cmd.exe' : 'bash'],
      env = process.env
    } = options;

    // Create session info
    const sessionInfo: SessionInfo = {
      id: sessionId,
      name,
      status: 'starting',
      startedAt: new Date().toISOString(),
      workingDir,
      cols,
      rows
    };

    try {
      // Spawn PTY process
      const ptyProcess = pty.spawn(command[0], command.slice(1), {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: workingDir,
        env: env as any
      });

      sessionInfo.pid = ptyProcess.pid;
      sessionInfo.status = 'running';

      // Create session object
      const session: PtySession = {
        id: sessionId,
        ptyProcess,
        info: sessionInfo
      };

      this.sessions.set(sessionId, session);
      this.sessionManager.saveSessionInfo(sessionId, sessionInfo);

      // Setup PTY event handlers
      this.setupPtyHandlers(session);

      console.log(`Session ${sessionId} created with PID ${ptyProcess.pid}`);
      
      return { sessionId, sessionInfo };
    } catch (error) {
      console.error(`Failed to create session ${sessionId}:`, error);
      this.sessionManager.cleanupSession(sessionId);
      throw error;
    }
  }

  private setupPtyHandlers(session: PtySession) {
    const { ptyProcess, id } = session;

    ptyProcess.onData((data) => {
      // Emit data event for subscribers
      this.emit('data', id, data);
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      session.info.status = 'exited';
      session.info.exitCode = exitCode;
      
      this.sessionManager.saveSessionInfo(id, session.info);
      this.emit('exit', id, exitCode, signal);
      
      // Cleanup
      setTimeout(() => this.sessions.delete(id), 5000);
    });
  }

  sendInput(sessionId: string, data: string) {
    const session = this.sessions.get(sessionId);
    if (session && session.info.status === 'running') {
      session.ptyProcess.write(data);
    } else {
      throw new Error(`Session ${sessionId} not found or not running`);
    }
  }

  resizeSession(sessionId: string, cols: number, rows: number) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.ptyProcess.resize(cols, rows);
      session.info.cols = cols;
      session.info.rows = rows;
      this.sessionManager.saveSessionInfo(sessionId, session.info);
    }
  }

  killSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.ptyProcess.kill();
      this.sessions.delete(sessionId);
    }
  }

  getSession(sessionId: string): PtySession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): SessionInfo[] {
    return this.sessionManager.listSessions();
  }
}
```

## Phase 3: Buffer Management & Streaming

### 3.1 Terminal Buffer Management với xterm.js

```typescript
// server/services/terminal-manager.ts
import { Terminal as XtermTerminal } from '@xterm/headless';
import * as fs from 'fs';

interface SessionTerminal {
  terminal: XtermTerminal;
  lastUpdate: number;
}

export class TerminalManager {
  private terminals = new Map<string, SessionTerminal>();
  private bufferListeners = new Map<string, Set<(snapshot: BufferSnapshot) => void>>();

  async getTerminal(sessionId: string): Promise<XtermTerminal> {
    let sessionTerminal = this.terminals.get(sessionId);

    if (!sessionTerminal) {
      // Create new headless terminal
      const terminal = new XtermTerminal({
        cols: 80,
        rows: 24,
        scrollback: 10000,
        allowProposedApi: true,
        convertEol: true
      });

      sessionTerminal = {
        terminal,
        lastUpdate: Date.now()
      };

      this.terminals.set(sessionId, sessionTerminal);
      console.log(`Terminal created for session ${sessionId}`);
    }

    sessionTerminal.lastUpdate = Date.now();
    return sessionTerminal.terminal;
  }

  async writeToTerminal(sessionId: string, data: string) {
    const terminal = await this.getTerminal(sessionId);
    
    return new Promise<void>((resolve) => {
      terminal.write(data, resolve);
    });
  }

  async getBufferSnapshot(sessionId: string): Promise<BufferSnapshot> {
    const terminal = await this.getTerminal(sessionId);
    const buffer = terminal.buffer.active;

    // Get visible area
    const startLine = Math.max(0, buffer.length - terminal.rows);
    const cells: BufferCell[][] = [];
    const cell = buffer.getNullCell();

    for (let row = 0; row < terminal.rows; row++) {
      const line = buffer.getLine(startLine + row);
      const rowCells: BufferCell[] = [];

      if (line) {
        for (let col = 0; col < terminal.cols; col++) {
          line.getCell(col, cell);
          
          rowCells.push({
            char: cell.getChars() || ' ',
            width: cell.getWidth(),
            fg: cell.getFgColor(),
            bg: cell.getBgColor(),
            attributes: this.getCellAttributes(cell)
          });
        }
      }
      
      cells.push(rowCells);
    }

    return {
      cols: terminal.cols,
      rows: terminal.rows,
      viewportY: startLine,
      cursorX: buffer.cursorX,
      cursorY: buffer.cursorY,
      cells
    };
  }

  private getCellAttributes(cell: any): number {
    let attributes = 0;
    if (cell.isBold()) attributes |= 0x01;
    if (cell.isItalic()) attributes |= 0x02;
    if (cell.isUnderline()) attributes |= 0x04;
    if (cell.isDim()) attributes |= 0x08;
    if (cell.isInverse()) attributes |= 0x10;
    if (cell.isInvisible()) attributes |= 0x20;
    if (cell.isStrikethrough()) attributes |= 0x40;
    return attributes;
  }

  subscribeToBufferChanges(sessionId: string, listener: (snapshot: BufferSnapshot) => void) {
    if (!this.bufferListeners.has(sessionId)) {
      this.bufferListeners.set(sessionId, new Set());
    }
    
    this.bufferListeners.get(sessionId)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.bufferListeners.get(sessionId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.bufferListeners.delete(sessionId);
        }
      }
    };
  }

  async notifyBufferChange(sessionId: string) {
    const listeners = this.bufferListeners.get(sessionId);
    if (!listeners || listeners.size === 0) return;

    try {
      const snapshot = await this.getBufferSnapshot(sessionId);
      listeners.forEach(listener => {
        try {
          listener(snapshot);
        } catch (error) {
          console.error(`Error notifying buffer listener for ${sessionId}:`, error);
        }
      });
    } catch (error) {
      console.error(`Error getting buffer snapshot for ${sessionId}:`, error);
    }
  }
}
```

### 3.2 WebSocket Buffer Streaming

```typescript
// server/services/buffer-aggregator.ts
import { WebSocket } from 'ws';
import { TerminalManager } from './terminal-manager.js';

export class BufferAggregator {
  private terminalManager = new TerminalManager();
  private clientConnections = new Map<WebSocket, Set<string>>();

  handleConnection(ws: WebSocket, sessionId: string) {
    console.log(`Client connected for session ${sessionId}`);

    // Track connection
    if (!this.clientConnections.has(ws)) {
      this.clientConnections.set(ws, new Set());
    }
    this.clientConnections.get(ws)!.add(sessionId);

    // Subscribe to buffer updates
    const unsubscribe = this.terminalManager.subscribeToBufferChanges(
      sessionId,
      (snapshot) => {
        if (ws.readyState === WebSocket.OPEN) {
          this.sendBufferUpdate(ws, sessionId, snapshot);
        }
      }
    );

    // Send initial buffer
    this.sendInitialBuffer(ws, sessionId);

    // Handle WebSocket events
    ws.on('message', (data) => {
      this.handleMessage(ws, sessionId, data);
    });

    ws.on('close', () => {
      console.log(`Client disconnected from session ${sessionId}`);
      unsubscribe();
      this.clientConnections.delete(ws);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for session ${sessionId}:`, error);
      unsubscribe();
      this.clientConnections.delete(ws);
    });
  }

  private async sendInitialBuffer(ws: WebSocket, sessionId: string) {
    try {
      const snapshot = await this.terminalManager.getBufferSnapshot(sessionId);
      this.sendBufferUpdate(ws, sessionId, snapshot);
    } catch (error) {
      console.error(`Failed to send initial buffer for ${sessionId}:`, error);
    }
  }

  private sendBufferUpdate(ws: WebSocket, sessionId: string, snapshot: BufferSnapshot) {
    if (ws.readyState !== WebSocket.OPEN) return;

    try {
      // Send as binary for efficiency
      const binaryData = this.encodeSnapshot(sessionId, snapshot);
      ws.send(binaryData);
    } catch (error) {
      console.error(`Failed to send buffer update for ${sessionId}:`, error);
    }
  }

  private encodeSnapshot(sessionId: string, snapshot: BufferSnapshot): Buffer {
    // Binary protocol:
    // [0] Magic byte (0xBF)
    // [1-4] Session ID length (uint32, little-endian)
    // [5-n] Session ID (UTF-8)
    // [n+1...] Buffer data
    
    const sessionIdBuffer = Buffer.from(sessionId, 'utf8');
    const bufferData = this.encodeBufferSnapshot(snapshot);
    
    const result = Buffer.allocUnsafe(1 + 4 + sessionIdBuffer.length + bufferData.length);
    let offset = 0;
    
    // Magic byte
    result.writeUInt8(0xBF, offset++);
    
    // Session ID length
    result.writeUInt32LE(sessionIdBuffer.length, offset);
    offset += 4;
    
    // Session ID
    sessionIdBuffer.copy(result, offset);
    offset += sessionIdBuffer.length;
    
    // Buffer data
    bufferData.copy(result, offset);
    
    return result;
  }

  private encodeBufferSnapshot(snapshot: BufferSnapshot): Buffer {
    // Encode snapshot as JSON for simplicity
    // Production would use optimized binary format
    const data = JSON.stringify(snapshot);
    return Buffer.from(data, 'utf8');
  }

  private handleMessage(ws: WebSocket, sessionId: string, data: Buffer) {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'subscribe':
          // Handle subscription
          break;
        case 'unsubscribe':
          // Handle unsubscription
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }
}
```

## Phase 4: REST API Endpoints

### 4.1 Session Management API

```typescript
// server/routes/sessions.ts
import { Router } from 'express';
import { PtyManager } from '../pty/pty-manager.js';

export function createSessionRoutes(ptyManager: PtyManager) {
  const router = Router();

  // Create new session
  router.post('/', async (req, res) => {
    try {
      const options = req.body;
      const result = await ptyManager.createSession(options);
      
      res.json({
        success: true,
        session: result.sessionInfo,
        wsUrl: `/ws/buffer?sessionId=${result.sessionId}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get all sessions
  router.get('/', (req, res) => {
    try {
      const sessions = ptyManager.getAllSessions();
      res.json({ success: true, sessions });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get specific session
  router.get('/:id', (req, res) => {
    try {
      const session = ptyManager.getSession(req.params.id);
      if (session) {
        res.json({ success: true, session: session.info });
      } else {
        res.status(404).json({ success: false, error: 'Session not found' });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Send input to session
  router.post('/:id/input', (req, res) => {
    try {
      const { text, key } = req.body;
      const input = text || this.getSpecialKeySequence(key);
      
      ptyManager.sendInput(req.params.id, input);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Resize session
  router.post('/:id/resize', (req, res) => {
    try {
      const { cols, rows } = req.body;
      ptyManager.resizeSession(req.params.id, cols, rows);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Kill session
  router.delete('/:id', (req, res) => {
    try {
      ptyManager.killSession(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
```

## Phase 5: Frontend Implementation

### 5.1 WebSocket Client Service

```typescript
// client/services/websocket-client.ts
export class TerminalWebSocketClient {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private onBufferUpdate: ((snapshot: BufferSnapshot) => void) | null = null;

  connect(sessionId: string, onBufferUpdate: (snapshot: BufferSnapshot) => void) {
    this.sessionId = sessionId;
    this.onBufferUpdate = onBufferUpdate;

    const wsUrl = `ws://localhost:4020/ws/buffer?sessionId=${sessionId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log(`Connected to session ${sessionId}`);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = () => {
      console.log(`Disconnected from session ${sessionId}`);
      // Implement reconnection logic here
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleMessage(data: ArrayBuffer | Blob) {
    if (data instanceof ArrayBuffer) {
      this.handleBinaryMessage(data);
    } else if (data instanceof Blob) {
      data.arrayBuffer().then(buffer => this.handleBinaryMessage(buffer));
    }
  }

  private handleBinaryMessage(buffer: ArrayBuffer) {
    const view = new DataView(buffer);
    let offset = 0;

    // Check magic byte
    const magic = view.getUint8(offset++);
    if (magic !== 0xBF) {
      console.error('Invalid magic byte:', magic);
      return;
    }

    // Read session ID length
    const sessionIdLength = view.getUint32(offset, true);
    offset += 4;

    // Read session ID
    const sessionIdBytes = new Uint8Array(buffer, offset, sessionIdLength);
    const sessionId = new TextDecoder().decode(sessionIdBytes);
    offset += sessionIdLength;

    // Read buffer data
    const bufferBytes = new Uint8Array(buffer, offset);
    const bufferData = new TextDecoder().decode(bufferBytes);
    
    try {
      const snapshot = JSON.parse(bufferData) as BufferSnapshot;
      if (this.onBufferUpdate) {
        this.onBufferUpdate(snapshot);
      }
    } catch (error) {
      console.error('Failed to parse buffer data:', error);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

### 5.2 Terminal UI Component

```typescript
// client/components/terminal.ts
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { TerminalWebSocketClient } from '../services/websocket-client.js';

@customElement('terminal-component')
export class TerminalComponent extends LitElement {
  @property({ type: String }) sessionId = '';
  @state() private buffer: BufferSnapshot | null = null;

  private wsClient = new TerminalWebSocketClient();

  static styles = css`
    .terminal-container {
      background: #0a0a0a;
      color: #e4e4e4;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 14px;
      line-height: 1.2;
      padding: 10px;
      overflow: auto;
      height: 100%;
    }

    .terminal-line {
      white-space: pre;
      min-height: 1.2em;
    }

    .terminal-char {
      display: inline;
    }

    .cursor {
      background-color: #00ff00;
      color: #000000;
    }

    .bold { font-weight: bold; }
    .italic { font-style: italic; }
    .underline { text-decoration: underline; }
    .dim { opacity: 0.6; }
    .strikethrough { text-decoration: line-through; }
  `;

  connectedCallback() {
    super.connectedCallback();
    if (this.sessionId) {
      this.connectToSession();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.wsClient.disconnect();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('sessionId') && this.sessionId) {
      this.connectToSession();
    }
  }

  private connectToSession() {
    this.wsClient.connect(this.sessionId, (snapshot) => {
      this.buffer = snapshot;
      this.requestUpdate();
    });
  }

  private renderLine(cells: BufferCell[], row: number): string {
    let html = '';
    let currentClasses = '';
    let currentStyle = '';
    let currentChars = '';

    const flushGroup = () => {
      if (currentChars) {
        const escapedChars = this.escapeHtml(currentChars);
        html += `<span class="${currentClasses}"${currentStyle ? ` style="${currentStyle}"` : ''}>${escapedChars}</span>`;
        currentChars = '';
      }
    };

    cells.forEach((cell, col) => {
      const isCursor = this.buffer && 
        row === this.buffer.cursorY && 
        col === this.buffer.cursorX;

      let classes = 'terminal-char';
      let style = '';

      if (isCursor) {
        classes += ' cursor';
      }

      // Handle attributes
      if (cell.attributes) {
        if (cell.attributes & 0x01) classes += ' bold';
        if (cell.attributes & 0x02) classes += ' italic';
        if (cell.attributes & 0x04) classes += ' underline';
        if (cell.attributes & 0x08) classes += ' dim';
        if (cell.attributes & 0x40) classes += ' strikethrough';
      }

      // Handle colors
      if (cell.fg !== undefined) {
        if (cell.fg <= 255) {
          style += `color: var(--terminal-color-${cell.fg});`;
        } else {
          const r = (cell.fg >> 16) & 0xff;
          const g = (cell.fg >> 8) & 0xff;
          const b = cell.fg & 0xff;
          style += `color: rgb(${r}, ${g}, ${b});`;
        }
      }

      if (cell.bg !== undefined) {
        if (cell.bg <= 255) {
          style += `background-color: var(--terminal-color-${cell.bg});`;
        } else {
          const r = (cell.bg >> 16) & 0xff;
          const g = (cell.bg >> 8) & 0xff;
          const b = cell.bg & 0xff;
          style += `background-color: rgb(${r}, ${g}, ${b});`;
        }
      }

      // Check if styling changed
      if (classes !== currentClasses || style !== currentStyle) {
        flushGroup();
        currentClasses = classes;
        currentStyle = style;
      }

      currentChars += cell.char;
    });

    flushGroup();
    return html || '&nbsp;';
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  render() {
    if (!this.buffer) {
      return html`<div class="terminal-container">Connecting...</div>`;
    }

    const lines = this.buffer.cells.map((cells, row) => 
      html`<div class="terminal-line" .innerHTML=${this.renderLine(cells, row)}></div>`
    );

    return html`
      <div class="terminal-container">
        ${lines}
      </div>
    `;
  }
}
```

### 5.3 Session Management UI

```typescript
// client/components/session-view.ts
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('session-view')
export class SessionView extends LitElement {
  @state() private sessions: SessionInfo[] = [];
  @state() private currentSessionId: string | null = null;

  static styles = css`
    .session-list {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    .session-card {
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 16px;
      margin: 10px 0;
      background: white;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .session-card:hover {
      background: #f5f5f5;
    }

    .session-card.active {
      border-color: #007bff;
      background: #e7f3ff;
    }

    .session-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .session-name {
      font-weight: bold;
      font-size: 16px;
    }

    .session-status {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      text-transform: uppercase;
    }

    .status-running { background: #d4edda; color: #155724; }
    .status-exited { background: #f8d7da; color: #721c24; }

    .terminal-view {
      height: 500px;
      border: 1px solid #ccc;
      margin-top: 20px;
    }

    .create-session {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin-bottom: 20px;
    }

    .create-session:hover {
      background: #0056b3;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadSessions();
  }

  private async loadSessions() {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      if (data.success) {
        this.sessions = data.sessions;
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  private async createSession() {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Terminal ${new Date().toLocaleTimeString()}`,
          cols: 80,
          rows: 24
        })
      });

      const data = await response.json();
      if (data.success) {
        await this.loadSessions();
        this.currentSessionId = data.session.id;
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }

  private selectSession(sessionId: string) {
    this.currentSessionId = sessionId;
  }

  private async killSession(sessionId: string) {
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      await this.loadSessions();
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }
    } catch (error) {
      console.error('Failed to kill session:', error);
    }
  }

  render() {
    return html`
      <div class="session-list">
        <button class="create-session" @click=${this.createSession}>
          Create New Terminal
        </button>

        ${this.sessions.map(session => html`
          <div 
            class="session-card ${this.currentSessionId === session.id ? 'active' : ''}"
            @click=${() => this.selectSession(session.id)}
          >
            <div class="session-header">
              <span class="session-name">${session.name}</span>
              <div>
                <span class="session-status status-${session.status}">${session.status}</span>
                <button @click=${(e: Event) => {
                  e.stopPropagation();
                  this.killSession(session.id);
                }}>Kill</button>
              </div>
            </div>
            <div>PID: ${session.pid || 'N/A'}</div>
            <div>Started: ${new Date(session.startedAt).toLocaleString()}</div>
          </div>
        `)}

        ${this.currentSessionId ? html`
          <div class="terminal-view">
            <terminal-component .sessionId=${this.currentSessionId}></terminal-component>
          </div>
        ` : ''}
      </div>
    `;
  }
}
```

## Phase 6: Advanced Features

### 6.1 Input Handling

```typescript
// client/services/input-manager.ts
export class InputManager {
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async sendInput(input: string | { key: string }) {
    try {
      await fetch(`/api/sessions/${this.sessionId}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
    } catch (error) {
      console.error('Failed to send input:', error);
    }
  }

  async sendResize(cols: number, rows: number) {
    try {
      await fetch(`/api/sessions/${this.sessionId}/resize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cols, rows })
      });
    } catch (error) {
      console.error('Failed to resize terminal:', error);
    }
  }

  setupKeyboardHandling(element: HTMLElement) {
    element.addEventListener('keydown', (e) => {
      // Prevent default browser behavior
      e.preventDefault();

      // Handle special keys
      const specialKeys: Record<string, string> = {
        'Enter': '\r',
        'Backspace': '\u007f',
        'Tab': '\t',
        'Escape': '\u001b',
        'ArrowUp': '\u001b[A',
        'ArrowDown': '\u001b[B',
        'ArrowRight': '\u001b[C',
        'ArrowLeft': '\u001b[D',
        'Home': '\u001b[H',
        'End': '\u001b[F',
        'PageUp': '\u001b[5~',
        'PageDown': '\u001b[6~',
        'Delete': '\u001b[3~'
      };

      if (e.key in specialKeys) {
        this.sendInput(specialKeys[e.key]);
      } else if (e.key.length === 1) {
        // Handle Ctrl+key combinations
        if (e.ctrlKey) {
          const ctrlKey = String.fromCharCode(e.key.charCodeAt(0) - 96);
          this.sendInput(ctrlKey);
        } else {
          this.sendInput(e.key);
        }
      }
    });

    // Make element focusable
    element.setAttribute('tabindex', '0');
    element.focus();
  }
}
```

### 6.2 Terminal Themes

```typescript
// client/utils/themes.ts
export interface TerminalTheme {
  id: string;
  name: string;
  colors: {
    foreground: string;
    background: string;
    cursor: string;
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    brightBlack: string;
    brightRed: string;
    brightGreen: string;
    brightYellow: string;
    brightBlue: string;
    brightMagenta: string;
    brightCyan: string;
    brightWhite: string;
  };
}

export const TERMINAL_THEMES: TerminalTheme[] = [
  {
    id: 'default',
    name: 'Default',
    colors: {
      foreground: '#e4e4e4',
      background: '#0a0a0a',
      cursor: '#00ff00',
      black: '#000000',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#f8f8f2',
      brightBlack: '#44475a',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightMagenta: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff'
    }
  }
  // Add more themes here
];

export function applyTheme(theme: TerminalTheme) {
  const root = document.documentElement;
  
  // Set CSS custom properties for terminal colors
  Object.entries(theme.colors).forEach(([name, color], index) => {
    if (name === 'foreground') {
      root.style.setProperty('--terminal-foreground', color);
    } else if (name === 'background') {
      root.style.setProperty('--terminal-background', color);
    } else if (name === 'cursor') {
      root.style.setProperty('--terminal-cursor', color);
    } else {
      // Map color names to ANSI color indices
      const colorMap: Record<string, number> = {
        black: 0, red: 1, green: 2, yellow: 3,
        blue: 4, magenta: 5, cyan: 6, white: 7,
        brightBlack: 8, brightRed: 9, brightGreen: 10, brightYellow: 11,
        brightBlue: 12, brightMagenta: 13, brightCyan: 14, brightWhite: 15
      };
      
      if (name in colorMap) {
        root.style.setProperty(`--terminal-color-${colorMap[name]}`, color);
      }
    }
  });
}
```

## Phase 7: Testing & Debugging

### 7.1 Unit Tests

```typescript
// tests/pty-manager.test.ts
import { PtyManager } from '../server/pty/pty-manager.js';

describe('PtyManager', () => {
  let ptyManager: PtyManager;

  beforeEach(() => {
    ptyManager = new PtyManager();
  });

  test('should create a session', async () => {
    const result = await ptyManager.createSession({
      name: 'Test Terminal',
      cols: 80,
      rows: 24
    });

    expect(result.sessionId).toBeDefined();
    expect(result.sessionInfo.name).toBe('Test Terminal');
    expect(result.sessionInfo.status).toBe('running');
  });

  test('should send input to session', async () => {
    const { sessionId } = await ptyManager.createSession();
    
    expect(() => {
      ptyManager.sendInput(sessionId, 'echo "hello"\n');
    }).not.toThrow();
  });

  test('should resize session', async () => {
    const { sessionId } = await ptyManager.createSession();
    
    expect(() => {
      ptyManager.resizeSession(sessionId, 100, 30);
    }).not.toThrow();
  });
});
```

### 7.2 Integration Tests

```typescript
// tests/integration.test.ts
import request from 'supertest';
import { TerminalServer } from '../server/server.js';

describe('Terminal API Integration', () => {
  let server: TerminalServer;
  let sessionId: string;

  beforeAll(async () => {
    server = new TerminalServer();
    await server.start(4021); // Use different port for tests
  });

  test('POST /api/sessions should create session', async () => {
    const response = await request(server.app)
      .post('/api/sessions')
      .send({
        name: 'Test Terminal',
        cols: 80,
        rows: 24
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.session.id).toBeDefined();
    
    sessionId = response.body.session.id;
  });

  test('GET /api/sessions should list sessions', async () => {
    const response = await request(server.app)
      .get('/api/sessions');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.sessions).toBeInstanceOf(Array);
  });

  test('POST /api/sessions/:id/input should send input', async () => {
    const response = await request(server.app)
      .post(`/api/sessions/${sessionId}/input`)
      .send({ text: 'echo "hello"\n' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

## Phase 8: Deployment và Production

### 8.1 Production Configuration

```typescript
// server/config.ts
export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  session: {
    maxSessions: number;
    sessionTimeout: number;
    cleanupInterval: number;
  };
  security: {
    enableAuth: boolean;
    allowedUsers: string[];
  };
}

export const DEFAULT_CONFIG: ServerConfig = {
  port: parseInt(process.env.PORT || '4020'),
  host: process.env.HOST || '0.0.0.0',
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
    credentials: true
  },
  session: {
    maxSessions: parseInt(process.env.MAX_SESSIONS || '10'),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'), // 1 hour
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL || '300000') // 5 minutes
  },
  security: {
    enableAuth: process.env.ENABLE_AUTH === 'true',
    allowedUsers: process.env.ALLOWED_USERS ? process.env.ALLOWED_USERS.split(',') : []
  }
};
```

### 8.2 Docker Setup

```dockerfile
# Dockerfile
FROM node:18-alpine

# Install dependencies for node-pty
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build client
RUN npm run build:client

# Expose port
EXPOSE 4020

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S terminal -u 1001
USER terminal

# Start server
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  terminal-server:
    build: .
    ports:
      - "4020:4020"
    environment:
      - PORT=4020
      - HOST=0.0.0.0
      - MAX_SESSIONS=20
      - SESSION_TIMEOUT=7200000
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - terminal-server
    restart: unless-stopped
```

### 8.3 Security Considerations

```typescript
// server/middleware/security.ts
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

export const securityMiddleware = [
  // Basic security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "ws:", "wss:"]
      }
    }
  }),

  // Rate limiting
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP'
  }),

  // Session creation rate limiting
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit session creation to 5 per minute
    skip: (req) => !req.path.includes('/sessions') || req.method !== 'POST'
  })
];

export function validateSession(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.params.id;
  
  // Validate session ID format
  if (!/^[a-f0-9-]{36}$/.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid session ID format' });
  }
  
  next();
}
```

## Kết Luận

Blueprint này cung cấp:

1. **Kiến trúc hoàn chỉnh** với các layer rõ ràng
2. **Implementation chi tiết** từng component
3. **Giao thức tối ưu** cho real-time communication
4. **Security và performance** best practices
5. **Testing strategy** đầy đủ
6. **Production deployment** ready

Mỗi phase có thể được implement độc lập và test riêng biệt. Junior developer có thể bắt đầu từ Phase 1 và dần dần build lên các tính năng advanced.

Các công nghệ chính:
- **Backend**: Node.js, Express, node-pty, WebSocket
- **Frontend**: TypeScript, LitElement, xterm.js
- **Communication**: REST API + Binary WebSocket protocol
- **Testing**: Jest, Supertest
- **Deployment**: Docker, Nginx

Framework này đã được test và proven trong VibeTunnel production environment.