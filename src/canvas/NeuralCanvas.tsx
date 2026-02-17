import { useRef, useEffect, useState, useCallback } from 'react';
import { useGraphStore } from '../store/graphStore';
import type { CameraTransform } from '../types';
import { render } from './renderer';
import { updatePhysics } from './physics';
import { updateAnimations } from './nodes';
import { updateParticles } from './particles';
import { setupInteraction } from './interaction';

/**
 * Full-screen 2D canvas that renders the neural graph visualization.
 * Handles DPI scaling, resize, animation loop, physics, and user interaction.
 */
export default function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const cleanupInteractionRef = useRef<(() => void) | null>(null);
  const lastUserInteractionRef = useRef<number>(0);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);

  // Stable reference getters for interaction callbacks (avoid re-attaching listeners)
  const storeRef = useRef(useGraphStore.getState());
  useEffect(() => {
    return useGraphStore.subscribe((state) => {
      storeRef.current = state;
    });
  }, []);

  const getCamera = useCallback(() => storeRef.current.camera, []);
  const getNodes = useCallback(() => storeRef.current.nodes, []);
  const setCamera = useCallback((partial: Partial<CameraTransform>) => {
    useGraphStore.getState().setCamera(partial);
  }, []);
  const setSelected = useCallback((id: string | null) => {
    useGraphStore.getState().setSelected(id);
  }, []);
  const setHovered = useCallback((id: string | null) => {
    setHoveredNodeId(id);
    hoveredNodeIdRef.current = id;
  }, []);

  const onUserInteraction = useCallback(() => {
    lastUserInteractionRef.current = performance.now();
  }, []);

  // --- Resize handler: match canvas to container, handle DPI ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    function resizeCanvas() {
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(container);
    resizeCanvas();

    return () => {
      observer.disconnect();
    };
  }, []);

  // --- Interaction setup ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    cleanupInteractionRef.current = setupInteraction(
      canvas,
      getCamera,
      setCamera,
      getNodes,
      setSelected,
      setHovered,
      onUserInteraction,
    );

    return () => {
      if (cleanupInteractionRef.current) {
        cleanupInteractionRef.current();
        cleanupInteractionRef.current = null;
      }
    };
  }, [getCamera, setCamera, getNodes, setSelected, setHovered, onUserInteraction]);

  // --- Animation loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function frame() {
      const ctx = canvas!.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const state = useGraphStore.getState();
      const { nodes, edges, particles, camera, selectedNodeId } = state;
      const dpr = window.devicePixelRatio || 1;
      const cw = canvas!.width / dpr;
      const ch = canvas!.height / dpr;

      // Physics & animation updates (mutate in place for performance)
      updatePhysics(nodes, edges);
      updateAnimations(nodes);

      // Particle update returns new array (filters dead)
      const updatedParticles = updateParticles(particles);
      if (updatedParticles.length !== particles.length) {
        state.setParticles(updatedParticles);
      }

      // Render
      render(ctx, nodes, edges, updatedParticles, camera, selectedNodeId, hoveredNodeIdRef.current, cw, ch);

      // Auto-camera: zoom out to fit all nodes in a radial mindmap
      if (nodes.length > 0) {
        const timeSinceInteraction = performance.now() - lastUserInteractionRef.current;
        if (timeSinceInteraction > 3000) {
          // Find the farthest node from center
          let maxDist = 0;
          for (let i = 0; i < nodes.length; i++) {
            const d = Math.sqrt(nodes[i].x * nodes[i].x + nodes[i].y * nodes[i].y);
            if (d > maxDist) maxDist = d;
          }
          // Check if farthest node exceeds 80% of the canvas half-size in screen space
          const canvasHalf = Math.min(cw, ch) / 2;
          const screenDist = maxDist * camera.scale;
          if (screenDist > canvasHalf * 0.8 && camera.scale > 0.2) {
            state.setCamera({ scale: camera.scale - 0.001 });
          }
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#06060f',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
        aria-label="Neural graph visualization canvas"
        role="img"
      />
    </div>
  );
}
