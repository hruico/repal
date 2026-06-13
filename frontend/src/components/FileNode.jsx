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
      background: '#fff',
      border: `2px solid ${selected ? color : '#e2e8f0'}`,
      borderRadius: 8,
      padding: '8px 12px',
      minWidth: 140,
      maxWidth: 200,
      boxShadow: selected
        ? `0 0 0 3px ${color}25`
        : '0 1px 3px rgba(0,0,0,0.08)',
      cursor: 'pointer',
    }}>
      <Handle type="target" position={Position.Top}
        style={{ background: color, width: 8, height: 8, border: '2px solid #fff' }} />

      <div style={{ fontWeight: 700, fontSize: 12, color: '#1e293b', marginBottom: 2, fontFamily: 'monospace', lineHeight: 1.3 }}>
        {data.label}
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
        <span style={{ color, fontWeight: 600 }}>{data.extension}</span>
        {' · '}{data.loc} LoC
        {data.complexity != null && ` · CC ${data.complexity}`}
      </div>

      <Handle type="source" position={Position.Bottom}
        style={{ background: color, width: 8, height: 8, border: '2px solid #fff' }} />
    </div>
  );
}
