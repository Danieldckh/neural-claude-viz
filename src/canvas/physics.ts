import type { NeuralNode, NeuralEdge } from '../types';

const REPULSION_STRENGTH = 800;
const ATTRACTION_STRENGTH = 0.01;
const GRAVITY_STRENGTH = 0.02;
const DAMPING = 0.92;
const MAX_VELOCITY = 4;
const AGENT_ORBIT_RADIUS = 80;
const MIN_DISTANCE = 20;

export function createPhysicsEngine() {
  let frameCount = 0;

  return function updatePhysics(nodes: NeuralNode[], edges: NeuralEdge[]): void {
    const len = nodes.length;
    if (len === 0) return;

    frameCount++;

    // Build id → node map for O(1) lookups
    const nodeMap = new Map<string, NeuralNode>();
    for (let i = 0; i < len; i++) {
      nodeMap.set(nodes[i].id, nodes[i]);
    }

    // --- Repulsion between all node pairs (inverse-square, capped) ---
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < MIN_DISTANCE * MIN_DISTANCE) {
          distSq = MIN_DISTANCE * MIN_DISTANCE;
        }
        const dist = Math.sqrt(distSq);
        const force = REPULSION_STRENGTH / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // --- Spring attraction along edges ---
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      const source = nodeMap.get(edge.sourceId);
      const target = nodeMap.get(edge.targetId);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const fx = dx * ATTRACTION_STRENGTH;
      const fy = dy * ATTRACTION_STRENGTH;

      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    // --- Gravity toward center (0,0) ---
    for (let i = 0; i < len; i++) {
      const node = nodes[i];
      node.vx -= node.x * GRAVITY_STRENGTH;
      node.vy -= node.y * GRAVITY_STRENGTH;
    }

    // --- Agent containment: children pulled toward parent ---
    for (let i = 0; i < len; i++) {
      const node = nodes[i];
      if (!node.parentAgentId) continue;

      const parent = nodeMap.get(node.parentAgentId);
      if (!parent) continue;

      const dx = node.x - parent.x;
      const dy = node.y - parent.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      if (dist > AGENT_ORBIT_RADIUS) {
        const overshoot = dist - AGENT_ORBIT_RADIUS;
        const pullStrength = 0.03;
        node.vx -= (dx / dist) * overshoot * pullStrength;
        node.vy -= (dy / dist) * overshoot * pullStrength;
      }
    }

    // --- Integrate: damping, velocity cap, position update ---
    for (let i = 0; i < len; i++) {
      const node = nodes[i];

      // Subtle Brownian drift every ~120 frames
      if (frameCount % 120 === 0) {
        node.vx += (Math.random() - 0.5) * 0.3;
        node.vy += (Math.random() - 0.5) * 0.3;
      }

      node.vx *= DAMPING;
      node.vy *= DAMPING;

      // Cap velocity
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > MAX_VELOCITY) {
        node.vx = (node.vx / speed) * MAX_VELOCITY;
        node.vy = (node.vy / speed) * MAX_VELOCITY;
      }

      node.x += node.vx;
      node.y += node.vy;
    }
  };
}

// Default instance for backward compatibility
export const updatePhysics = createPhysicsEngine();
