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
 * Compute fade-in alpha: 0 → 1 over ~1 second from birthTime.
 */
function getFadeAlpha(node: NeuralNode): number {
  return Math.min(1, (performance.now() - node.birthTime) / 1000);
}

/**
 * Compute draw radius scaled by connectionCount (growth effect).
 */
function getGrowthRadius(baseRadius: number, connectionCount: number): number {
  return baseRadius * (1 + connectionCount * 0.08);
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
    const fadeAlpha = getFadeAlpha(node);
    const isThought = node.type === 'thought';
    const maxAlpha = isThought ? 0.35 : 1.0;
    const finalAlpha = fadeAlpha * maxAlpha;
    const growthScale = isThought ? 1.0 : (1 + node.connectionCount * 0.08);
    const glowR = config.glowRadius * growthScale;

    const grad = ctx.createRadialGradient(
      node.x, node.y, 0,
      node.x, node.y, glowR,
    );
    const alpha = Math.max(0, Math.min(1, 0.4 * node.glowIntensity)) * finalAlpha;
    grad.addColorStop(0, colorWithAlpha(node.color, alpha));
    grad.addColorStop(1, colorWithAlpha(node.color, 0));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
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
    const fadeAlpha = getFadeAlpha(node);
    const isThought = node.type === 'thought';
    const maxAlpha = isThought ? 0.35 : 1.0;
    const finalAlpha = fadeAlpha * maxAlpha;
    const growthScale = isThought ? 1.0 : getGrowthRadius(1, node.connectionCount);
    const baseRadius = node.radius * growthScale;
    const drawRadius = isSelected ? baseRadius * 1.2 : baseRadius;

    ctx.save();
    ctx.globalAlpha = finalAlpha;

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
      ctx.strokeStyle = node.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(node.x, node.y, drawRadius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
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

    const fadeAlpha = getFadeAlpha(node);
    ctx.globalAlpha = 0.08 * fadeAlpha;
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
 * Slower, subtler pulse for a calmer aesthetic.
 */
export function updateAnimations(nodes: NeuralNode[]): void {
  const now = performance.now();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.status === 'active') {
      // Subtler, slower pulse
      node.glowIntensity = 0.6 + 0.3 * Math.sin(now * 0.0015);
    } else if (node.status === 'completed') {
      // Barely breathing
      node.glowIntensity = 0.3 + 0.05 * Math.sin(now * 0.0005);
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
