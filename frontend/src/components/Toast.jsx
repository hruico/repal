import { useEffect, useState } from 'react';

// Simple self-contained toast — call window.__toast('message', 'success'|'error')
let _setToasts = null;

export function toast(message, type = 'success') {
  if (_setToasts) {
    const id = Date.now();
    _setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      _setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { _setToasts = setToasts; return () => { _setToasts = null; }; }, []);

  return (
    <div style={container}>
      {toasts.map(t => (
        <div key={t.id} style={t.type === 'error' ? { ...toastBase, ...errorStyle } : { ...toastBase, ...successStyle }}>
          <span style={{ fontSize: 14 }}>{t.type === 'error' ? '✕' : '✓'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

const container = {
  position: 'fixed', bottom: 24, right: 24,
  display: 'flex', flexDirection: 'column', gap: 8,
  zIndex: 1000, pointerEvents: 'none',
};
const toastBase = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 16px', borderRadius: 8,
  fontSize: 13, fontWeight: 500,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  animation: 'slideUp 0.2s ease',
};
const successStyle = { background: '#1e293b', color: '#f8fafc' };
const errorStyle = { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
