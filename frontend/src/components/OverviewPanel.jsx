import { T } from '../theme';

/**
 * OverviewPanel — floating glassmorphism bar, bottom-left of the canvas.
 * Animates in with overviewPopIn on mount.
 */
export default function OverviewPanel({
  overview,
  loading,
  error,
  collapsed,
  onToggle,
  onRegenerate,
}) {
  return (
    <div style={wrap}>
      {/* Subtle top accent line */}
      <div style={accentLine} />

      {/* Header row — always visible */}
      <div style={header} onClick={onToggle}>
        <div style={headerLeft}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke={T.indigo} strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span style={titleText}>Project Overview</span>
          <span style={badge}>Groq · llama-3.1-8b</span>
          {loading && <div style={smallSpin} />}
        </div>
        <div style={headerRight}>
          {!loading && (overview || error) && (
            <button
              style={regenBtn}
              onClick={e => { e.stopPropagation(); onRegenerate(); }}
              title="Regenerate overview"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5">
                <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Regenerate
            </button>
          )}
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke={T.textMuted} strokeWidth="2.5"
            style={{
              transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
              transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            }}
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={body}>
          {loading && !overview && (
            <div style={skeletonWrap}>
              {[100, 92, 85, 60].map((w, i) => (
                <div key={i} style={{
                  height: 10, borderRadius: 4,
                  width: `${w}%`,
                  background: `linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)`,
                  backgroundSize: '200% 100%',
                  animation: `shimmer 1.4s ${i * 0.12}s infinite`,
                  marginBottom: i < 3 ? 8 : 0,
                }} />
              ))}
            </div>
          )}
          {error && !loading && (
            <div style={errBox}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke={T.red} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}
          {overview && !error && (
            <p style={overviewText}>{overview}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Glass styles ────────────────────────────────────────────────────────────── */

const GLASS_BG      = 'rgba(13, 17, 23, 0.72)';
const GLASS_BORDER  = 'rgba(129, 140, 248, 0.14)';
const GLASS_SHADOW  = `0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`;

const wrap = {
  position: 'absolute',
  top: 16,
  left: 16,
  zIndex: 10,
  width: 480,
  maxWidth: 'calc(100vw - 340px)',
  borderRadius: 14,
  background: GLASS_BG,
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: `1px solid ${GLASS_BORDER}`,
  boxShadow: GLASS_SHADOW,
  overflow: 'hidden',
  animation: 'overviewPopIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
  animationDelay: '0.1s',
};
const accentLine = {
  height: 2,
  background: `linear-gradient(90deg, ${T.indigo}80 0%, ${T.teal}50 60%, transparent 100%)`,
};
const header = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '9px 14px',
  cursor: 'pointer',
  userSelect: 'none',
};
const headerLeft  = { display: 'flex', alignItems: 'center', gap: 8 };
const headerRight = { display: 'flex', alignItems: 'center', gap: 8 };
const titleText = {
  fontSize: 11, fontWeight: 700,
  color: T.textSecondary, fontFamily: 'var(--font-mono)',
  letterSpacing: '0.04em', textTransform: 'uppercase',
};
const badge = {
  fontSize: 9, color: T.textMuted,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '1px 7px', borderRadius: 10,
  fontFamily: 'var(--font-mono)',
};
const smallSpin = {
  width: 10, height: 10,
  border: `2px solid rgba(255,255,255,0.1)`, borderTopColor: T.indigo,
  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  flexShrink: 0,
};
const regenBtn = {
  display: 'flex', alignItems: 'center', gap: 4,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 5, padding: '3px 8px',
  cursor: 'pointer', color: T.textMuted,
  fontSize: 10, fontFamily: 'var(--font-sans)',
  transition: 'background 0.15s',
};
const body = {
  padding: '2px 14px 12px',
  borderTop: '1px solid rgba(255,255,255,0.05)',
};
const skeletonWrap = { paddingTop: 8 };
const overviewText = {
  fontSize: 12, lineHeight: 1.85,
  color: 'rgba(230,237,243,0.75)', margin: 0,
  fontFamily: 'var(--font-sans)',
  paddingTop: 8,
};
const errBox = {
  display: 'flex', alignItems: 'flex-start', gap: 7,
  fontSize: 11, color: T.red, lineHeight: 1.5,
  background: `${T.red}0d`, border: `1px solid ${T.red}25`,
  borderRadius: 6, padding: '8px 10px', marginTop: 8,
};
