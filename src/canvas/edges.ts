import type { NeuralNode, NeuralEdge } from '../types';

/**
 * Draw all edges as curved bezier lines between connected nodes.
 * Sibling edges from the same source fan out with perpendicular offsets.
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

  // Group edges by sourceId to compute sibling indices for fan-out
  const siblingGroups = new Map<string, NeuralEdge[]>();
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const group = siblingGroups.get(edge.sourceId);
    if (group) {
      group.push(edge);
    } else {
      siblingGroups.set(edge.sourceId, [edge]);
    }
  }

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const source = nodeMap.get(edge.sourceId);
    const target = nodeMap.get(edge.targetId);
    if (!source || !target) continue;

    const isActive = edge.active;

    // Compute fade-in alpha from source and target birthTime
    const sourceFade = Math.min(1, (performance.now() - source.birthTime) / 1000);
    const targetFade = Math.min(1, (performance.now() - target.birthTime) / 1000);
    const edgeFade = Math.min(sourceFade, targetFade);

    // Compute bezier control point offset for sibling fan-out
    const siblings = siblingGroups.get(edge.sourceId) ?? [edge];
    const siblingCount = siblings.length;
    const edgeIndex = siblings.indexOf(edge);
    const perpOffset = (edgeIndex - (siblingCount - 1) / 2) * 30;

    // Direction vector from source to target
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Perpendicular unit vector (rotated 90 degrees)
    const perpX = -dy / dist;
    const perpY = dx / dist;

    // Control point at midpoint, offset perpendicular
    const mx = (source.x + target.x) / 2 + perpX * perpOffset;
    const my = (source.y + target.y) / 2 + perpY * perpOffset;

    // Gradient from source color to target color
    const grad = ctx.createLinearGradient(
      source.x, source.y,
      target.x, target.y,
    );
    grad.addColorStop(0, source.color);
    grad.addColorStop(1, target.color);

    const isThoughtEdge = target.type === 'thought';

    ctx.save();
    ctx.globalAlpha = isThoughtEdge
      ? 0.15 * edgeFade
      : (isActive ? 0.6 : 0.3) * edgeFade;
    ctx.strokeStyle = grad;
    ctx.lineWidth = isThoughtEdge ? 0.5 : (isActive ? 1.5 : 0.8);

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.quadraticCurveTo(mx, my, target.x, target.y);
    ctx.stroke();
    ctx.restore();

    // Pulse dot on active edges (follows curve)
    if (isActive) {
      const t = edge.pulsePosition;
      // Quadratic bezier interpolation: B(t) = (1-t)^2*P0 + 2(1-t)*t*P1 + t^2*P2
      const oneMinusT = 1 - t;
      const px = oneMinusT * oneMinusT * source.x + 2 * oneMinusT * t * mx + t * t * target.x;
      const py = oneMinusT * oneMinusT * source.y + 2 * oneMinusT * t * my + t * t * target.y;

      ctx.save();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.globalAlpha = 0.8 * edgeFade;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Advance pulse (slower)
      edge.pulsePosition += 0.008;
      if (edge.pulsePosition > 1) {
        edge.active = false;
        edge.pulsePosition = 0;
      }
    }
  }
}
