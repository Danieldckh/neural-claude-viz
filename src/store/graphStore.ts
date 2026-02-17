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
  addNode: (node: Omit<NeuralNode, 'x' | 'y' | 'vx' | 'vy' | 'radius' | 'color' | 'glowIntensity'> & { x?: number; y?: number }) => void;
  updateNode: (id: string, updates: Partial<NeuralNode>) => void;
  addEdge: (edge: Omit<NeuralEdge, 'pulsePosition' | 'active' | 'createdAt'>) => void;
  addParticles: (newParticles: Particle[]) => void;
  setParticles: (particles: Particle[]) => void;
  addEventLog: (entry: EventLogEntry) => void;
  setSelected: (nodeId: string | null) => void;
  setCamera: (camera: Partial<CameraTransform>) => void;
  setConnected: (connected: boolean) => void;
  clearGraph: () => void;

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
    // Position near parent or scatter from center
    const parentNode = partial.parentAgentId
      ? state.nodes.find(n => n.id === partial.parentAgentId)
      : state.nodes[state.nodes.length - 1];

    const angle = Math.random() * Math.PI * 2;
    const dist = partial.parentAgentId ? 60 + Math.random() * 40 : 80 + Math.random() * 60;

    const node: NeuralNode = {
      ...partial,
      x: partial.x ?? (parentNode ? parentNode.x + Math.cos(angle) * dist : (Math.random() - 0.5) * 400),
      y: partial.y ?? (parentNode ? parentNode.y + Math.sin(angle) * dist : (Math.random() - 0.5) * 400),
      vx: 0,
      vy: 0,
      radius: config.radius,
      color: config.color,
      glowIntensity: 1,
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

    set(state => ({ edges: [...state.edges, edge] }));
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

  clearGraph: () => set({ nodes: [], edges: [], particles: [], eventLog: [], selectedNodeId: null }),

  // Selectors
  getNodeById: (id) => get().nodes.find(n => n.id === id),
  getEdgesByNode: (nodeId) => get().edges.filter(e => e.sourceId === nodeId || e.targetId === nodeId),
  getAgentChildren: (agentId) => get().nodes.filter(n => n.parentAgentId === agentId),
}));
