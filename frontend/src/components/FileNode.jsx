import { Handle, Position } from 'reactflow';

export const EXT_COLORS = {
  '.py':   '#3b82f6',
  '.js':   '#f59e0b',
  '.ts':   '#6366f1',
  '.jsx':  '#f97316',
  '.tsx':  '#8b5cf6',
  '.cpp':  '#10b981',
  '.c':    '#10b981',
  '.h':    '#059669',
  '.java': '#ef4444',
  '.go':   '#14b8a6',
  '.rs':   '#f97316',
};

export default function FileNode({ data, selected }) {
  const color = EXT_COLORS[data.extension] || '#6b7280';

  return (
    <div style={{
      border: `${selected ? 2 : 1}px solid ${color}`,
      borderRadius: 8,
      padding: '8px 14px',
      background: '#fff',
      boxShadow: selected
        ? `0 0 0 3px ${color}33, 0 2px 8px rgba(0,0,0,0.1)`
        : '0 1px 4px rgba(0,0,0,0.08)',
      minWidth: 150,
      fontFamily: 'monospace',
      fontSize: 12,
      cursor: 'pointer',
      transition: 'box-shadow 0.15s',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div style={{ fontWeight: 700, color, fontSize: 13, marginBottom: 3 }}>
        {data.label}
      </div>
      <div style={{ color: '#9ca3af', fontSize: 11 }}>
        {data.extension}
        {' · '}{data.loc} LoC
        {data.complexity != null && ` · CC ${data.complexity}`}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}
