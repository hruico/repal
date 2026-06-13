import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

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
      .catch(() => setError('Summarization failed. Check your AI API key in backend/.env'))
      .finally(() => setLoading(false));
  }, [selectedNode, repoId]);

  if (!selectedNode) return null;

  const d = selectedNode.data;

  return (
    <div style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontFamily: 'monospace' }}>{d.label}</h3>
        <button onClick={onClose} style={closeBtn}>✕</button>
      </div>

      <p style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', wordBreak: 'break-all', marginTop: 0 }}>
        {d.full_path}
      </p>

      <div style={section}>
        <div style={metaRow}><span style={metaLabel}>Type</span><span>{d.extension}</span></div>
        <div style={metaRow}>
          <span style={metaLabel}>Lines of Code</span>
          <span style={locStyle(d.loc)}>{d.loc}</span>
        </div>
        <div style={metaRow}>
          <span style={metaLabel}>Cyclomatic Complexity</span>
          <span style={d.complexity != null ? complexityStyle(d.complexity) : {}}>
            {d.complexity ?? '— (Python only)'}
          </span>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>AI Summary</div>
      {loading && <p style={{ color: '#6b7280', fontSize: 13 }}>Analyzing file…</p>}
      {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
      {summary && <p style={{ fontSize: 13, lineHeight: 1.8, color: '#374151', margin: 0 }}>{summary}</p>}
    </div>
  );
}

function locStyle(loc) {
  if (loc > 300) return { color: '#ef4444', fontWeight: 700 };
  if (loc > 150) return { color: '#f59e0b', fontWeight: 600 };
  return {};
}

function complexityStyle(cc) {
  if (cc > 10) return { color: '#ef4444', fontWeight: 700 };
  if (cc > 5)  return { color: '#f59e0b', fontWeight: 600 };
  return { color: '#16a34a' };
}

const panel = {
  width: 300, borderLeft: '1px solid #e5e7eb',
  padding: 20, background: '#fff', overflowY: 'auto',
  fontFamily: 'sans-serif', flexShrink: 0,
};
const closeBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 18, color: '#9ca3af', lineHeight: 1,
};
const section = { display: 'flex', flexDirection: 'column', gap: 8 };
const metaRow = { display: 'flex', justifyContent: 'space-between', fontSize: 13 };
const metaLabel = { color: '#6b7280' };
