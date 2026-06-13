import { EXT_COLORS } from './FileNode';

const SHOWN = ['.py', '.js', '.ts', '.jsx', '.tsx', '.cpp', '.java', '.go'];

export default function GraphLegend() {
  return (
    <div style={wrap}>
      <p style={title}>Legend</p>
      {SHOWN.map(ext => (
        <div key={ext} style={row}>
          <span style={{ ...dot, background: EXT_COLORS[ext] }} />
          <span style={lbl}>{ext}</span>
        </div>
      ))}
      <div style={sep} />
      <div style={row}>
        <span style={line} />
        <span style={lbl}>dependency</span>
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
        LoC <span style={{ color: '#f59e0b' }}>&gt;150</span>{' '}
        <span style={{ color: '#ef4444' }}>&gt;300</span>
      </div>
    </div>
  );
}

const wrap = {
  position: 'absolute', bottom: 80, left: 12, zIndex: 5,
  background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)',
  border: '1px solid #e2e8f0', borderRadius: 8,
  padding: '10px 12px', minWidth: 130,
  boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
};
const title = {
  margin: '0 0 8px', fontSize: 10, fontWeight: 700,
  color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px',
};
const row = { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 };
const dot = { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 };
const lbl = { fontSize: 11, color: '#334155', fontFamily: 'monospace' };
const sep = { borderTop: '1px solid #f1f5f9', margin: '6px 0' };
const line = {
  width: 18, height: 2, background: '#cbd5e1',
  display: 'inline-block', borderRadius: 1, flexShrink: 0,
};
