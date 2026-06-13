import { useNavigate } from 'react-router-dom';

export default function RepoCard({ repo, onRemove }) {
  const navigate = useNavigate();
  const analyzed = !!repo.last_analyzed;
  const initial = repo.name.charAt(0).toUpperCase();

  return (
    <div style={card}>
      <div style={cardTop}>
        <div style={avatar}>{initial}</div>
        <button onClick={() => onRemove(repo.id)} style={removeBtn} title="Remove">✕</button>
      </div>

      <div style={repoName}>{repo.name}</div>
      <div style={repoPath}>{repo.path}</div>

      <div style={statusRow}>
        <span style={analyzed ? statusAnalyzed : statusNone}>
          {analyzed ? '✓ Analyzed' : '○ Not analyzed'}
        </span>
        {analyzed && (
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            {new Date(repo.last_analyzed).toLocaleDateString()}
          </span>
        )}
      </div>

      <button onClick={() => navigate(`/graph/${repo.id}`)} style={openBtn}>
        Open Graph →
      </button>
    </div>
  );
}

const card = {
  background: 'var(--bg1)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  padding: '18px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};
const cardTop = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
};
const avatar = {
  width: 34, height: 34, borderRadius: 8,
  background: 'rgba(129,140,248,0.15)',
  border: '1px solid rgba(129,140,248,0.3)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--indigo)', fontWeight: 700, fontSize: 15,
};
const repoName = {
  fontWeight: 600, fontSize: 14, color: 'var(--text1)',
  fontFamily: 'var(--font-mono)', letterSpacing: '-0.2px',
};
const repoPath = {
  fontSize: 11, color: 'var(--text3)',
  fontFamily: 'var(--font-mono)', wordBreak: 'break-all', lineHeight: 1.5,
};
const statusRow = {
  display: 'flex', alignItems: 'center', gap: 8,
  paddingTop: 4,
};
const statusAnalyzed = {
  fontSize: 11, fontWeight: 500, color: 'var(--green)',
  background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
  padding: '2px 8px', borderRadius: 20,
};
const statusNone = {
  fontSize: 11, fontWeight: 500, color: 'var(--text3)',
  background: 'var(--bg2)', border: '1px solid var(--border)',
  padding: '2px 8px', borderRadius: 20,
};
const openBtn = {
  marginTop: 6, padding: '8px 0', width: '100%',
  background: 'rgba(129,140,248,0.1)',
  border: '1px solid rgba(129,140,248,0.25)',
  borderRadius: 'var(--r-sm)', cursor: 'pointer',
  color: 'var(--indigo)', fontWeight: 600, fontSize: 13,
  fontFamily: 'var(--font-sans)',
};
const removeBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 13, color: 'var(--text3)', padding: 4, lineHeight: 1,
};
