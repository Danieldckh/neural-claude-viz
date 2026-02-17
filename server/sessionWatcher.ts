import { watch } from 'chokidar'
import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { join, basename } from 'path'
import { nanoid } from 'nanoid'
import { parseSessionMessage, type SessionState } from './eventParser.js'
import type { SessionMessage } from './types.js'
import type { WSMessage } from '../src/types.js'

// Color mapping by node type
const NODE_COLORS: Record<string, string> = {
  prompt: '#bb86fc',
  thought: '#00d4ff',
  action: '#00ff88',
  agent: '#ff9800',
  result: '#ff4081',
  error: '#ff1744',
}

// Track read position per file (tail-f behavior)
const filePositions = new Map<string, number>()

/**
 * Start watching ~/.claude/projects/ for .jsonl files.
 * Only operates when DEPLOY_MODE is not 'remote'.
 */
export function startWatcher(
  broadcast: (msg: WSMessage) => void,
  sessionTracker: Map<string, SessionState>
): void {
  const deployMode = process.env.DEPLOY_MODE ?? 'local'
  if (deployMode === 'remote') {
    return
  }

  const watchDir = join(homedir(), '.claude', 'projects')
  const globPattern = join(watchDir, '**', '*.jsonl').replace(/\\/g, '/')

  const watcher = watch(globPattern, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  })

  watcher.on('add', (filePath: string) => {
    processFile(filePath, broadcast, sessionTracker)
  })

  watcher.on('change', (filePath: string) => {
    processFile(filePath, broadcast, sessionTracker)
  })

  watcher.on('error', (err: unknown) => {
    console.error('[watcher] error:', err instanceof Error ? err.message : String(err))
  })

  console.log(`[watcher] watching ${watchDir} for .jsonl files`)
}

async function processFile(
  filePath: string,
  broadcast: (msg: WSMessage) => void,
  sessionTracker: Map<string, SessionState>
): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const currentPos = filePositions.get(filePath) ?? 0

    // Only process new content past what we have already read
    const newContent = content.slice(currentPos)
    filePositions.set(filePath, content.length)

    if (!newContent.trim()) return

    // Derive session ID from filename
    const sessionId = basename(filePath, '.jsonl')

    const lines = newContent.split('\n').filter((line) => line.trim())
    for (const line of lines) {
      let msg: SessionMessage
      try {
        msg = JSON.parse(line) as SessionMessage
      } catch {
        // Skip malformed JSON lines
        continue
      }

      if (!msg.role) continue

      // Capture previous node BEFORE parsing updates the tracker
      const state = sessionTracker.get(sessionId)
      const previousNodeId = state?.lastNodeId ?? null

      const event = parseSessionMessage(msg, sessionId, sessionTracker)
      if (!event) continue

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
    }
  } catch (err) {
    console.error(`[watcher] error processing ${filePath}:`, (err as Error).message)
  }
}
