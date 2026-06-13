import { useNavigate } from 'react-router-dom';

export default function RepoCard({ repo, onRemove }) {
  const navigate = useNavigate();

  return (
    <div style={card}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
        {repo.name}
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {repo.path}
      </div>
      {repo.last_analyzed && (
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
          Last analyzed: {new Date(repo.last_analyzed).toLocaleString()}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={() => navigate(`/graph/${repo.id}`)} style={analyzeBtn}>
          Analyze →
        </button>
        <button onClick={() => onRemove(repo.id)} style={removeBtn} title="Remove">
          ✕
        </button>
      </div>
    </div>
  );
}

const card = {
  background: '#fff', borderRadius: 12, padding: 20,
  border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};
const analyzeBtn = {
  flex: 1, padding: '8px 0', background: '#6366f1', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
};
const removeBtn = {
  padding: '8px 12px', background: '#fee2e2', color: '#ef4444',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
};
