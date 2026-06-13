import { useNavigate } from 'react-router-dom';

export default function RepoCard({ repo, onRemove }) {
  const navigate = useNavigate();
  const initial = repo.name.charAt(0).toUpperCase();

  return (
    <div style={card}>
      <div style={cardTop}>
        <div style={avatar}>{initial}</div>
        <button onClick={() => onRemove(repo.id)} style={removeBtn} title="Remove">✕</button>
      </div>

      <div style={repoName}>{repo.name}</div>
      <div style={repoPath}>{repo.path}</div>

      <div style={footer}>
        {repo.last_analyzed ? (
          <span style={analyzed}>
            Analyzed {new Date(repo.last_analyzed).toLocaleDateString()}
          </span>
        ) : (
          <span style={notAnalyzed}>Not yet analyzed</span>
        )}
        <button onClick={() => navigate(`/graph/${repo.id}`)} style={openBtn}>
          Open →
        </button>
      </div>
    </div>
  );
}

const card = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: '18px 18px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  transition: 'box-shadow 0.15s',
};
const cardTop = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
};
const avatar = {
  width: 34,
  height: 34,
  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontWeight: 800,
  fontSize: 15,
};
const repoName = {
  fontWeight: 700,
  fontSize: 15,
  color: '#0f172a',
  letterSpacing: '-0.2px',
};
const repoPath = {
  fontSize: 11,
  color: '#94a3b8',
  fontFamily: 'ui-monospace, Consolas, monospace',
  wordBreak: 'break-all',
  lineHeight: 1.5,
};
const footer = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 10,
  paddingTop: 12,
  borderTop: '1px solid #f1f5f9',
};
const analyzed = {
  fontSize: 11,
  color: '#16a34a',
  fontWeight: 500,
};
const notAnalyzed = {
  fontSize: 11,
  color: '#94a3b8',
};
const openBtn = {
  padding: '5px 14px',
  background: '#6366f1',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
};
const removeBtn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  color: '#cbd5e1',
  padding: 4,
  lineHeight: 1,
  borderRadius: 4,
};
