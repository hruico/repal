import { T } from '../theme';

/**
 * OverviewPanel
 * A collapsible banner that sits between the toolbar and the graph canvas.
 * Shows a skeleton while the AI overview is loading, then the text once ready.
 *
 * Props:
 *  - overview:   string | null   — the AI-generated text (null = not yet fetched)
 *  - loading:    bool            — show skeleton
 *  - error:      string          — error message to display instead of text
 *  - collapsed:  bool            — controlled collapse state
 *  - onToggle:   () => void      — toggle callback
 *  - onRegenerate: () => void    — force-refresh callback
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
      {/* Header row — always visible */}
      <div style={header} onClick={onToggle}>
        <div style={headerLeft}>
          {/* AI star icon */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke={T.indigo} strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span style={titleText}>Project Overview</span>
          <span style={badge}>Groq · llama-3.1-8b</span>
          {loading && <div style={smallSpin} />}
        </div>
        <div style={headerRight}>
          {/* Regenerate — only when we have content and not loading */}
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
          {/* Chevron */}
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke={T.textMuted} strokeWidth="2.5"
            style={{
              transition: 'transform 0.2s',
              transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            }}
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>

      {/* Body — hidden when collapsed */}
      {!collapsed && (
        <div style={body}>
          {loading && !overview && (
            /* Skeleton shimmer */
            <div style={skeletonWrap}>
              {[100, 92, 85, 60].map((w, i) => (
                <div key={i} style={{ ...skelLine, width: `${w}%`, animationDelay: `${i * 0.12}s` }} />
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

/* ── Styles ─────────────────────────────────────────────────────────────────── */

const wrap = {
  borderBottom: `1px solid ${T.border}`,
  background: T.bg1,
  flexShrink: 0,
};
const header = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '7px 14px',
  cursor: 'pointer',
  userSelect: 'none',
};
const headerLeft = {
  display: 'flex', alignItems: 'center', gap: 8,
};
const headerRight = {
  display: 'flex', alignItems: 'center', gap: 8,
};
const titleText = {
  fontSize: 11, fontWeight: 700,
  color: T.textSecondary, fontFamily: 'var(--font-mono)',
  letterSpacing: '0.04em', textTransform: 'uppercase',
};
const badge = {
  fontSize: 9, color: T.textMuted,
  background: T.bg2, border: `1px solid ${T.border}`,
  padding: '1px 6px', borderRadius: 10,
  fontFamily: 'var(--font-mono)',
};
const smallSpin = {
  width: 10, height: 10,
  border: `2px solid ${T.border}`, borderTopColor: T.indigo,
  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  flexShrink: 0,
};
const regenBtn = {
  display: 'flex', alignItems: 'center', gap: 4,
  background: 'none', border: `1px solid ${T.border}`,
  borderRadius: 5, padding: '3px 8px',
  cursor: 'pointer', color: T.textMuted,
  fontSize: 10, fontFamily: 'var(--font-sans)',
};
const body = {
  padding: '0 14px 10px',
};
const skeletonWrap = {
  display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 4,
};
const skelLine = {
  height: 10, borderRadius: 4,
  background: `linear-gradient(90deg, ${T.bg2} 25%, ${T.border} 50%, ${T.bg2} 75%)`,
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
};
const overviewText = {
  fontSize: 12, lineHeight: 1.8,
  color: T.textSecondary, margin: 0,
  fontFamily: 'var(--font-sans)',
  maxWidth: 900,
};
const errBox = {
  display: 'flex', alignItems: 'flex-start', gap: 7,
  fontSize: 11, color: T.red, lineHeight: 1.5,
  background: `${T.red}0d`, border: `1px solid ${T.red}25`,
  borderRadius: 5, padding: '7px 10px',
};
