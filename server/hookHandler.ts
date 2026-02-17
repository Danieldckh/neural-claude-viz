import { Router } from 'express'
import type { Request, Response } from 'express'
import { nanoid } from 'nanoid'
import { parseHookEvent, type SessionState } from './eventParser.js'
import type { HookPayload } from './types.js'
import type { WSMessage } from '../src/types.js'

const VALID_HOOK_TYPES = new Set(['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop'])

// Color mapping by node type
const NODE_COLORS: Record<string, string> = {
  prompt: '#bb86fc',
  thought: '#00d4ff',
  action: '#00ff88',
  agent: '#ff9800',
  result: '#ff4081',
  error: '#ff1744',
}

export function createHookRouter(
  broadcast: (msg: WSMessage) => void,
  sessionTracker: Map<string, SessionState>
): Router {
  const router = Router()

  router.post('/api/hook/:type', (req: Request, res: Response) => {
    const hookType = req.params.type as string

    // Auth check (skip in local mode)
    const deployMode = process.env.DEPLOY_MODE ?? 'local'
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

    // Validate hook type
    if (!VALID_HOOK_TYPES.has(hookType)) {
      res.status(400).json({ error: `Invalid hook type: ${hookType}` })
      return
    }

    const payload = req.body as HookPayload
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Invalid payload' })
      return
    }

    // Ensure session_id exists
    if (!payload.session_id) {
      payload.session_id = 'default'
    }

    const sessionId = payload.session_id
    const state = sessionTracker.get(sessionId)
    const previousNodeId = state?.lastNodeId ?? null

    // Parse the hook event into a ParsedEvent
    const event = parseHookEvent(hookType as string, payload, sessionTracker)

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
        status: hookType === 'PostToolUse' || hookType === 'Stop' || hookType === 'SubagentStop'
          ? 'completed'
          : 'active',
      },
    }
    broadcast(nodeAdd)

    // 2. Broadcast edge_add connecting previous node to this one
    if (previousNodeId) {
      const edgeColor = NODE_COLORS[event.nodeType] ?? '#00d4ff'
      const edgeAdd: WSMessage = {
        type: 'edge_add',
        payload: {
          id: nanoid(),
          sourceId: previousNodeId,
          targetId: event.id,
          color: edgeColor,
        },
      }
      broadcast(edgeAdd)
    }

    // 3. Broadcast event_log for the text panel
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

    // 4. For PostToolUse, also send a node_update for the matching PreToolUse node
    if (hookType === 'PostToolUse' && previousNodeId) {
      const nodeUpdate: WSMessage = {
        type: 'node_update',
        payload: {
          id: previousNodeId,
          status: 'completed',
        },
      }
      broadcast(nodeUpdate)
    }

    res.status(200).json({ ok: true, eventId: event.id })
  })

  return router
}
