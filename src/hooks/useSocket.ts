import { useEffect, useRef, useCallback } from 'react';
import { useGraphStore } from '../store/graphStore';
import type { WSMessage, NeuralNode, EventLogEntry } from '../types';
import { NODE_CONFIG } from '../types';

function spawnBurstParticles(x: number, y: number, color: string) {
  const particles = [];
  const count = 14 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    particles.push({
      x, y,
      vx: Math.cos(angle) * (2 + Math.random() * 2),
      vy: Math.sin(angle) * (2 + Math.random() * 2),
      life: 1.0,
      color,
      radius: 2 + Math.random() * 2,
    });
  }
  return particles;
}

export function useSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const reconnectDelay = useRef(1000);
  const isMountedRef = useRef(true);

  const { addNode, updateNode, addEdge, addParticles, addEventLog, setConnected } = useGraphStore();

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}://${host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectDelay.current = 1000;
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      if (!isMountedRef.current) return;
      // Exponential backoff reconnect
      reconnectTimeout.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        handleMessage(msg);
      } catch {
        // Ignore malformed messages
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMessage = useCallback((msg: WSMessage) => {
    switch (msg.type) {
      case 'node_add': {
        const data = msg.payload as {
          id: string;
          type: NeuralNode['type'];
          label: string;
          content: string;
          toolName?: string;
          parentAgentId?: string;
          status?: NeuralNode['status'];
        };
        const config = NODE_CONFIG[data.type];
        if (!config) break;

        addNode({
          id: data.id,
          type: data.type,
          label: data.label,
          content: data.content,
          toolName: data.toolName,
          parentAgentId: data.parentAgentId,
          timestamp: Date.now(),
          status: data.status || 'active',
        });

        // Spawn particle burst
        const state = useGraphStore.getState();
        const node = state.nodes.find(n => n.id === data.id);
        if (node) {
          addParticles(spawnBurstParticles(node.x, node.y, config.color));
        }
        break;
      }

      case 'node_update': {
        const data = msg.payload as { id: string } & Partial<NeuralNode>;
        updateNode(data.id, data);
        break;
      }

      case 'edge_add': {
        const data = msg.payload as { id: string; sourceId: string; targetId: string; color: string };
        addEdge(data);
        break;
      }

      case 'event_log': {
        const entry = msg.payload as EventLogEntry;
        addEventLog(entry);
        break;
      }

      case 'session_start': {
        // Could clear graph or handle new session
        break;
      }

      case 'ping':
        break;
    }
  }, [addNode, updateNode, addEdge, addParticles, addEventLog]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();
    return () => {
      isMountedRef.current = false;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);
}
