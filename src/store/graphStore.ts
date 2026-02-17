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

    // Radial mindmap: first node at center, subsequent unparented nodes
    // at a random angle from center at increasing distance.
    let nx: number;
    let ny: number;

    if (partial.x != null && partial.y != null) {
      nx = partial.x;
      ny = partial.y;
    } else if (state.nodes.length === 0) {
      // First node goes at the center
      nx = 0;
      ny = 0;
    } else {
      // Subsequent nodes without a known parent: random angle from center
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + state.nodes.length * 20;
      nx = Math.cos(angle) * dist;
      ny = Math.sin(angle) * dist;
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

    // Radial layout: reposition target node outward from source,
    // fanning siblings apart around the source's angle from center.
    const newState = get();
    const newEdges = newState.edges;
    const siblingEdges = newEdges.filter(e => e.sourceId === partial.sourceId);
    const siblingIndex = siblingEdges.length - 1;
    const totalSiblings = siblingEdges.length;

    // Angle from center (0,0) to source node
    let sourceAngleFromCenter: number;
    const srcDist = Math.sqrt(sourceNode.x * sourceNode.x + sourceNode.y * sourceNode.y);
    if (srcDist < 1) {
      // Source is at or very near center — use a random angle
      sourceAngleFromCenter = Math.random() * Math.PI * 2;
    } else {
      sourceAngleFromCenter = Math.atan2(sourceNode.y, sourceNode.x);
    }

    // Fan children apart around the outward direction
    const fanOffset = (siblingIndex - (totalSiblings - 1) / 2) * 0.4;
    const childAngle = sourceAngleFromCenter + fanOffset;
    const dist = 100 + Math.random() * 20;
    const targetX = sourceNode.x + Math.cos(childAngle) * dist;
    const targetY = sourceNode.y + Math.sin(childAngle) * dist;

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
