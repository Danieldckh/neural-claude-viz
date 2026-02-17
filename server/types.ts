// Hook payload from Claude Code stdin
export interface HookPayload {
  hook_type: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_result?: string;
  session_id: string;
  error?: string;
  // Additional fields from Claude Code hooks
  [key: string]: unknown;
}

// JSONL session message
export interface SessionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | SessionContent[];
  type?: string;
  timestamp?: string;
}

export interface SessionContent {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
}

// Bridge payload from local machine
export interface BridgePayload {
  sessionId: string;
  messages: SessionMessage[];
}

// Internal event before broadcasting
export interface ParsedEvent {
  id: string;
  source: 'hook' | 'watcher' | 'bridge';
  hookType?: string;
  toolName?: string;
  sessionId: string;
  timestamp: number;
  content: string;
  nodeType: 'prompt' | 'thought' | 'action' | 'agent' | 'result' | 'error';
  label: string;
  parentAgentId?: string;
}
