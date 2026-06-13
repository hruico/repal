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
    <div style={overlay}>
      <div style={modal}>
        <h2 style={{ marginTop: 0 }}>Add Local Repository</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 0 }}>
          Enter the absolute path to a Git repository on this machine.
          The folder must contain a <code>.git</code> directory.
        </p>
        <label style={labelStyle}>Repository Path</label>
        <input
          style={inputStyle}
          placeholder="/home/user/projects/my-project"
          value={path}
          onChange={e => setPath(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        {error && (
          <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{error}</p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={primaryBtn}>
            {loading ? 'Validating…' : 'Add Repository'}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
};
const modal = {
  background: '#fff', borderRadius: 12, padding: 32,
  width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};
const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6,
};
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #d1d5eb', fontSize: 13, fontFamily: 'monospace',
  boxSizing: 'border-box',
};
const primaryBtn = {
  flex: 1, padding: '10px 0', background: '#6366f1', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
};
const cancelBtn = {
  padding: '10px 20px', background: '#f3f4f6',
  border: 'none', borderRadius: 8, cursor: 'pointer',
};
