import { useState, useCallback } from 'react';
import type { EventLogEntry } from '../types';
import { COLORS } from '../types';

interface EventEntryProps {
  entry: EventLogEntry;
  isSelected: boolean;
  onClick: () => void;
}

const typeColorMap: Record<EventLogEntry['nodeType'], string> = {
  prompt: COLORS.prompt,
  thought: COLORS.thought,
  action: COLORS.action,
  agent: COLORS.agent,
  result: COLORS.result,
  error: COLORS.error,
};

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function EventEntry({ entry, isSelected, onClick }: EventEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const color = typeColorMap[entry.nodeType];

  const handleClick = useCallback(() => {
    setExpanded(prev => !prev);
    onClick();
  }, [onClick]);

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        width: '100%',
        minHeight: '48px',
        padding: '8px 10px 8px 0',
        border: 'none',
        borderLeft: `4px solid ${color}`,
        background: isSelected ? '#1a1a2e' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'background 0.15s ease',
        boxShadow: isSelected ? `inset 4px 0 8px -2px ${color}40` : 'none',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = '#0d1117';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isSelected ? '#1a1a2e' : 'transparent';
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          flex: 1,
          minWidth: 0,
          paddingLeft: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
            }}
          />
          <span
            className="font-mono"
            style={{
              fontSize: '10px',
              color: '#666',
              flexShrink: 0,
            }}
          >
            {formatTime(entry.timestamp)}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {entry.label}
          </span>
        </div>

        <div
          style={{
            fontSize: '11px',
            color: '#ccc',
            lineHeight: '1.4',
            overflow: 'hidden',
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: expanded ? undefined : 3,
            WebkitBoxOrient: expanded ? undefined : 'vertical',
            wordBreak: 'break-word',
          }}
        >
          {entry.content}
        </div>
      </div>
    </button>
  );
}
