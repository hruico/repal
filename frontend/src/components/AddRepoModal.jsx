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
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <p style={hint}>
          Enter the absolute path to a local Git repo. The folder must contain
          a <code>.git</code> directory.
        </p>

        <label style={fieldLabel}>Repository path</label>
        <input
          style={error ? { ...inputStyle, borderColor: 'var(--red)' } : inputStyle}
          placeholder="/home/you/projects/my-repo"
          value={path}
          onChange={e => setPath(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
          spellCheck={false}
        />

        {error && (
          <div style={errBox}>
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
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 200, backdropFilter: 'blur(4px)',
};
const modal = {
  background: 'var(--bg1)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)', padding: 28, width: 480,
  boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
};
const modalTop = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
};
const modalTitle = { fontSize: 17, fontWeight: 700, color: 'var(--text1)' };
const closeBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 16, color: 'var(--text3)', padding: 4,
};
const hint = {
  fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 20,
};
const fieldLabel = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'var(--text2)', textTransform: 'uppercase',
  letterSpacing: '0.5px', marginBottom: 7, fontFamily: 'var(--font-mono)',
};
const inputStyle = {
  width: '100%', padding: '9px 12px',
  background: 'var(--bg2)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', color: 'var(--text1)',
  fontSize: 13, fontFamily: 'var(--font-mono)',
};
const errBox = {
  marginTop: 10, padding: '9px 12px',
  background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
  borderRadius: 'var(--r-sm)', color: 'var(--red)',
  fontSize: 12, lineHeight: 1.5, display: 'flex', gap: 7,
};
const actions = { display: 'flex', gap: 10, marginTop: 22 };
const cancelBtn = {
  padding: '9px 18px', background: 'var(--bg2)',
  border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
  fontFamily: 'var(--font-sans)',
};
const submitBtn = {
  flex: 1, padding: '9px 0', background: 'var(--indigo)', color: '#fff',
  border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
  fontWeight: 600, fontSize: 14, fontFamily: 'var(--font-sans)',
};
