import { EXT_COLORS } from './FileNode';

const SHOWN_EXTENSIONS = ['.py', '.js', '.ts', '.jsx', '.tsx', '.cpp', '.java', '.go'];

export default function GraphLegend() {
  return (
    <div style={container}>
      <div style={title}>Legend</div>
      {SHOWN_EXTENSIONS.map(ext => (
        <div key={ext} style={row}>
          <span style={{ ...dot, background: EXT_COLORS[ext] }} />
          <span style={extLabel}>{ext}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 8, paddingTop: 8 }}>
        <div style={row}>
          <span style={edgeLine} />
          <span style={extLabel}>import / include</span>
        </div>
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>
          LoC &gt; 300 = <span style={{ color: '#ef4444' }}>red</span>
          {' · '}LoC &gt; 150 = <span style={{ color: '#f59e0b' }}>amber</span>
        </div>
      </div>
    </div>
  );
}

const container = {
  position: 'absolute', bottom: 20, left: 20, zIndex: 10,
  background: '#fff', border: '1px solid #e5e7eb',
  borderRadius: 10, padding: '10px 14px',
  fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  minWidth: 140,
};
const title = { fontWeight: 700, marginBottom: 8, fontSize: 12 };
const row = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 };
const dot = { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 };
const extLabel = { color: '#374151', fontFamily: 'monospace' };
const edgeLine = {
  width: 24, height: 2, background: '#6366f1',
  display: 'inline-block', flexShrink: 0,
};
