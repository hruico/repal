import { T } from '../theme';

export const EXT_COLORS = T.ext;

const EXT_SHOWN = ['.py', '.js', '.ts', '.jsx', '.tsx', '.cpp', '.java', '.go'];

export default function GraphLegend({ colorMode = 'ext' }) {
  return (
    <div style={wrap}>

      {/* ── Left section: colour mode key ── */}
      <div style={section}>
        <span style={title}>
          {colorMode === 'ext'  && 'Language'}
          {colorMode === 'loc'  && 'LoC'}
          {colorMode === 'cc'   && 'Complexity'}
          {colorMode === 'risk' && 'Risk'}
        </span>
        <div style={pills}>
          {colorMode === 'ext' && EXT_SHOWN.map(ext => (
            <Pill key={ext} color={T.ext[ext]} label={ext} />
          ))}

          {colorMode === 'loc' && [
            ['> 400', T.red], ['> 200', T.amber], ['> 80', T.green], ['≤ 80', T.indigo],
          ].map(([l, c]) => <Pill key={l} color={c} label={l} />)}

          {colorMode === 'cc' && [
            ['> 10', T.red], ['> 5', T.amber], ['≤ 5', T.green], ['n/a', T.textMuted],
          ].map(([l, c]) => <Pill key={l} color={c} label={`CC ${l}`} />)}

          {colorMode === 'risk' && (
            <>
              {/* compact gradient bar + tiers inline */}
              <div style={riskBar} />
              {[
                ['High', 'rgb(255,30,30)'],
                ['Med', 'rgb(255,160,30)'],
                ['Low', 'rgb(30,200,30)'],
              ].map(([l, c]) => <Pill key={l} color={c} label={l} />)}
            </>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={vline} />

      {/* ── Right section: edge types ── */}
      <div style={section}>
        <span style={title}>Edges</span>
        <div style={pills}>
          <EdgePill color={T.indigo}  label="dep" />
          <EdgePill color={T.red}     label="cycle" />
          <EdgePill color={T.teal}    label="impact" />
          <EdgePill color={T.amber}   label="selected" />
        </div>
      </div>

    </div>
  );
}

/* ── Sub-components ── */

function Pill({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: T.textSecondary, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  );
}

function EdgePill({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 18, height: 2, background: color, borderRadius: 1, flexShrink: 0, display: 'inline-block' }} />
      <span style={{ fontSize: 10, color: T.textSecondary, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  );
}

/* ── Styles ── */

const wrap = {
  position: 'absolute',
  bottom: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 5,
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  background: 'rgba(10,11,16,0.88)',
  backdropFilter: 'blur(14px) saturate(160%)',
  WebkitBackdropFilter: 'blur(14px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 40,             // pill shape
  padding: '7px 18px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.55)',
  pointerEvents: 'none',
};

const section = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const title = {
  fontSize: 9, fontWeight: 700, color: T.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.6px',
  fontFamily: 'var(--font-mono)',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const pills = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'nowrap',
};

const vline = {
  width: 1, height: 20,
  background: 'rgba(255,255,255,0.1)',
  flexShrink: 0,
};

const riskBar = {
  width: 40, height: 6, borderRadius: 3,
  background: 'linear-gradient(to right, rgb(30,200,30), rgb(255,160,30), rgb(255,30,30))',
  flexShrink: 0,
};
