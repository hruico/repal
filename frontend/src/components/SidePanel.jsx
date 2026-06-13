import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { T } from '../theme';
import { nodeColor } from './FileNode';

export default function SidePanel({ selectedNode, repoId, onClose }) {
  const [tab, setTab]         = useState('metrics');
  const [summary, setSummary] = useState('');
  const [preview, setPreview] = useState('');
  const [loadingAI, setLoadingAI]   = useState(false);
  const [loadingPre, setLoadingPre] = useState(false);
  const [errorAI, setErrorAI]   = useState('');
  const lastIdRef = useRef('');

  useEffect(() => {
    if (!selectedNode || selectedNode.id === lastIdRef.current) return;
    lastIdRef.current = selectedNode.id;
    setSummary(''); setPreview('');
    setErrorAI('');

    // Fetch AI summary
    setLoadingAI(true);
    api.summarize(repoId, selectedNode.data.full_path)
      .then(res => setSummary(res.summary))
      .catch(e => {
        setErrorAI(e.message);
        lastIdRef.current = '';
      })
      .finally(() => setLoadingAI(false));

    // Fetch preview
    setLoadingPre(true);
    api.preview(repoId, selectedNode.data.full_path)
      .then(res => setPreview(res.content))
      .catch(() => {})
      .finally(() => setLoadingPre(false));
  }, [selectedNode, repoId]);

  if (!selectedNode) {
    return (
      <div style={panel}>
        <div style={emptyWrap}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
            stroke={T.textMuted} strokeWidth="1.2" style={{ marginBottom: 14 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <p style={{ fontSize: 12, color: T.textMuted, textAlign: 'center', lineHeight: 1.7 }}>
            Click a node to inspect it
          </p>
        </div>
      </div>
    );
  }

  const d = selectedNode.data;
  const color = d.in_cycle ? T.red : nodeColor(d, 'ext');

  return (
    <div style={{ ...panel, animation: 'slideIn 0.16s ease' }}>
      {/* Accent stripe */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${color} 0%, transparent 100%)` }} />

      {/* Header */}
      <div style={header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={fname}>{d.label}</div>
          <div style={fpath}>{d.full_path}</div>
        </div>
        <button onClick={onClose} style={closeBtn} aria-label="Close">✕</button>
      </div>

      {/* Tabs */}
      <div style={tabBar}>
        {['metrics', 'ai', 'preview'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabBtn(t === tab)}>
            {t === 'ai' ? 'AI' : t === 'metrics' ? 'Metrics' : 'Preview'}
          </button>
        ))}
      </div>

      {/* ── Metrics tab ── */}
      {tab === 'metrics' && (
        <div style={tabContent}>
          <MRow label="Type">
            <Tag color={color}>{d.extension}</Tag>
          </MRow>
          <MRow label="Lines of Code">
            <Num value={d.loc}
              color={d.loc > 300 ? T.red : d.loc > 150 ? T.amber : T.green} />
          </MRow>
          <MRow label="Complexity">
            {d.complexity != null
              ? <Num value={d.complexity}
                  color={d.complexity > 10 ? T.red : d.complexity > 5 ? T.amber : T.green} />
              : <span style={{ fontSize: 11, color: T.textMuted }}>Python only</span>
            }
          </MRow>
          {d.in_degree != null && (
            <MRow label="Imports">
              <span style={{ fontSize: 12, color: T.textSecondary, fontFamily: 'var(--font-mono)' }}>
                ↑{d.out_degree} out · ↓{d.in_degree} in
              </span>
            </MRow>
          )}

          {d.in_cycle && (
            <div style={cycleBox}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke={T.red} strokeWidth="2" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Part of a circular dependency
            </div>
          )}
        </div>
      )}

      {/* ── AI tab ── */}
      {tab === 'ai' && (
        <div style={tabContent}>
          <div style={aiLabel}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke={T.indigo} strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Groq · llama-3.1-8b
          </div>
          {loadingAI && (
            <div style={spinRow}>
              <div style={spin} /> Analyzing…
            </div>
          )}
          {errorAI && <div style={errBox}>{errorAI}</div>}
          {!loadingAI && !errorAI && summary && (
            <p style={summaryText}>{summary}</p>
          )}
          {!loadingAI && !errorAI && !summary && (
            <p style={mutedTxt}>No summary yet.</p>
          )}
        </div>
      )}

      {/* ── Preview tab ── */}
      {tab === 'preview' && (
        <div style={{ ...tabContent, padding: 0, flex: 1, overflow: 'hidden' }}>
          {loadingPre && <p style={{ ...mutedTxt, padding: 16 }}>Loading…</p>}
          {!loadingPre && preview && (
            <pre style={preCode}>{preview}</pre>
          )}
          {!loadingPre && !preview && (
            <p style={{ ...mutedTxt, padding: 16 }}>No preview available.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function MRow({ label, children }) {
  return (
    <div style={mrow}>
      <span style={{ color: T.textSecondary, fontSize: 12 }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

function Tag({ color, children }) {
  return (
    <span style={{
      fontSize: 11, padding: '2px 7px', borderRadius: 4,
      background: `${color}18`, color, border: `1px solid ${color}28`,
      fontFamily: 'var(--font-mono)', fontWeight: 600,
    }}>
      {children}
    </span>
  );
}

function Num({ value, color }) {
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
      {value}
    </span>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────────── */

const panel = {
  width: 280, flexShrink: 0,
  borderLeft: `1px solid ${T.border}`,
  background: T.bg1,
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
};
const emptyWrap = {
  flex: 1, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', padding: 24,
};
const header = {
  padding: '12px 14px 10px',
  borderBottom: `1px solid ${T.border}`,
  display: 'flex', gap: 8, alignItems: 'flex-start',
};
const fname = {
  fontWeight: 600, fontSize: 13, color: T.textPrimary,
  fontFamily: 'var(--font-mono)', wordBreak: 'break-word', lineHeight: 1.4,
};
const fpath = {
  fontSize: 10, color: T.textMuted,
  fontFamily: 'var(--font-mono)', wordBreak: 'break-all',
  marginTop: 3, lineHeight: 1.5,
};
const closeBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 12, color: T.textMuted, padding: '2px 4px', flexShrink: 0,
};
const tabBar = {
  display: 'flex', borderBottom: `1px solid ${T.border}`,
  flexShrink: 0,
};
const tabBtn = (active) => ({
  flex: 1, padding: '8px 0',
  background: 'none', border: 'none',
  borderBottom: active ? `2px solid ${T.indigo}` : '2px solid transparent',
  cursor: 'pointer', fontSize: 11, fontWeight: active ? 600 : 400,
  color: active ? T.indigo : T.textSecondary,
  fontFamily: 'var(--font-sans)',
  transition: 'color 0.15s',
  marginBottom: -1,
});
const tabContent = { padding: '14px', overflowY: 'auto', flex: 1 };
const mrow = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '8px 0', borderBottom: `1px solid ${T.border}`,
};
const cycleBox = {
  marginTop: 12, padding: '8px 10px',
  background: `${T.red}0d`, border: `1px solid ${T.red}28`,
  borderRadius: 6, color: T.red, fontSize: 12, lineHeight: 1.5,
  display: 'flex', gap: 8, alignItems: 'flex-start',
};
const aiLabel = {
  display: 'flex', alignItems: 'center', gap: 6,
  fontSize: 10, color: T.textMuted, fontFamily: 'var(--font-mono)',
  marginBottom: 12,
};
const spinRow = {
  display: 'flex', alignItems: 'center', gap: 8,
  fontSize: 12, color: T.textSecondary,
};
const spin = {
  width: 12, height: 12, flexShrink: 0,
  border: `2px solid ${T.border}`, borderTopColor: T.indigo,
  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
};
const summaryText = {
  fontSize: 13, lineHeight: 1.85, color: T.textPrimary, margin: 0,
};
const mutedTxt = { fontSize: 12, color: T.textMuted, margin: 0, lineHeight: 1.6 };
const errBox = {
  padding: '8px 10px',
  background: `${T.red}0d`, border: `1px solid ${T.red}28`,
  borderRadius: 6, color: T.red, fontSize: 12, lineHeight: 1.5,
};
const preCode = {
  margin: 0, padding: '12px 14px',
  fontSize: 11, fontFamily: 'var(--font-mono)',
  color: T.textSecondary, lineHeight: 1.7,
  whiteSpace: 'pre', overflowX: 'auto',
  background: T.bg0,
  height: '100%', minHeight: 200,
};
