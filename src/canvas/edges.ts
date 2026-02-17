import type { NeuralNode, NeuralEdge } from '../types';

/**
 * Draw all edges as gradient lines between connected nodes.
 * Active edges show a traveling pulse dot.
 */
export function drawEdges(
  ctx: CanvasRenderingContext2D,
  edges: NeuralEdge[],
  nodes: NeuralNode[],
): void {
  // Build a lookup map for fast node access
  const nodeMap = new Map<string, NeuralNode>();
  for (let i = 0; i < nodes.length; i++) {
    nodeMap.set(nodes[i].id, nodes[i]);
  }

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const source = nodeMap.get(edge.sourceId);
    const target = nodeMap.get(edge.targetId);
    if (!source || !target) continue;

    const isActive = edge.active;

    // Gradient from source color to target color
    const grad = ctx.createLinearGradient(
      source.x, source.y,
      target.x, target.y,
    );
    grad.addColorStop(0, source.color);
    grad.addColorStop(1, target.color);

    ctx.save();
    ctx.globalAlpha = isActive ? 0.9 : 0.6;
    ctx.strokeStyle = grad;
    ctx.lineWidth = isActive ? 2.5 : 1.5;

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.restore();

    // Pulse dot on active edges
    if (isActive) {
      const t = edge.pulsePosition;
      const px = source.x + (target.x - source.x) * t;
      const py = source.y + (target.y - source.y) * t;

      // Glow
      ctx.save();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Advance pulse
      edge.pulsePosition += 0.016;
      if (edge.pulsePosition > 1) {
        edge.active = false;
        edge.pulsePosition = 0;
      }
    }
  }
}
