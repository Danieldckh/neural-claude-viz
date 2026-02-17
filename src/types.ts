// Node in the neural graph
export interface NeuralNode {
  id: string;
  type: 'prompt' | 'thought' | 'action' | 'agent' | 'result' | 'error';
  label: string;
  content: string;
  toolName?: string;
  timestamp: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowIntensity: number;
  parentAgentId?: string;
  status: 'active' | 'completed' | 'pending';
  birthTime: number;
  connectionCount: number;
}

// Edge connecting two nodes
export interface NeuralEdge {
  id: string;
  sourceId: string;
  targetId: string;
  color: string;
  pulsePosition: number;
  active: boolean;
  createdAt: number;
}

// Particle for burst/trail effects
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  radius: number;
}

// WebSocket message from server to client
export interface WSMessage {
  type: 'node_add' | 'node_update' | 'edge_add' | 'event_log' | 'session_start' | 'ping';
  payload: unknown;
}

// Normalized event from hooks or file watcher
export interface NeuralEvent {
  id: string;
  source: 'hook' | 'watcher';
  hookType?: 'PreToolUse' | 'PostToolUse' | 'Stop' | 'SubagentStop';
  toolName?: string;
  sessionId: string;
  timestamp: number;
  content: string;
  nodeType: NeuralNode['type'];
}

// Color constants
export const COLORS = {
  background: '#06060f',
  grid: '#0d1117',
  thought: '#00d4ff',
  action: '#00ff88',
  prompt: '#bb86fc',
  agent: '#ff9800',
  result: '#ff4081',
  error: '#ff1744',
  pulse: '#ffffff',
  panelBg: '#0a0a14',
  border: '#1a1a2e',
} as const;

// Node config by type
export const NODE_CONFIG: Record<NeuralNode['type'], { radius: number; glowRadius: number; color: string; ring: boolean }> = {
  prompt:  { radius: 12, glowRadius: 24, color: COLORS.prompt,  ring: false },
  thought: { radius: 3,  glowRadius: 6,  color: COLORS.thought, ring: false },
  action:  { radius: 8,  glowRadius: 16, color: COLORS.action,  ring: false },
  agent:   { radius: 22, glowRadius: 40, color: COLORS.agent,   ring: true  },
  result:  { radius: 6,  glowRadius: 14, color: COLORS.result,  ring: false },
  error:   { radius: 7,  glowRadius: 16, color: COLORS.error,   ring: false },
};

// Camera transform for canvas
export interface CameraTransform {
  x: number;
  y: number;
  scale: number;
}

// Event log entry for text panel
export interface EventLogEntry {
  id: string;
  nodeId: string;
  nodeType: NeuralNode['type'];
  label: string;
  content: string;
  timestamp: number;
}
