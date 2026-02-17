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
    // Position to the RIGHT of parent for tree layout
    const parentNode = partial.parentAgentId
      ? state.nodes.find(n => n.id === partial.parentAgentId)
      : state.nodes[state.nodes.length - 1];

    let nx: number;
    let ny: number;

    if (partial.x != null && partial.y != null) {
      nx = partial.x;
      ny = partial.y;
    } else if (parentNode) {
      // Count how many children this parent already has (for vertical stagger)
      const siblingCount = state.nodes.filter(
        n => n.parentAgentId === (partial.parentAgentId ?? parentNode.id),
      ).length;
      // Place to the right, fan children vertically
      nx = parentNode.x + 120;
      ny = parentNode.y + (siblingCount - (siblingCount > 0 ? (siblingCount - 1) / 2 : 0)) * 50;
    } else {
      // First node or no parent — place near center, staggered by index
      nx = state.nodes.length * 120;
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

    set(state => ({
      edges: [...state.edges, edge],
      // Increment connectionCount on the source node
      nodes: state.nodes.map(n =>
        n.id === partial.sourceId
          ? { ...n, connectionCount: n.connectionCount + 1 }
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
