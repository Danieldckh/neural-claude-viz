import { nanoid } from 'nanoid'
import type { HookPayload, SessionMessage, SessionContent, ParsedEvent } from './types.js'

// Session tracking state: sessionId -> { lastNodeId, currentAgentId }
export interface SessionState {
  lastNodeId: string | null
  currentAgentId: string | null
}

const TOOL_ACTIONS = new Set(['Bash', 'Read', 'Write', 'Edit', 'Grep', 'Glob'])

/**
 * Parse a Claude Code hook event into a ParsedEvent.
 */
export function parseHookEvent(
  hookType: string,
  payload: HookPayload,
  sessionTracker: Map<string, SessionState>
): ParsedEvent {
  const sessionId = payload.session_id || 'unknown'
  const state = getOrCreateSession(sessionTracker, sessionId)
  const id = nanoid()
  const timestamp = Date.now()

  let nodeType: ParsedEvent['nodeType']
  let label: string
  let content: string
  let toolName: string | undefined
  let parentAgentId: string | undefined = state.currentAgentId ?? undefined

  switch (hookType) {
    case 'PreToolUse': {
      toolName = payload.tool_name
      const input = payload.tool_input

      if (toolName === 'Task') {
        // Subagent spawn
        nodeType = 'agent'
        const subagentType = (input?.description as string) || (input?.prompt as string) || 'Subagent'
        const shortType = subagentType.length > 40 ? subagentType.slice(0, 40) + '...' : subagentType
        label = `Agent: ${shortType}`
        content = typeof input === 'object' ? JSON.stringify(input, null, 2) : String(input ?? '')
        // This node becomes the current agent context
        state.currentAgentId = id
      } else if (TOOL_ACTIONS.has(toolName ?? '')) {
        nodeType = 'action'
        label = toolName ?? 'Tool'
        content = formatToolInput(toolName!, input)
      } else {
        // Unknown tool, still an action
        nodeType = 'action'
        label = toolName ?? 'Unknown Tool'
        content = typeof input === 'object' ? JSON.stringify(input, null, 2) : String(input ?? '')
      }
      break
    }

    case 'PostToolUse': {
      toolName = payload.tool_name
      if (payload.error) {
        nodeType = 'error'
        label = `Error: ${toolName ?? 'Tool'}`
        content = payload.error
      } else {
        nodeType = 'result'
        label = `Result: ${toolName ?? 'Tool'}`
        content = payload.tool_result ?? ''
      }
      break
    }

    case 'Stop': {
      nodeType = 'result'
      label = 'Stop'
      content = payload.tool_result ?? (payload as Record<string, unknown>).stop_reason as string ?? 'Session stopped'
      // Clear agent context on stop
      state.currentAgentId = null
      break
    }

    case 'SubagentStop': {
      nodeType = 'result'
      label = 'Agent Complete'
      content = payload.tool_result ?? 'Subagent finished'
      // Pop agent context — return to parent
      state.currentAgentId = null
      break
    }

    default: {
      nodeType = 'thought'
      label = hookType
      content = JSON.stringify(payload, null, 2)
    }
  }

  const event: ParsedEvent = {
    id,
    source: 'hook',
    hookType,
    toolName,
    sessionId,
    timestamp,
    content: truncate(content, 2000),
    nodeType,
    label,
    parentAgentId,
  }

  state.lastNodeId = id
  return event
}

/**
 * Parse a JSONL session message into a ParsedEvent.
 */
export function parseSessionMessage(
  msg: SessionMessage,
  sessionId: string,
  sessionTracker: Map<string, SessionState>
): ParsedEvent | null {
  const state = getOrCreateSession(sessionTracker, sessionId)
  const id = nanoid()
  const timestamp = msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()

  let nodeType: ParsedEvent['nodeType']
  let label: string
  let content: string
  let toolName: string | undefined

  if (msg.role === 'user') {
    nodeType = 'prompt'
    label = 'User Prompt'
    content = extractTextContent(msg.content)
  } else if (msg.role === 'assistant') {
    // Check if content array contains tool_use
    if (Array.isArray(msg.content)) {
      const toolUse = msg.content.find((c): c is SessionContent => c.type === 'tool_use')
      if (toolUse) {
        nodeType = 'action'
        toolName = toolUse.name
        label = toolUse.name ?? 'Tool'
        content = typeof toolUse.input === 'object'
          ? JSON.stringify(toolUse.input, null, 2)
          : String(toolUse.input ?? '')
      } else {
        nodeType = 'thought'
        label = 'Thinking'
        content = extractTextContent(msg.content)
      }
    } else {
      nodeType = 'thought'
      label = 'Thinking'
      content = typeof msg.content === 'string' ? msg.content : ''
    }
  } else {
    // system messages — skip
    return null
  }

  const event: ParsedEvent = {
    id,
    source: 'watcher',
    sessionId,
    timestamp,
    content: truncate(content, 2000),
    nodeType,
    label,
    toolName,
    parentAgentId: state.currentAgentId ?? undefined,
  }

  state.lastNodeId = id
  return event
}

function getOrCreateSession(
  tracker: Map<string, SessionState>,
  sessionId: string
): SessionState {
  let state = tracker.get(sessionId)
  if (!state) {
    state = { lastNodeId: null, currentAgentId: null }
    tracker.set(sessionId, state)
  }
  return state
}

function extractTextContent(content: string | SessionContent[]): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((c) => c.type === 'text' && c.text)
      .map((c) => c.text!)
      .join('\n')
  }
  return ''
}

function formatToolInput(toolName: string, input: Record<string, unknown> | undefined): string {
  if (!input) return ''
  switch (toolName) {
    case 'Bash':
      return String(input.command ?? '')
    case 'Read':
      return String(input.file_path ?? input.path ?? '')
    case 'Write':
      return `${input.file_path ?? input.path ?? ''}\n${String(input.content ?? '').slice(0, 500)}`
    case 'Edit':
      return `${input.file_path ?? input.path ?? ''}\n- ${String(input.old_string ?? '').slice(0, 200)}\n+ ${String(input.new_string ?? '').slice(0, 200)}`
    case 'Grep':
      return `/${input.pattern ?? ''}/ in ${input.path ?? '.'}`
    case 'Glob':
      return `${input.pattern ?? '*'} in ${input.path ?? '.'}`
    default:
      return JSON.stringify(input, null, 2)
  }
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '...'
}
