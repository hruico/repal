import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { EXT_COLORS } from './FileNode';

export default function SidePanel({ selectedNode, repoId, onClose }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastIdRef = useRef('');

  useEffect(() => {
    if (!selectedNode || selectedNode.id === lastIdRef.current) return;
    lastIdRef.current = selectedNode.id;
    setSummary('');
    setError('');
    setLoading(true);
    api.summarize(repoId, selectedNode.data.full_path)
      .then(res => setSummary(res.summary))
      .catch(() => setError('Summarization failed. Check GROQ_API_KEY in .env'))
      .finally(() => setLoading(false));
  }, [selectedNode, repoId]);

  /* Empty state — panel still renders so layout doesn't shift */
  if (!selectedNode) {
    return (
      <div style={panel}>
        <div style={emptyState}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ marginBottom: 12 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
            Select a file node to see metrics and an AI summary
          </p>
        </div>
      </div>
    );
  }

  const d = selectedNode.data;
  const color = EXT_COLORS[d.extension] || '#6b7280';

  return (
    <div style={{ ...panel, animation: 'slideIn 0.18s ease' }}>
      {/* Header */}
      <div style={panelHeader}>
        <div style={{ ...colorStripe, background: color }} />
        <div style={headerBody}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
            <span style={fileName}>{d.label}</span>
            <button onClick={onClose} style={closeBtn} aria-label="Close">✕</button>
          </div>
          <span style={filePath}>{d.full_path}</span>
        </div>
      </div>

      {/* Metrics */}
      <div style={section}>
        <div style={sectionLabel}>Metrics</div>
        <Row label="File type">
          <Tag color={color}>{d.extension}</Tag>
        </Row>
        <Row label="Lines of Code">
          <Value style={locStyle(d.loc)}>{d.loc}</Value>
        </Row>
        <Row label="Cyclomatic Complexity">
          {d.complexity != null
            ? <Value style={ccStyle(d.complexity)}>{d.complexity}</Value>
            : <span style={{ color: '#94a3b8', fontSize: 12 }}>Python only</span>
          }
        </Row>
      </div>

      <div style={sep} />

      {/* AI Summary */}
      <div style={section}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={sectionLabel}>AI Summary</div>
          {loading && <div style={miniSpin} />}
        </div>

        {loading && (
          <p style={mutedText}>Calling Groq…</p>
        )}
        {error && (
          <div style={errBox}>{error}</div>
        )}
        {!loading && !error && summary && (
          <p style={summaryText}>{summary}</p>
        )}
        {!loading && !error && !summary && (
          <p style={mutedText}>No summary yet.</p>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

function Row({ label, children }) {
  return (
    <div style={rowStyle}>
      <span style={rowKey}>{label}</span>
      <span style={rowVal}>{children}</span>
    </div>
  );
}

function Tag({ color, children }) {
  return (
    <span style={{
      background: `${color}18`, color,
      padding: '2px 7px', borderRadius: 4,
      fontSize: 11, fontWeight: 700,
      fontFamily: 'ui-monospace, Consolas, monospace',
    }}>
      {children}
    </span>
  );
}

function Value({ style, children }) {
  return <span style={{ fontSize: 13, fontWeight: 600, ...style }}>{children}</span>;
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const locStyle = loc =>
  loc > 300 ? { color: '#ef4444' } :
  loc > 150 ? { color: '#f59e0b' } : { color: '#16a34a' };

const ccStyle = cc =>
  cc > 10 ? { color: '#ef4444' } :
  cc > 5  ? { color: '#f59e0b' } : { color: '#16a34a' };

/* ── Styles ────────────────────────────────────────────────────────────────── */

const panel = {
  width: 300, flexShrink: 0,
  borderLeft: '1px solid #e2e8f0',
  background: '#fff', overflowY: 'auto',
  display: 'flex', flexDirection: 'column',
};
const emptyState = {
  flex: 1, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  padding: 32,
};
const panelHeader = {
  borderBottom: '1px solid #f1f5f9',
};
const colorStripe = {
  height: 3, width: '100%',
};
const headerBody = {
  padding: '14px 16px 12px',
};
const fileName = {
  fontWeight: 700, fontSize: 13,
  color: '#0f172a', fontFamily: 'ui-monospace, Consolas, monospace',
  wordBreak: 'break-word', lineHeight: 1.4, flex: 1,
};
const filePath = {
  display: 'block', marginTop: 4,
  fontSize: 10, color: '#94a3b8',
  fontFamily: 'ui-monospace, Consolas, monospace',
  wordBreak: 'break-all', lineHeight: 1.5,
};
const closeBtn = {
  background: 'none', border: 'none',
  cursor: 'pointer', fontSize: 13,
  color: '#94a3b8', flexShrink: 0,
  padding: '2px 4px', lineHeight: 1,
};
const section = { padding: '14px 16px' };
const sectionLabel = {
  fontSize: 10, fontWeight: 700, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.5px',
  marginBottom: 10,
};
const rowStyle = {
  display: 'flex', justifyContent: 'space-between',
  alignItems: 'center', marginBottom: 9, fontSize: 13,
};
const rowKey = { color: '#64748b' };
const rowVal = { fontWeight: 500, color: '#0f172a' };
const sep = { height: 1, background: '#f1f5f9', margin: '0 16px' };
const summaryText = {
  fontSize: 13, lineHeight: 1.8, color: '#334155', margin: 0,
};
const mutedText = {
  fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.6,
};
const errBox = {
  padding: '9px 12px', background: '#fef2f2',
  border: '1px solid #fecaca', borderRadius: 6,
  color: '#dc2626', fontSize: 12, lineHeight: 1.5,
};
const miniSpin = {
  width: 11, height: 11, flexShrink: 0,
  border: '2px solid #e2e8f0', borderTopColor: '#6366f1',
  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
};
