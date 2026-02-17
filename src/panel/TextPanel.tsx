import { useRef, useEffect, useCallback, useState } from 'react';
import { useGraphStore } from '../store/graphStore';
import { COLORS } from '../types';
import type { NeuralNode } from '../types';
import EventEntry from './EventEntry';

const nodeTypes: NeuralNode['type'][] = ['prompt', 'thought', 'action', 'agent', 'result', 'error'];

const typeColorMap: Record<NeuralNode['type'], string> = {
  prompt: COLORS.prompt,
  thought: COLORS.thought,
  action: COLORS.action,
  agent: COLORS.agent,
  result: COLORS.result,
  error: COLORS.error,
};

export default function TextPanel() {
  const eventLog = useGraphStore(s => s.eventLog);
  const selectedNodeId = useGraphStore(s => s.selectedNodeId);
  const setSelected = useGraphStore(s => s.setSelected);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolled = useRef(false);

  const [activeFilters, setActiveFilters] = useState<Set<NeuralNode['type']>>(
    () => new Set(nodeTypes)
  );

  const toggleFilter = useCallback((type: NeuralNode['type']) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const filteredEvents = eventLog.filter(e => activeFilters.has(e.nodeType));

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 40;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isUserScrolled.current = !atBottom;
  }, []);

  useEffect(() => {
    if (!isUserScrolled.current) {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [filteredEvents.length]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: COLORS.panelBg,
        overflow: 'hidden',
      }}
    >
      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '32px',
          minHeight: '32px',
          padding: '0 10px',
          borderBottom: `1px solid ${COLORS.border}`,
          gap: '6px',
          flexShrink: 0,
        }}
      >
        {nodeTypes.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => toggleFilter(type)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              opacity: activeFilters.has(type) ? 1 : 0.3,
              transition: 'opacity 0.15s ease',
              borderRadius: '3px',
              minHeight: '24px',
              minWidth: '44px',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: typeColorMap[type],
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '10px',
                color: '#999',
                textTransform: 'capitalize',
              }}
            >
              {type}
            </span>
          </button>
        ))}

        <span
          style={{
            marginLeft: 'auto',
            fontSize: '10px',
            color: '#555',
            flexShrink: 0,
          }}
        >
          {filteredEvents.length} events
        </span>
      </div>

      {/* Scrolling event list */}
      <div
        ref={scrollRef}
        className="panel-scroll"
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {filteredEvents.length === 0 && (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              fontSize: '11px',
              color: '#444',
            }}
          >
            No events yet. Waiting for activity...
          </div>
        )}
        {filteredEvents.map(entry => (
          <EventEntry
            key={entry.id}
            entry={entry}
            isSelected={selectedNodeId === entry.nodeId}
            onClick={() => setSelected(entry.nodeId)}
          />
        ))}
      </div>
    </div>
  );
}
