import { T } from '../theme';

export const EXT_COLORS = T.ext;

const EXT_SHOWN = ['.py', '.js', '.ts', '.jsx', '.tsx', '.cpp', '.java', '.go'];

export default function GraphLegend({ colorMode = 'ext' }) {
  return (
    <div style={wrap}>
      {colorMode === 'ext' && (
        <>
          <p style={title}>Language</p>
          <div style={grid}>
            {EXT_SHOWN.map(ext => (
              <div key={ext} style={row}>
                <span style={{ ...dot, background: T.ext[ext] }} />
                <span style={lbl}>{ext}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {colorMode === 'loc' && (
        <>
          <p style={title}>Lines of Code</p>
          {[['> 400', T.red], ['> 200', T.amber], ['> 80', T.green], ['≤ 80', T.indigo]].map(([l, c]) => (
            <div key={l} style={row}>
              <span style={{ ...dot, background: c }} />
              <span style={lbl}>{l}</span>
            </div>
          ))}
        </>
      )}

      {colorMode === 'cc' && (
        <>
          <p style={title}>Complexity</p>
          {[['> 10', T.red], ['> 5', T.amber], ['≤ 5', T.green], ['n/a', T.textMuted]].map(([l, c]) => (
            <div key={l} style={row}>
              <span style={{ ...dot, background: c }} />
              <span style={lbl}>CC {l}</span>
            </div>
          ))}
        </>
      )}

      {colorMode === 'risk' && (
        <>
          <p style={title}>Risk Score</p>
          {/* Continuous gradient bar */}
          <div style={gradBar} />
          <div style={gradLabels}>
            <span style={lbl}>Low</span>
            <span style={lbl}>High</span>
          </div>
          <div style={{ marginTop: 6 }}>
            {[
              ['High  ≥ 0.7', 'rgb(255,30,30)'],
              ['Med   ≥ 0.4', 'rgb(255,160,30)'],
              ['Low   < 0.4', 'rgb(30,200,30)'],
            ].map(([l, c]) => (
              <div key={l} style={row}>
                <span style={{ ...dot, background: c }} />
                <span style={lbl}>{l}</span>
              </div>
            ))}
          </div>
          <p style={note}>Complexity × Churn</p>
        </>
      )}

      <div style={sep} />
      <div style={row}>
        <span style={{ ...line, background: T.indigo }} />
        <span style={lbl}>dependency</span>
      </div>
      <div style={row}>
        <span style={{ ...line, background: T.red }} />
        <span style={lbl}>cycle</span>
      </div>
    </div>
  );
}

const wrap = {
  position: 'absolute', bottom: 80, left: 12, zIndex: 5,
  background: 'rgba(22,27,34,0.96)', backdropFilter: 'blur(8px)',
  border: `1px solid ${T.border}`, borderRadius: 8,
  padding: '10px 12px', minWidth: 136,
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
};
const title = {
  fontSize: 9, fontWeight: 700, color: T.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.6px',
  marginBottom: 8, fontFamily: 'var(--font-mono)',
};
const grid = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', marginBottom: 2,
};
const row = { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 };
const dot = { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 };
const lbl = { fontSize: 10, color: T.textSecondary, fontFamily: 'var(--font-mono)' };
const sep = { borderTop: `1px solid ${T.border}`, margin: '6px 0' };
const line = { width: 16, height: 2, display: 'inline-block', borderRadius: 1, flexShrink: 0 };
const gradBar = {
  width: '100%', height: 8, borderRadius: 4,
  background: 'linear-gradient(to right, rgb(30,200,30), rgb(255,160,30), rgb(255,30,30))',
  marginBottom: 4,
};
const gradLabels = {
  display: 'flex', justifyContent: 'space-between', marginBottom: 6,
};
const note = {
  fontSize: 9, color: T.textMuted, fontFamily: 'var(--font-mono)',
  marginTop: 4, marginBottom: 0, fontStyle: 'italic',
};
