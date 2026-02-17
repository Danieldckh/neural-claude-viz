import { useState, useCallback, useRef, useEffect } from 'react';
import { useGraphStore } from './store/graphStore';
import { useSocket } from './hooks/useSocket';
import NeuralCanvas from './canvas/NeuralCanvas';
import TextPanel from './panel/TextPanel';
import { COLORS, NODE_CONFIG } from './types';
import type { NeuralNode } from './types';

let demoCounter = 0;
const DEMO_SEQUENCE: { type: NeuralNode['type']; label: string; content: string; toolName?: string }[] = [
  { type: 'prompt', label: 'User Prompt', content: 'Fix the authentication bug in the login flow' },
  { type: 'thought', label: 'Thinking', content: 'I need to investigate the auth middleware and check token validation...' },
  { type: 'action', label: 'Read', content: 'src/middleware/auth.ts', toolName: 'Read' },
  { type: 'result', label: 'Result: Read', content: 'export function validateToken(token: string) { ... }' },
  { type: 'action', label: 'Grep', content: '/token.*expired/ in src/', toolName: 'Grep' },
  { type: 'thought', label: 'Thinking', content: 'Found the issue - token expiry check uses wrong comparison operator' },
  { type: 'agent', label: 'Agent: code-reviewer', content: 'Reviewing the proposed fix for security implications...' },
  { type: 'action', label: 'Edit', content: 'src/middleware/auth.ts\n- if (expiry > Date.now())\n+ if (expiry < Date.now())', toolName: 'Edit' },
  { type: 'result', label: 'Result: Edit', content: 'File updated successfully' },
  { type: 'action', label: 'Bash', content: 'npm test -- --grep "auth"', toolName: 'Bash' },
  { type: 'result', label: 'Result: Bash', content: 'All 12 auth tests passing' },
  { type: 'error', label: 'Error: Lint', content: 'ESLint: Unused import on line 3' },
  { type: 'action', label: 'Edit', content: 'Remove unused import', toolName: 'Edit' },
  { type: 'result', label: 'Result: Edit', content: 'Fixed lint error' },
];

function injectDemoEvent() {
  const store = useGraphStore.getState();
  const seq = DEMO_SEQUENCE[demoCounter % DEMO_SEQUENCE.length];
  const id = `demo-${Date.now()}-${demoCounter}`;
  const config = NODE_CONFIG[seq.type];

  const lastNode = store.nodes[store.nodes.length - 1];

  store.addNode({
    id,
    type: seq.type,
    label: seq.label,
    content: seq.content,
    toolName: seq.toolName,
    timestamp: Date.now(),
    status: 'active',
  });

  if (lastNode) {
    store.addEdge({
      id: `edge-${id}`,
      sourceId: lastNode.id,
      targetId: id,
      color: config.color,
    });
  }

  store.addEventLog({
    id: `log-${id}`,
    nodeId: id,
    nodeType: seq.type,
    label: seq.label,
    content: seq.content,
    timestamp: Date.now(),
  });

  demoCounter++;
}

const MIN_CANVAS_WIDTH = 300;
const MIN_PANEL_WIDTH = 200;

export default function App() {
  useSocket();

  const connected = useGraphStore(s => s.connected);

  const [splitRatio, setSplitRatio] = useState(0.65);
  const [isDragging, setIsDragging] = useState(false);
  const [handleHovered, setHandleHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const totalWidth = rect.width;
      const x = e.clientX - rect.left;

      const minLeft = MIN_CANVAS_WIDTH / totalWidth;
      const maxLeft = 1 - MIN_PANEL_WIDTH / totalWidth;
      const ratio = Math.max(minLeft, Math.min(maxLeft, x / totalWidth));
      setSplitRatio(ratio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const leftPercent = `${splitRatio * 100}%`;
  const rightPercent = `${(1 - splitRatio) * 100}%`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: COLORS.background,
      }}
    >
      {/* Header bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '40px',
          minHeight: '40px',
          padding: '0 14px',
          background: COLORS.panelBg,
          borderBottom: `1px solid ${COLORS.border}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '14px',
            fontWeight: 600,
            color: COLORS.prompt,
            letterSpacing: '-0.01em',
          }}
        >
          Neural Claude Viz
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={injectDemoEvent}
            style={{
              border: `1px solid ${COLORS.border}`,
              background: 'transparent',
              color: '#999',
              fontSize: '10px',
              padding: '3px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Demo Event
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: connected ? '#00ff88' : '#ff1744',
                boxShadow: connected
                  ? '0 0 6px #00ff8866'
                  : '0 0 6px #ff174466',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '11px',
                color: '#555',
              }}
            >
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Split pane container */}
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          cursor: isDragging ? 'col-resize' : undefined,
          userSelect: isDragging ? 'none' : undefined,
        }}
      >
        {/* Left pane: Canvas */}
        <div
          style={{
            width: leftPercent,
            height: '100%',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <NeuralCanvas />
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setHandleHovered(true)}
          onMouseLeave={() => setHandleHovered(false)}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panes"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setSplitRatio(prev => Math.max(MIN_CANVAS_WIDTH / window.innerWidth, prev - 0.02));
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setSplitRatio(prev => Math.min(1 - MIN_PANEL_WIDTH / window.innerWidth, prev + 0.02));
            }
          }}
          style={{
            width: '4px',
            cursor: 'col-resize',
            background: isDragging || handleHovered ? COLORS.prompt : COLORS.border,
            transition: isDragging ? 'none' : 'background 0.15s ease',
            flexShrink: 0,
            zIndex: 10,
          }}
        />

        {/* Right pane: Text Panel */}
        <div
          style={{
            width: rightPercent,
            height: '100%',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <TextPanel />
        </div>
      </div>
    </div>
  );
}
