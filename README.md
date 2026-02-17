# Neural Claude Viz — Documentation

## 📑 Navigation

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Setup Hooks](#setup-hooks)
  - [Run the Application](#run-the-application)
- [Architecture](#architecture)
- [Local vs Remote Mode](#local-vs-remote-mode)
- [Color Legend](#color-legend)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Hook Configuration](#hook-configuration)
  - [Docker Deployment](#docker-deployment)
- [Tech Stack](#tech-stack)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## Overview

Neural Claude Viz is a real-time visualization system that renders Claude Code's thinking process as an animated 2D neural graph. It captures the flow of prompts, thoughts, actions, and results as nodes and connections in an interactive canvas, revealing the underlying reasoning patterns of an AI agent. Perfect for developers and researchers wanting to understand how Claude Code solves problems step-by-step.

---

## Features

- **Neural Graph Visualization** — Nodes represent distinct cognitive events (prompts, thoughts, actions, agents, results, errors). Edges show the flow of reasoning between nodes.

- **Physics-Based Layout** — Nodes respond to forces and spring-like connections, creating an organic, continuously-evolving neural network visual.

- **Glow Effects** — Each node type emits a characteristic glow, with intensity reflecting activity status. Connections pulse with data flow.

- **Split-Pane Interface** — Left pane: animated neural canvas. Right pane: scrollable text log of all events with full content and timestamps.

- **WebSocket Integration** — Real-time streaming of events from Claude Code hooks directly to the visualization. Low-latency, bidirectional communication.

- **Hook Integration** — Captures events from Claude Code's hook system (PreToolUse, PostToolUse, Stop, SubagentStop) and converts them into graph nodes.

- **Local and Remote Modes** — Run locally on your machine (connected to local Claude Code instance) or remotely (receive events from a deployed visualization server).

- **Text Event Panel** — Detailed log of all captured events with timestamps, node types, and full content. Synchronized with the neural graph.

- **Interactive Canvas** — Pan, zoom, and mouse-over nodes to inspect their content. Keyboard shortcuts for resizing split panes.

- **Demo Mode** — Built-in demo sequence that simulates a complete Claude Code reasoning cycle, useful for testing and understanding the visualization.

---

## Quick Start

### Prerequisites

- **Node.js** (v18 or later)
- **npm** or **bun** for package management
- **Claude Code** (local installation) with hook support enabled (local mode only)

### Installation

Clone or navigate to the project directory and install dependencies:

```bash
npm install
```

Expected output:
```
added 245 packages in 12s
```

> 💡 **Tip:** If you prefer faster builds, use `bun install` instead of `npm install`.

---

### Setup Hooks

Configure Claude Code to send events to the visualization server using the provided setup script.

#### Local Mode

```bash
./setup-hooks.sh
```

This script:
- Reads your Claude Code settings from `~/.claude/settings.local.json`
- Adds webhook commands to the `PreToolUse`, `PostToolUse`, `Stop`, and `SubagentStop` hook types
- Points them to the local server at `http://localhost:4800`
- Backs up your existing settings to `settings.local.json.bak`

Expected output:
```
Backed up existing settings to /Users/your-name/.claude/settings.local.json.bak
Hooks configured for local mode → http://localhost:4800
```

> 📝 **Note:** If you see errors, verify that `~/.claude/settings.local.json` exists or is readable. The script creates or merges the configuration safely.

#### Remote Mode

If running the visualization server on a remote machine, use:

```bash
./setup-hooks.sh --remote --url https://your-viz-server.com --key YOUR_API_KEY
```

The script will configure hooks to POST events to your remote server with Bearer token authentication.

---

### Run the Application

Start the development server in one terminal:

```bash
npm run dev
```

This runs both the Vite frontend dev server and the Express backend server concurrently.

Expected output:
```
[server] listening on http://localhost:4800
[server] mode: local
✓ 345 modules transformed.
ready in 234 ms
```

Then open your browser to:

```
http://localhost:4800
```

You should see:
- A header bar with "Neural Claude Viz" title and a connection status indicator (green = connected, red = disconnected)
- A large canvas area on the left (currently empty)
- A text panel on the right (awaiting events)
- A "Demo Event" button in the header to test the visualization

> ⚨ **Important:** The canvas will only populate once Claude Code triggers hook events. In the meantime, click "Demo Event" to see the visualization in action.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Claude Code (Local or Remote)                               │
│ Executes hooks on: PreToolUse, PostToolUse, Stop, etc.      │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP POST with event payload
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ Express Server (Node.js)                                     │
│ • POST /api/hook/:type     — Receives hook events          │
│ • POST /api/bridge         — Receives JSONL stream (remote) │
│ • GET /api/health          — Health check                   │
│ • WebSocket /ws            — Real-time client connections   │
└─────────────────────────────┬───────────────────────────────┘
                              │ Event parsing & node creation
                              │
        ┌─────────────────────▼─────────────────────┐
        │ Event Parser                              │
        │ • Converts hooks to NeuralEvent objects   │
        │ • Maintains session and agent state       │
        │ • Generates unique node IDs               │
        └─────────────────────┬─────────────────────┘
                              │ Broadcasts WSMessage
                              │
        ┌─────────────────────▼─────────────────────┐
        │ WebSocket Broadcast                       │
        │ • node_add: New node in graph            │
        │ • edge_add: Connection between nodes      │
        │ • node_update: Status or property change  │
        │ • event_log: Text log entry              │
        │ • session_start: New session marker       │
        └─────────────────────┬─────────────────────┘
                              │ JSON messages over WS
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ React Frontend (Vite)                                        │
│ • useSocket hook listens to WebSocket                        │
│ • Zustand store maintains graph state                        │
│ • NeuralCanvas renders nodes and edges on Canvas 2D          │
│ • TextPanel displays event log                               │
└─────────────────────────────────────────────────────────────┘
```

### Event Flow

1. **Hook Event** — Claude Code fires a hook (e.g., `PreToolUse` when about to call a tool)
2. **HTTP POST** — Hook curl command POSTs JSON payload to `/api/hook/:type`
3. **Event Parser** — Server parses payload into a `NeuralEvent` object
4. **Node Creation** — Event becomes a node in the graph with position, color, and metadata
5. **Edge Creation** — If not the first event, an edge connects the previous node to this new one
6. **WebSocket Broadcast** — Three messages sent to all connected clients:
   - `node_add` — The new node
   - `edge_add` — The new connection
   - `event_log` — The text log entry
7. **Frontend Update** — React re-renders canvas and text panel with new data

---

## Local vs Remote Mode

### Local Mode

**Use this when:** You're running Claude Code and the visualization server on the same machine.

**How it works:**
- Claude Code hooks POST to `http://localhost:4800/api/hook/:type`
- No authentication required
- Events are captured immediately from hooks
- Your local session file watcher monitors `~/.claude/projects/**/*.jsonl` for additional context

**Setup:**
```bash
npm run dev
./setup-hooks.sh
```

**Pros:**
- Simplest setup, no configuration needed
- Lowest latency
- Can see file system context from session watchers

**Cons:**
- Only works when Claude Code and server are on the same machine
- Server must remain running

### Remote Mode

**Use this when:** You want to visualize Claude Code running elsewhere, or deploy the visualization server to a shared environment.

**How it works:**
- Claude Code hooks POST to a remote URL (e.g., `https://neural-viz.example.com/api/hook/:type`)
- API key authentication required (configurable via `NEURAL_VIZ_API_KEY`)
- Server receives events over HTTPS, broadcasts to all connected WebSocket clients
- Separate bridge process watches local session files and streams to remote server (optional)

**Setup (Remote Server):**
```bash
docker run -p 4800:4800 \
  -e DEPLOY_MODE=remote \
  -e NEURAL_VIZ_API_KEY=secret-key-here \
  neural-claude-viz:latest
```

**Setup (Local Hook Configuration):**
```bash
./setup-hooks.sh --remote --url https://neural-viz.example.com --key secret-key-here
```

**Setup (Optional Bridge for File Streaming):**
```bash
npx tsx bridge.ts --url https://neural-viz.example.com --key secret-key-here
```

The bridge watcher monitors `~/.claude/projects/**/*.jsonl` and streams new messages to the remote server.

**Pros:**
- Works with Claude Code on any machine
- Multiple users can view the same session
- Scales to multiple instances

**Cons:**
- Requires deploying and maintaining a server
- Requires API key management
- Slightly higher latency

---

## Color Legend

Each node type has a distinct color, representing different stages of Claude Code's reasoning process:

| Node Type | Color | Hex Code | Meaning |
|-----------|-------|----------|---------|
| **Prompt** | Soft Purple | `#bb86fc` | User input or initial instruction |
| **Thought** | Electric Cyan | `#00d4ff` | Internal reasoning or analysis step |
| **Action** | Matrix Green | `#00ff88` | Executable tool call (Read, Grep, Edit, etc.) |
| **Agent** | Amber | `#ff9800` | Subagent activation or meta-reasoning |
| **Result** | Pink | `#ff4081` | Successful completion of an action |
| **Error** | Red | `#ff1744` | Failure, exception, or critical issue |

**Node Size Legend:**
| Type | Radius | Meaning |
|------|--------|---------|
| Prompt | 12px | Large, represents entry point |
| Thought | 5px | Tiny, represents internal state |
| Action | 8px | Medium, represents executable step |
| Agent | 22px | Largest, represents system-level reasoning |
| Result | 6px | Small, represents output/outcome |
| Error | 7px | Small, represents exception |

**Visual Status:**
- **Glow Intensity** — Bright glow = active node, dim glow = completed node
- **Ring** — Agent nodes display a subtle ring to distinguish them from other types
- **Pulsing Edges** — Connections pulse with activity, indicating data flow direction

---

## Configuration

### Environment Variables

These variables control server behavior, especially in production deployments.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PORT` | int | `4800` | Port the server listens on |
| `DEPLOY_MODE` | string | `local` | Set to `remote` for production deployments |
| `NEURAL_VIZ_API_KEY` | string | (none) | Bearer token for API authentication (required if `DEPLOY_MODE=remote`) |
| `NODE_ENV` | string | (auto) | Set to `production` when deploying |

**Example (Local Development):**
```bash
PORT=3000 npm run dev
```

**Example (Remote Production):**
```bash
NODE_ENV=production \
DEPLOY_MODE=remote \
NEURAL_VIZ_API_KEY=sk-1234567890abcdef \
PORT=4800 \
npm start
```

---

### Hook Configuration

Claude Code hooks are configured in `~/.claude/settings.local.json`. The setup script modifies this file automatically, but you can also configure hooks manually.

**Example hook configuration:**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "type": "command",
        "command": "curl -s -X POST http://localhost:4800/api/hook/PreToolUse -H 'Content-Type: application/json' -d @- > /dev/null 2>&1"
      }
    ],
    "PostToolUse": [
      {
        "type": "command",
        "command": "curl -s -X POST http://localhost:4800/api/hook/PostToolUse -H 'Content-Type: application/json' -d @- > /dev/null 2>&1"
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "curl -s -X POST http://localhost:4800/api/hook/Stop -H 'Content-Type: application/json' -d @- > /dev/null 2>&1"
      }
    ],
    "SubagentStop": [
      {
        "type": "command",
        "command": "curl -s -X POST http://localhost:4800/api/hook/SubagentStop -H 'Content-Type: application/json' -d @- > /dev/null 2>&1"
      }
    ]
  }
}
```

**Hook Types:**

- **PreToolUse** — Fired before Claude Code invokes a tool (Read, Grep, Bash, etc.). Creates an `action` node.
- **PostToolUse** — Fired after a tool completes. Updates the previous `action` node to `completed` status and creates a `result` node.
- **Stop** — Fired when the main agent stops (success, failure, or user interrupt). Creates a `result` or `error` node.
- **SubagentStop** — Fired when a subagent completes. Creates an `agent` node marked as completed.

**Payload Format:**

Each hook receives a JSON payload with the following structure:

```json
{
  "session_id": "session-uuid-or-default",
  "message": {
    "role": "assistant|user|tool",
    "content": "...",
    "tool_name": "Read|Grep|Bash|...",
    "error": "..."
  },
  "timestamp": 1234567890000
}
```

The server parses this and extracts relevant data for visualization.

---

### Docker Deployment

A multi-stage Dockerfile is included for containerization.

**Build the image:**
```bash
docker build -t neural-claude-viz:latest .
```

**Run with local mode:**
```bash
docker run -p 4800:4800 neural-claude-viz:latest
```

**Run with remote mode:**
```bash
docker run \
  -p 4800:4800 \
  -e DEPLOY_MODE=remote \
  -e NEURAL_VIZ_API_KEY=your-secret-key \
  neural-claude-viz:latest
```

**Docker Compose Example:**
```yaml
version: '3.8'
services:
  neural-viz:
    build: .
    ports:
      - "4800:4800"
    environment:
      NODE_ENV: production
      DEPLOY_MODE: remote
      NEURAL_VIZ_API_KEY: ${API_KEY}
    restart: unless-stopped
```

The Dockerfile:
1. Builds the React frontend with Vite
2. Installs production dependencies only
3. Copies the built assets and server code
4. Exposes port 4800
5. Runs `npm start` to launch the server

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React 19 | UI component framework |
| **Build Tool** | Vite 7 | Fast bundler and dev server |
| **Language** | TypeScript 5.9 | Type-safe development |
| **Styling** | Tailwind CSS 4 | Utility-first styling |
| **State Management** | Zustand 5 | Lightweight store for graph state |
| **Canvas Rendering** | Canvas 2D API | GPU-accelerated node and edge rendering |
| **Backend** | Express 5 | HTTP and WebSocket server |
| **Real-Time** | WebSocket (ws) | Bidirectional client-server communication |
| **File Watching** | Chokidar 5 | Monitors `.jsonl` files for bridge streaming |
| **IDs** | nanoid 5 | Short, unique node/edge identifiers |
| **Concurrency** | concurrently 9 | Runs dev and server tasks simultaneously |

---

## Development

### Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start both frontend (Vite) and backend (Express) in watch mode |
| `npm run dev:client` | Start only the Vite frontend dev server |
| `npm run dev:server` | Start only the Express backend server in watch mode |
| `npm run build` | Build the React frontend for production |
| `npm start` | Run the compiled server (used in Docker) |
| `npm run lint` | Run ESLint on the entire codebase |
| `npm run preview` | Preview the production build locally |

### File Structure

```
neural-claude-viz/
├─ src/
│  ├─ App.tsx                 # Main React component (split pane layout)
│  ├─ types.ts               # TypeScript types (NeuralNode, NeuralEdge, etc.)
│  ├─ canvas/
│  │  └─ NeuralCanvas.tsx     # Canvas rendering logic
│  ├─ panel/
│  │  └─ TextPanel.tsx        # Event log UI
│  ├─ store/
│  │  └─ graphStore.ts        # Zustand store for graph state
│  ├─ hooks/
│  │  └─ useSocket.ts         # WebSocket connection hook
│  └─ main.tsx                # React entry point
├─ server/
│  ├─ index.ts                # Express server setup and main routes
│  ├─ hookHandler.ts          # Handles /api/hook/* endpoints
│  ├─ eventParser.ts          # Parses hooks and file watcher events
│  ├─ sessionWatcher.ts        # Monitors ~/.claude/projects for .jsonl files
│  └─ types.ts                # Server TypeScript types
├─ bridge.ts                  # Optional remote bridge (watches local files)
├─ setup-hooks.sh             # Hook configuration script
├─ Dockerfile                 # Multi-stage Docker build
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ tailwind.config.ts
├─ eslint.config.js
└─ README.md                  # This file
```

### Debugging

**Enable verbose logging:**

Add this to `server/index.ts` for debugging:

```typescript
if (process.env.DEBUG) {
  // Log all incoming messages
  wss.on('connection', (ws) => {
    ws.on('message', (msg) => {
      console.log('[ws] message:', msg);
    });
  });
}
```

Then run:
```bash
DEBUG=1 npm run dev
```

**Frontend debugging:**

Open DevTools (F12) and check:
- **Console** — WebSocket connection messages
- **Network** — WebSocket frames under the WS tab
- **React DevTools** — Inspect Zustand store state

---

## Troubleshooting

### Canvas is empty, no nodes appearing

**Check 1: Are hooks configured?**
```bash
cat ~/.claude/settings.local.json | grep -A 20 "hooks"
```

You should see `PreToolUse`, `PostToolUse`, `Stop`, and `SubagentStop` entries with curl commands pointing to your server URL.

If not, re-run the setup script:
```bash
./setup-hooks.sh
```

**Check 2: Is the server running?**
```bash
curl http://localhost:4800/api/health
```

Expected response:
```json
{"status":"ok","clients":1}
```

If you get a connection error, start the dev server:
```bash
npm run dev
```

**Check 3: Are hook events actually firing?**

In your terminal running the server, watch for log output like:
```
[ws] client connected
[POST] /api/hook/PreToolUse
```

If you don't see this, Claude Code may not be triggering hooks. Try running Claude Code with a simple tool command:
```bash
claude "list the files in the current directory"
```

This should trigger PreToolUse and PostToolUse hooks.

---

### WebSocket connection refused or keeps disconnecting

**Issue:** Frontend shows "Disconnected" in the header, red indicator light.

**Cause:** The Express server is not reachable, or the WebSocket path is misconfigured.

**Fix:**

1. Verify the server is running:
   ```bash
   npm run dev
   ```

2. Check the console output for errors like:
   ```
   Error: connect ECONNREFUSED 127.0.0.1:4800
   ```

3. Verify port 4800 is not in use:
   ```bash
   lsof -i :4800  # macOS/Linux
   netstat -ano | findstr :4800  # Windows
   ```

4. If something else is using port 4800, change the port:
   ```bash
   PORT=3000 npm run dev
   ```

   Then update the WebSocket URL in `src/hooks/useSocket.ts`.

---

### Demo Event button works, but real hooks don't

**Cause:** Hooks are configured but Claude Code is not triggering them.

**Checks:**

1. Verify hooks are in the settings file:
   ```bash
   cat ~/.claude/settings.local.json | jq '.hooks'
   ```

2. Test the hook manually:
   ```bash
   curl -X POST http://localhost:4800/api/hook/PreToolUse \
     -H 'Content-Type: application/json' \
     -d '{"session_id":"test","message":{"role":"assistant","content":"test"}}'
   ```

   You should see a response:
   ```json
   {"ok":true,"eventId":"..."}
   ```

3. If the curl works but Claude Code hooks don't, the issue may be with how Claude Code executes the hooks. Check that:
   - The hook command syntax is correct (no missing quotes)
   - The hook doesn't have `stderr` or `stdout` redirection that might block it
   - Claude Code is actually at a point where it should fire hooks (e.g., about to call a tool)

---

### High CPU usage or performance lag on canvas

**Cause:** Physics simulation or rendering is not optimized.

**Fixes:**

1. **Reduce frame rate** — Edit `src/canvas/NeuralCanvas.tsx` and lower the animation FPS:
   ```typescript
   const FPS = 30; // Instead of 60
   ```

2. **Simplify physics** — Reduce the number of active particles or glow effects in high-load scenarios.

3. **Check browser** — Some browsers (Safari on older Macs) have slower Canvas 2D rendering. Try Chrome or Firefox.

4. **Check node count** — If you have >500 nodes, consider filtering or archiving old events.

---

### Remote mode authentication failing (401 errors)

**Cause:** API key is not set or is incorrect.

**Fix:**

1. Verify the API key is set on the server:
   ```bash
   echo $NEURAL_VIZ_API_KEY
   ```

2. Verify the hook command includes the correct Authorization header:
   ```bash
   cat ~/.claude/settings.local.json | jq '.hooks.PreToolUse[0].command'
   ```

   You should see:
   ```
   curl -X POST https://your-server/api/hook/PreToolUse -H 'Authorization: Bearer YOUR_KEY' ...
   ```

3. Test manually:
   ```bash
   curl -X POST https://your-server/api/hook/PreToolUse \
     -H 'Authorization: Bearer YOUR_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"session_id":"test",...}'
   ```

---

### "Invalid bridge payload" error

**Cause:** The `/api/bridge` endpoint received malformed data.

**This occurs when:**
- The `sessionId` field is missing from the payload
- The `messages` field is not an array
- The message format doesn't match expected schema

**Fix:**

Verify the bridge.ts watcher is sending correct data. Check the bridge.ts logs:
```bash
npx tsx bridge.ts --url http://localhost:4800
```

You should see:
```
[bridge] Watching /Users/user/.claude/projects
[bridge] Posting to http://localhost:4800
[bridge] Sent 3 messages from session-123
```

---

### Text panel shows events but canvas is empty

**Cause:** Events are being received, but the graph rendering is not working.

**Debug steps:**

1. Open DevTools and check the console for JavaScript errors.

2. Verify the Canvas 2D context is initialized. Add this to `src/canvas/NeuralCanvas.tsx`:
   ```typescript
   const canvas = canvasRef.current;
   if (!canvas) {
     console.error('Canvas ref not found');
     return;
   }
   const ctx = canvas.getContext('2d');
   if (!ctx) {
     console.error('Canvas 2D context not available');
     return;
   }
   ```

3. Check if the browser supports Canvas 2D. It's supported in all modern browsers, but very old browsers might have issues.

---

### Can't connect to remote server from Claude Code

**Cause:** Firewall, DNS, or HTTPS certificate issues.

**Fixes:**

1. **Test connectivity:**
   ```bash
   curl -v https://your-server/api/health
   ```

   You should see a 200 response. If you see SSL errors, the server certificate is invalid.

2. **Check firewall:**
   ```bash
   telnet your-server 443
   ```

   If this times out, your network is blocking the connection.

3. **Verify DNS:**
   ```bash
   nslookup your-server
   ```

   Should resolve to an IP address.

4. **Test the hook command locally:**
   ```bash
   curl -X POST https://your-server/api/hook/PreToolUse \
     -H 'Authorization: Bearer YOUR_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"session_id":"test",...}' \
     --verbose
   ```

   This will show detailed connection info.

---

## Contributing

Bug reports and feature requests are welcome. Please open an issue or pull request with:

1. **What you're trying to do** — Clear description of the use case
2. **What happened** — Actual behavior or error message
3. **What you expected** — Expected behavior
4. **Steps to reproduce** — Exact commands and inputs
5. **Environment** — OS, Node version, browser, etc.

---

## License

Proprietary. See LICENSE file for details.

---

**Last Updated:** 2026-02-17
**Version:** 1.0.0
**Status:** Stable
