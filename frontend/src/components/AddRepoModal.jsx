import { useState } from 'react';
import { api } from '../api/client';

export default function AddRepoModal({ onAdded, onClose }) {
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!path.trim()) return;
    setLoading(true);
    setError('');
    try {
      const repo = await api.addRepo(path.trim());
      onAdded(repo);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={modalTop}>
          <h2 style={modalTitle}>Add Repository</h2>
          <button onClick={onClose} style={closeBtn} aria-label="Close">✕</button>
        </div>

        <p style={hint}>
          Enter the absolute path to a local Git repo. The folder must contain a{' '}
          <code>.git</code> directory.
        </p>

        <label style={fieldLabel}>Repository path</label>
        <input
          style={error ? { ...input, borderColor: '#fca5a5' } : input}
          placeholder="/home/you/projects/my-repo"
          value={path}
          onChange={e => setPath(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
          spellCheck={false}
        />

        {error && (
          <div style={errorBox}>
            <span>⚠</span> {error}
          </div>
        )}

        <div style={actions}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !path.trim()} style={submitBtn}>
            {loading ? 'Validating…' : 'Add Repository'}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(15,23,42,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 200, backdropFilter: 'blur(3px)',
};
const modal = {
  background: '#fff', borderRadius: 14,
  padding: 28, width: 480,
  boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
};
const modalTop = {
  display: 'flex', justifyContent: 'space-between',
  alignItems: 'center', marginBottom: 10,
};
const modalTitle = {
  fontSize: 17, fontWeight: 700, color: '#0f172a',
};
const closeBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 16, color: '#94a3b8', padding: 4,
};
const hint = {
  fontSize: 13, color: '#64748b', lineHeight: 1.65, marginBottom: 20,
};
const fieldLabel = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: '#475569', textTransform: 'uppercase',
  letterSpacing: '0.5px', marginBottom: 6,
};
const input = {
  width: '100%', padding: '9px 12px',
  border: '1.5px solid #e2e8f0', borderRadius: 8,
  fontSize: 13, fontFamily: 'ui-monospace, Consolas, monospace',
  color: '#0f172a', background: '#f8fafc',
  transition: 'border-color 0.15s',
};
const errorBox = {
  marginTop: 10, padding: '9px 12px',
  background: '#fef2f2', border: '1px solid #fecaca',
  borderRadius: 7, color: '#dc2626',
  fontSize: 12, lineHeight: 1.5,
  display: 'flex', gap: 7, alignItems: 'flex-start',
};
const actions = {
  display: 'flex', gap: 10, marginTop: 22,
};
const cancelBtn = {
  padding: '9px 18px', background: '#f1f5f9',
  border: 'none', borderRadius: 8,
  cursor: 'pointer', fontSize: 13,
  color: '#475569', fontWeight: 500,
};
const submitBtn = {
  flex: 1, padding: '9px 0',
  background: '#6366f1', color: '#fff',
  border: 'none', borderRadius: 8,
  cursor: 'pointer', fontWeight: 600, fontSize: 14,
};
