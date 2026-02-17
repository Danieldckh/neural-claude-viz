import express from 'express'
import cors from 'cors'
import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { nanoid } from 'nanoid'
import { createHookRouter } from './hookHandler.js'
import { startWatcher } from './sessionWatcher.js'
import { parseSessionMessage, type SessionState } from './eventParser.js'
import type { BridgePayload } from './types.js'
import type { WSMessage } from '../src/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

// Session tracker: sessionId -> { lastNodeId, currentAgentId }
const sessionTracker = new Map<string, SessionState>()

// Color mapping by node type
const NODE_COLORS: Record<string, string> = {
  prompt: '#bb86fc',
  thought: '#00d4ff',
  action: '#00ff88',
  agent: '#ff9800',
  result: '#ff4081',
  error: '#ff1744',
}

/**
 * Broadcast a WSMessage to all connected WebSocket clients.
 */
function broadcast(msg: WSMessage): void {
  const data = JSON.stringify(msg)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  }
}

// --- WebSocket connection handling ---
wss.on('connection', (ws) => {
  console.log('[ws] client connected')
  ws.on('close', () => console.log('[ws] client disconnected'))
  ws.on('pong', () => {
    // Client is alive
  })
})

// Ping interval to keep WS connections alive (every 30s)
const pingInterval = setInterval(() => {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.ping()
    }
  }
}, 30_000)

wss.on('close', () => {
  clearInterval(pingInterval)
})

// --- Mount hook handler router ---
const hookRouter = createHookRouter(broadcast, sessionTracker)
app.use(hookRouter)

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', clients: wss.clients.size })
})

// --- Bridge endpoint for remote JSONL streaming ---
app.post('/api/bridge', (req, res) => {
  const deployMode = process.env.DEPLOY_MODE ?? 'local'

  // Auth check for non-local mode
  if (deployMode !== 'local') {
    const apiKey = process.env.NEURAL_VIZ_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: 'Server misconfiguration: NEURAL_VIZ_API_KEY not set' })
      return
    }
    const auth = req.headers.authorization
    if (!auth || auth !== `Bearer ${apiKey}`) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
  }

  const body = req.body as BridgePayload
  if (!body || !body.sessionId || !Array.isArray(body.messages)) {
    res.status(400).json({ error: 'Invalid bridge payload: requires sessionId and messages array' })
    return
  }

  const { sessionId, messages } = body
  let processed = 0

  for (const msg of messages) {
    if (!msg.role) continue

    // Capture previous node BEFORE parsing updates the tracker
    const state = sessionTracker.get(sessionId)
    const previousNodeId = state?.lastNodeId ?? null

    const event = parseSessionMessage(msg, sessionId, sessionTracker)
    if (!event) continue
    event.source = 'bridge'

    // 1. Broadcast node_add
    const nodeAdd: WSMessage = {
      type: 'node_add',
      payload: {
        id: event.id,
        type: event.nodeType,
        label: event.label,
        content: event.content,
        toolName: event.toolName,
        parentAgentId: event.parentAgentId,
        status: 'active',
      },
    }
    broadcast(nodeAdd)

    // 2. Broadcast edge_add connecting parent node to this one
    const connectFromId = event.parentNodeId ?? previousNodeId
    if (connectFromId) {
      const edgeColor = NODE_COLORS[event.nodeType] ?? '#00d4ff'
      const edgeAdd: WSMessage = {
        type: 'edge_add',
        payload: {
          id: nanoid(),
          sourceId: connectFromId,
          targetId: event.id,
          color: edgeColor,
        },
      }
      broadcast(edgeAdd)
    }

    // 3. Broadcast event_log
    const eventLog: WSMessage = {
      type: 'event_log',
      payload: {
        id: nanoid(),
        nodeId: event.id,
        nodeType: event.nodeType,
        label: event.label,
        content: event.content,
        timestamp: event.timestamp,
      },
    }
    broadcast(eventLog)

    processed++
  }

  res.json({ ok: true, processed })
})

// --- Serve static files in production ---
const distPath = path.resolve(__dirname, '..', 'dist')
app.use(express.static(distPath))

// SPA fallback: serve index.html for non-API routes (Express 5 named wildcard)
app.get('{*path}', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    next()
    return
  }
  res.sendFile(path.join(distPath, 'index.html'))
})

// --- Start session file watcher (local mode only) ---
startWatcher(broadcast, sessionTracker)

// --- Start server ---
const PORT = parseInt(process.env.PORT ?? '4800', 10)
server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
  console.log(`[server] mode: ${process.env.DEPLOY_MODE ?? 'local'}`)
})
