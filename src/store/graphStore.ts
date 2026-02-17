import { create } from 'zustand';
import type { NeuralNode, NeuralEdge, Particle, EventLogEntry, CameraTransform } from '../types';
import { NODE_CONFIG } from '../types';

interface GraphState {
  nodes: NeuralNode[];
  edges: NeuralEdge[];
  particles: Particle[];
  eventLog: EventLogEntry[];
  selectedNodeId: string | null;
  camera: CameraTransform;
  connected: boolean;

  // Actions
  addNode: (node: Omit<NeuralNode, 'x' | 'y' | 'vx' | 'vy' | 'radius' | 'color' | 'glowIntensity' | 'birthTime' | 'connectionCount'> & { x?: number; y?: number }) => void;
  updateNode: (id: string, updates: Partial<NeuralNode>) => void;
  addEdge: (edge: Omit<NeuralEdge, 'pulsePosition' | 'active' | 'createdAt'>) => void;
  addParticles: (newParticles: Particle[]) => void;
  setParticles: (particles: Particle[]) => void;
  addEventLog: (entry: EventLogEntry) => void;
  setSelected: (nodeId: string | null) => void;
  setCamera: (camera: Partial<CameraTransform>) => void;
  setConnected: (connected: boolean) => void;

  // Selectors
  getNodeById: (id: string) => NeuralNode | undefined;
  getEdgesByNode: (nodeId: string) => NeuralEdge[];
  getAgentChildren: (agentId: string) => NeuralNode[];
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  particles: [],
  eventLog: [],
  selectedNodeId: null,
  camera: { x: 0, y: 0, scale: 1 },
  connected: false,

  addNode: (partial) => {
    const config = NODE_CONFIG[partial.type];
    const state = get();

    // Default position: off-screen placeholder; addEdge will reposition
    // when the connecting edge arrives, creating proper branching layout.
    // If explicit x/y provided, use them. Otherwise place root nodes
    // left-to-right and child nodes off-screen until their edge arrives.
    let nx: number;
    let ny: number;

    if (partial.x != null && partial.y != null) {
      nx = partial.x;
      ny = partial.y;
    } else {
      // Placeholder — will be repositioned by addEdge
      nx = state.nodes.length * 140;
      ny = 0;
    }

    const node: NeuralNode = {
      ...partial,
      x: nx,
      y: ny,
      vx: 0,
      vy: 0,
      radius: config.radius,
      color: config.color,
      glowIntensity: 1,
      birthTime: performance.now(),
      connectionCount: 0,
    };

    set(state => ({ nodes: [...state.nodes, node] }));
  },

  updateNode: (id, updates) => {
    set(state => ({
      nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates } : n),
    }));
  },

  addEdge: (partial) => {
    const sourceNode = get().nodes.find(n => n.id === partial.sourceId);
    const targetNode = get().nodes.find(n => n.id === partial.targetId);
    if (!sourceNode || !targetNode) return;

    const edge: NeuralEdge = {
      ...partial,
      pulsePosition: 0,
      active: true,
      createdAt: Date.now(),
    };

    // First, add the edge and increment connectionCount on source
    set(state => ({
      edges: [...state.edges, edge],
      nodes: state.nodes.map(n =>
        n.id === partial.sourceId
          ? { ...n, connectionCount: n.connectionCount + 1 }
          : n,
      ),
    }));

    // Reposition the target node to branch off the source node.
    // Count how many edges share this source (including the one just added)
    // to fan children out vertically.
    const state = get();
    const siblingEdges = state.edges.filter(e => e.sourceId === partial.sourceId);
    const siblingIndex = siblingEdges.length - 1; // index of the edge just added
    const totalSiblings = siblingEdges.length;

    const targetX = sourceNode.x + 140;
    const targetY = sourceNode.y + (siblingIndex - (totalSiblings - 1) / 2) * 60;

    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === partial.targetId
          ? { ...n, x: targetX, y: targetY }
          : n,
      ),
    }));
  },

  addParticles: (newParticles) => {
    set(state => ({ particles: [...state.particles, ...newParticles] }));
  },

  setParticles: (particles) => {
    set({ particles });
  },

  addEventLog: (entry) => {
    set(state => ({ eventLog: [...state.eventLog, entry] }));
  },

  setSelected: (nodeId) => set({ selectedNodeId: nodeId }),

  setCamera: (partial) => {
    set(state => ({ camera: { ...state.camera, ...partial } }));
  },

  setConnected: (connected) => set({ connected }),

  // Selectors
  getNodeById: (id) => get().nodes.find(n => n.id === id),
  getEdgesByNode: (nodeId) => get().edges.filter(e => e.sourceId === nodeId || e.targetId === nodeId),
  getAgentChildren: (agentId) => get().nodes.filter(n => n.parentAgentId === agentId),
}));
