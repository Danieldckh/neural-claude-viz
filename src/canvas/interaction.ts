import type { NeuralNode, CameraTransform } from '../types';

/**
 * Convert screen (pixel) coordinates to world coordinates,
 * accounting for camera pan and zoom.
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: CameraTransform,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number } {
  const x = (screenX - canvasWidth / 2 - camera.x) / camera.scale;
  const y = (screenY - canvasHeight / 2 - camera.y) / camera.scale;
  return { x, y };
}

/**
 * Truncate a string to maxLen characters, appending "..." if truncated.
 */
function truncateLabel(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

/**
 * Draw labels beneath nodes.
 * - Thought nodes: no labels (too small, would clutter).
 * - Hovered/selected nodes: 11px, alpha 0.9, with dark background pill.
 * - All other nodes: 9px, alpha 0.4, text only (no background pill).
 * Labels are truncated to 20 characters.
 */
export function drawLabels(
  ctx: CanvasRenderingContext2D,
  nodes: NeuralNode[],
  hoveredNodeId: string | null,
  selectedNodeId: string | null,
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Skip thought nodes entirely -- labels would clutter tiny dots
    if (node.type === 'thought') continue;

    const rawLabel = node.label;
    if (!rawLabel) continue;

    const label = truncateLabel(rawLabel, 20);
    const isHighlighted = node.id === hoveredNodeId || node.id === selectedNodeId;

    ctx.save();

    if (isHighlighted) {
      // Prominent label with background pill
      ctx.font = '11px Inter, system-ui, sans-serif';
      const metrics = ctx.measureText(label);
      const textWidth = metrics.width;
      const textHeight = 14;
      const padX = 6;
      const padY = 4;
      const boxWidth = textWidth + padX * 2;
      const boxHeight = textHeight + padY * 2;
      const boxX = node.x - boxWidth / 2;
      const boxY = node.y + node.radius + 8;

      // Background pill
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#0a0a14';
      roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 4);
      ctx.fill();

      // Text
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, node.x, boxY + padY);
    } else {
      // Subtle always-visible label, no background
      ctx.font = '9px Inter, system-ui, sans-serif';
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, node.x, node.y + node.radius + 6);
    }

    ctx.restore();
  }
}

/**
 * Attach mouse/wheel/touch handlers for pan, zoom, and node interaction.
 * Returns a cleanup function that removes all listeners.
 */
export function setupInteraction(
  canvas: HTMLCanvasElement,
  getCamera: () => CameraTransform,
  setCamera: (partial: Partial<CameraTransform>) => void,
  getNodes: () => NeuralNode[],
  setSelected: (nodeId: string | null) => void,
  setHovered: (nodeId: string | null) => void,
  onUserInteraction?: () => void,
): () => void {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragMoved = false;

  // --- Wheel: zoom toward mouse ---
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    if (onUserInteraction) onUserInteraction();
    const camera = getCamera();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = 1 + e.deltaY * -0.001;
    const newScale = Math.max(0.3, Math.min(3.0, camera.scale * zoomFactor));
    const scaleRatio = newScale / camera.scale;

    // Zoom toward mouse position
    const cx = canvas.width / window.devicePixelRatio / 2;
    const cy = canvas.height / window.devicePixelRatio / 2;
    const worldMouseX = mouseX - cx;
    const worldMouseY = mouseY - cy;

    const newX = worldMouseX - scaleRatio * (worldMouseX - camera.x);
    const newY = worldMouseY - scaleRatio * (worldMouseY - camera.y);

    setCamera({ x: newX, y: newY, scale: newScale });
  }

  // --- Mouse down: start potential drag ---
  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    if (onUserInteraction) onUserInteraction();
    isDragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
  }

  // --- Mouse move: drag to pan or hover hit-test ---
  function onMouseMove(e: MouseEvent) {
    if (isDragging) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragMoved = true;
      }

      if (dragMoved) {
        const camera = getCamera();
        setCamera({
          x: camera.x + dx,
          y: camera.y + dy,
        });
        dragStartX = e.clientX;
        dragStartY = e.clientY;
      }
    } else {
      // Hover hit-test
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const camera = getCamera();
      const cw = canvas.width / window.devicePixelRatio;
      const ch = canvas.height / window.devicePixelRatio;
      const world = screenToWorld(mouseX, mouseY, camera, cw, ch);
      const hit = hitTestNodes(world.x, world.y, getNodes());
      setHovered(hit ? hit.id : null);
      canvas.style.cursor = hit ? 'pointer' : 'grab';
    }
  }

  // --- Mouse up: end drag or click ---
  function onMouseUp(e: MouseEvent) {
    if (e.button !== 0) return;

    if (!dragMoved) {
      // Click: select node or deselect
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const camera = getCamera();
      const cw = canvas.width / window.devicePixelRatio;
      const ch = canvas.height / window.devicePixelRatio;
      const world = screenToWorld(mouseX, mouseY, camera, cw, ch);
      const hit = hitTestNodes(world.x, world.y, getNodes());
      setSelected(hit ? hit.id : null);
    }

    isDragging = false;
    dragMoved = false;
  }

  // --- Mouse leave: reset drag state ---
  function onMouseLeave() {
    isDragging = false;
    dragMoved = false;
    setHovered(null);
  }

  // Attach listeners
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseLeave);

  // Return cleanup
  return () => {
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('mouseleave', onMouseLeave);
  };
}

/**
 * Find the first node under the given world coordinates.
 */
function hitTestNodes(
  worldX: number,
  worldY: number,
  nodes: NeuralNode[],
): NeuralNode | null {
  // Iterate in reverse so top-drawn nodes are hit first
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const dx = worldX - node.x;
    const dy = worldY - node.y;
    const hitRadius = node.radius + 4;
    if (dx * dx + dy * dy <= hitRadius * hitRadius) {
      return node;
    }
  }
  return null;
}

/**
 * Draw a rounded rectangle path (utility for label backgrounds).
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
