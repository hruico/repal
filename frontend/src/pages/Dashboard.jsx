import { useState, useEffect } from 'react';
import { api } from '../api/client';
import RepoCard from '../components/RepoCard';
import AddRepoModal from '../components/AddRepoModal';
import { toast } from '../components/Toast';

export default function Dashboard() {
  const [repos, setRepos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listRepos().then(setRepos).finally(() => setLoading(false));
  }, []);

  const handleAdd = (repo) => {
    setRepos(prev => [...prev, repo]);
    toast(`Added "${repo.name}"`);
  };

  const handleRemove = async (id) => {
    const repo = repos.find(r => r.id === id);
    await api.removeRepo(id);
    setRepos(prev => prev.filter(r => r.id !== id));
    toast(`Removed "${repo?.name}"`, 'error');
  };

  const totalFiles = repos.reduce((a, r) => a + (r.file_count || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* Navbar */}
      <nav style={navbar}>
        <div style={navInner}>
          <div style={brand}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <span style={brandName}>Depsight</span>
            <span style={brandTag}>local</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {repos.length > 0 && (
              <span style={navStat}>
                {repos.length} {repos.length === 1 ? 'repo' : 'repos'}
              </span>
            )}
            <button onClick={() => setShowModal(true)} style={primaryBtn}>
              + Add Repository
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main style={main}>

        {/* Hero */}
        <div style={heroSection}>
          <h1 style={heroTitle}>Code Intelligence,<br />Right on Your Machine</h1>
          <p style={heroDesc}>
            Depsight maps your codebase into an interactive dependency graph —
            with complexity metrics and AI-powered file summaries, all running locally.
          </p>
          {!loading && repos.length === 0 && (
            <button onClick={() => setShowModal(true)} style={{ ...primaryBtn, marginTop: 24, padding: '11px 28px', fontSize: 15 }}>
              Analyze your first repo →
            </button>
          )}
        </div>

        {/* Feature pills — only shown on empty state */}
        {!loading && repos.length === 0 && (
          <div style={featurePills}>
            {['Dependency graph', 'LoC & Complexity', 'AI file summaries', 'Edge highlighting', 'No cloud required'].map(f => (
              <span key={f} style={pill}>{f}</span>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={centered}>
            <div style={spinnerEl} />
            <span style={{ color: '#94a3b8', fontSize: 13 }}>Loading…</span>
          </div>
        )}

        {/* Repo grid */}
        {!loading && repos.length > 0 && (
          <>
            <div style={sectionHeader}>
              <h2 style={sectionTitle}>Repositories</h2>
              <span style={sectionCount}>{repos.length}</span>
            </div>
            <div style={grid}>
              {repos.map(repo => (
                <RepoCard key={repo.id} repo={repo} onRemove={handleRemove} />
              ))}
              <button onClick={() => setShowModal(true)} style={addCard}>
                <span style={{ fontSize: 28, marginBottom: 8, color: '#cbd5e1' }}>+</span>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>Add repository</span>
              </button>
            </div>
          </>
        )}
      </main>

      {showModal && (
        <AddRepoModal onAdded={handleAdd} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────────── */

const navbar = {
  background: '#fff',
  borderBottom: '1px solid #e2e8f0',
  position: 'sticky',
  top: 0,
  zIndex: 50,
};
const navInner = {
  maxWidth: 1120,
  margin: '0 auto',
  padding: '0 32px',
  height: 58,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};
const brand = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};
const brandName = {
  fontWeight: 800,
  fontSize: 17,
  color: '#0f172a',
  letterSpacing: '-0.4px',
};
const brandTag = {
  fontSize: 10,
  fontWeight: 600,
  color: '#6366f1',
  background: '#eef2ff',
  padding: '2px 7px',
  borderRadius: 20,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};
const navStat = {
  fontSize: 13,
  color: '#94a3b8',
};
const main = {
  maxWidth: 1120,
  margin: '0 auto',
  padding: '56px 32px 80px',
};
const heroSection = {
  marginBottom: 40,
  maxWidth: 600,
};
const heroTitle = {
  fontSize: 36,
  fontWeight: 800,
  color: '#0f172a',
  letterSpacing: '-0.8px',
  lineHeight: 1.2,
  marginBottom: 14,
};
const heroDesc = {
  fontSize: 15,
  color: '#64748b',
  lineHeight: 1.7,
};
const featurePills = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 48,
};
const pill = {
  fontSize: 12,
  color: '#475569',
  background: '#fff',
  border: '1px solid #e2e8f0',
  padding: '5px 12px',
  borderRadius: 20,
  fontWeight: 500,
};
const sectionHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 20,
};
const sectionTitle = {
  fontSize: 16,
  fontWeight: 700,
  color: '#0f172a',
};
const sectionCount = {
  fontSize: 12,
  fontWeight: 600,
  color: '#94a3b8',
  background: '#f1f5f9',
  padding: '2px 8px',
  borderRadius: 10,
};
const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 16,
};
const primaryBtn = {
  padding: '8px 18px',
  background: '#6366f1',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
};
const addCard = {
  border: '2px dashed #e2e8f0',
  borderRadius: 12,
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 32,
  minHeight: 160,
  transition: 'border-color 0.15s',
};
const centered = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
  padding: '60px 0',
};
const spinnerEl = {
  width: 22,
  height: 22,
  border: '2px solid #e2e8f0',
  borderTopColor: '#6366f1',
  borderRadius: '50%',
  animation: 'spin 0.7s linear infinite',
};
