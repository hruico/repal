import { useEffect, useState } from 'react';
import { T } from '../theme';

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
  useEffect(() => {
    _setToasts = setToasts;
    return () => { _setToasts = null; };
  }, []);

  return (
    <div style={container}>
      {toasts.map(t => (
        <div key={t.id} style={t.type === 'error' ? errToast : okToast}>
          <span>{t.type === 'error' ? '✕' : '✓'}</span>
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
const base = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 16px', borderRadius: 'var(--r-md)',
  fontSize: 13, fontWeight: 500,
  animation: 'slideUp 0.2s ease',
  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
};
const okToast = {
  ...base,
  background: T.bg2,
  border: `1px solid ${T.border}`,
  color: T.textPrimary,
};
const errToast = {
  ...base,
  background: 'rgba(248,113,113,0.1)',
  border: `1px solid rgba(248,113,113,0.3)`,
  color: T.red,
};
