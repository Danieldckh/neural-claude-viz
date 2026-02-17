import type { NeuralNode } from '../types';
import { NODE_CONFIG } from '../types';

/**
 * Lighten a hex color by a percentage (0-100).
 * Returns a hex string.
 */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * percent / 100));
  return `rgb(${r},${g},${b})`;
}

/**
 * Draw soft radial glow behind each node.
 */
export function drawNodeGlows(
  ctx: CanvasRenderingContext2D,
  nodes: NeuralNode[],
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const config = NODE_CONFIG[node.type];
    const grad = ctx.createRadialGradient(
      node.x, node.y, 0,
      node.x, node.y, config.glowRadius,
    );
    const alpha = Math.max(0, Math.min(1, 0.4 * node.glowIntensity));
    grad.addColorStop(0, colorWithAlpha(node.color, alpha));
    grad.addColorStop(1, colorWithAlpha(node.color, 0));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(node.x, node.y, config.glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw solid node circles, borders, and selection indicators.
 */
export function drawNodes(
  ctx: CanvasRenderingContext2D,
  nodes: NeuralNode[],
  selectedNodeId: string | null,
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isSelected = node.id === selectedNodeId;
    const drawRadius = isSelected ? node.radius * 1.2 : node.radius;

    // Selected: extra bright glow
    if (isSelected) {
      ctx.shadowColor = node.color;
      ctx.shadowBlur = 20;
    }

    // Solid fill
    ctx.fillStyle = node.color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, drawRadius, 0, Math.PI * 2);
    ctx.fill();

    // 1px lighter border
    ctx.strokeStyle = lightenColor(node.color, 30);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(node.x, node.y, drawRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Agent type: dashed outer ring
    if (node.type === 'agent') {
      ctx.save();
      ctx.strokeStyle = node.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(node.x, node.y, drawRadius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (isSelected) {
      ctx.shadowBlur = 0;
    }
  }
}

/**
 * Draw faint orbital circles around agent nodes.
 */
export function drawAgentRings(
  ctx: CanvasRenderingContext2D,
  nodes: NeuralNode[],
): void {
  const prevAlpha = ctx.globalAlpha;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type !== 'agent') continue;

    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = node.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(node.x, node.y, 80, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = prevAlpha;
}

/**
 * Update glow animation intensities based on node status.
 */
export function updateAnimations(nodes: NeuralNode[]): void {
  const now = performance.now();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.status === 'active') {
      node.glowIntensity = 0.5 + 0.5 * Math.sin(now * 0.004);
    } else if (node.status === 'completed') {
      node.glowIntensity = 0.2 + 0.1 * Math.sin(now * 0.001);
    } else {
      // pending
      node.glowIntensity = 0.15;
    }
  }
}

/**
 * Convert a hex color to rgba with given alpha.
 */
function colorWithAlpha(hex: string, alpha: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}
