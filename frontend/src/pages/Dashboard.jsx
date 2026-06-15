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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)' }}>

      {/* Nav */}
      <nav style={nav}>
        <div style={navInner}>
          <div style={brand}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="var(--indigo)" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="var(--indigo)" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="#a78bfa" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <span style={brandName}>repal</span>
            <span style={brandBadge}>local</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {repos.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                {repos.length} {repos.length === 1 ? 'repo' : 'repos'}
              </span>
            )}
            <button onClick={() => setShowModal(true)} style={btnPrimary}>
              + Add Repository
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main style={main}>

        {/* Hero */}
        <div style={hero}>
          <div style={heroEyebrow}>
            <span style={heroDot} />
            DEVELOPER TOOL
          </div>
          <h1 style={heroTitle}>
            Understand any codebase<br />
            <span style={heroAccent}>in minutes.</span>
          </h1>
          <p style={heroDesc}>
            Interactive dependency graphs, AI-powered file summaries,
            complexity metrics — all running locally on your machine.
          </p>
          {!loading && repos.length === 0 && (
            <button
              onClick={() => setShowModal(true)}
              style={{ ...btnPrimary, marginTop: 28, padding: '11px 28px', fontSize: 15 }}
            >
              Analyze your first repo →
            </button>
          )}
        </div>

        {/* Feature pills — empty state only */}


        {/* Divider */}
        <div style={divider} />

        {/* Loading */}
        {loading && (
          <div style={centered}>
            <div style={spinner} />
            <span style={{ color: 'var(--text3)', fontSize: 13 }}>Loading…</span>
          </div>
        )}

        {/* Repo grid */}
        {!loading && repos.length > 0 && (
          <>
            <div style={sectionHead}>
              <span style={sectionTitle}>Repositories</span>
              <span style={sectionBadge}>{repos.length}</span>
            </div>
            <div style={grid}>
              {repos.map(repo => (
                <RepoCard key={repo.id} repo={repo} onRemove={handleRemove} />
              ))}
              <button onClick={() => setShowModal(true)} style={addCard}>
                <span style={{ fontSize: 24, color: 'var(--text3)', marginBottom: 6 }}>+</span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Add repository</span>
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

const nav = {
  background: 'var(--bg1)',
  borderBottom: '1px solid var(--border)',
  position: 'sticky', top: 0, zIndex: 50,
};
const navInner = {
  maxWidth: 1100, margin: '0 auto', padding: '0 32px',
  height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};
const brand = { display: 'flex', alignItems: 'center', gap: 8 };
const brandName = {
  fontWeight: 700, fontSize: 16, color: 'var(--text1)', letterSpacing: '-0.3px',
};
const brandBadge = {
  fontSize: 10, fontWeight: 600, color: 'var(--indigo)',
  background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)',
  padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.5px',
};
const main = {
  maxWidth: 1100, margin: '0 auto', padding: '60px 32px 80px',
};
const hero = { marginBottom: 48, maxWidth: 560 };
const heroEyebrow = {
  display: 'flex', alignItems: 'center', gap: 7,
  fontSize: 11, fontWeight: 600, color: 'var(--indigo)',
  letterSpacing: '0.08em', marginBottom: 18,
  fontFamily: 'var(--font-mono)',
};
const heroDot = {
  width: 6, height: 6, borderRadius: '50%',
  background: 'var(--indigo)', display: 'inline-block',
};
const heroTitle = {
  fontSize: 40, fontWeight: 800, color: 'var(--text1)',
  letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 16,
};
const heroAccent = {
  background: 'linear-gradient(90deg, var(--indigo), var(--teal))',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
};
const heroDesc = {
  fontSize: 15, color: 'var(--text2)', lineHeight: 1.7,
};
const pills = {
  display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 48,
};
const pill = {
  fontSize: 12, color: 'var(--text2)',
  background: 'var(--bg2)', border: '1px solid var(--border)',
  padding: '5px 12px', borderRadius: 20, fontWeight: 500,
};
const divider = {
  height: 1, background: 'var(--border)', marginBottom: 32,
};
const sectionHead = {
  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
};
const sectionTitle = {
  fontSize: 14, fontWeight: 600, color: 'var(--text1)',
};
const sectionBadge = {
  fontSize: 11, fontWeight: 600, color: 'var(--text3)',
  background: 'var(--bg2)', border: '1px solid var(--border)',
  padding: '2px 8px', borderRadius: 10,
};
const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 14,
};
const btnPrimary = {
  padding: '8px 18px', background: 'var(--indigo)', color: '#fff',
  border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer',
  fontWeight: 600, fontSize: 14, fontFamily: 'var(--font-sans)',
};
const addCard = {
  border: '1px dashed var(--border)', borderRadius: 'var(--r-lg)',
  background: 'transparent', cursor: 'pointer',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  padding: 32, minHeight: 160,
};
const centered = {
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', gap: 10, padding: '60px 0',
};
const spinner = {
  width: 22, height: 22,
  border: '2px solid var(--border)', borderTopColor: 'var(--indigo)',
  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
};
