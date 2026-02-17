import type { NeuralNode, NeuralEdge, Particle, CameraTransform } from '../types';
import { COLORS } from '../types';
import { drawEdges } from './edges';
import { drawAgentRings, drawNodeGlows, drawNodes } from './nodes';
import { drawParticles, drawAmbientParticles } from './particles';
import { drawLabels } from './interaction';

/**
 * Main render function -- called once per animation frame.
 * Clears the canvas, applies camera transform, and draws all layers in order.
 */
export function render(
  ctx: CanvasRenderingContext2D,
  nodes: NeuralNode[],
  edges: NeuralEdge[],
  particles: Particle[],
  camera: CameraTransform,
  selectedNodeId: string | null,
  hoveredNodeId: string | null,
  canvasWidth: number,
  canvasHeight: number,
): void {
  ctx.save();

  // --- Clear with background ---
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // --- Subtle radial gradient from center (ambient glow) ---
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const gradRadius = Math.max(canvasWidth, canvasHeight) * 0.5;
  const ambientGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, gradRadius);
  ambientGrad.addColorStop(0, 'rgba(10, 10, 30, 0.2)');
  ambientGrad.addColorStop(1, 'rgba(6, 6, 15, 0)');
  ctx.fillStyle = ambientGrad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // --- Apply camera transform ---
  // Center origin, then pan and scale
  ctx.setTransform(
    camera.scale, 0,
    0, camera.scale,
    cx + camera.x,
    cy + camera.y,
  );

  // --- Draw layers (back to front) ---
  drawAmbientParticles(ctx, canvasWidth, canvasHeight);
  drawEdges(ctx, edges, nodes);
  drawAgentRings(ctx, nodes);
  drawNodeGlows(ctx, nodes);
  drawNodes(ctx, nodes, selectedNodeId);
  drawParticles(ctx, particles);
  drawLabels(ctx, nodes, hoveredNodeId, selectedNodeId);

  ctx.restore();
}
