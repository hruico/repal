import { useState, useEffect } from 'react';
import { api } from '../api/client';
import RepoCard from '../components/RepoCard';
import AddRepoModal from '../components/AddRepoModal';

export default function Dashboard() {
  const [repos, setRepos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listRepos().then(setRepos).finally(() => setLoading(false));
  }, []);

  const handleAdd = (repo) => setRepos(prev => [...prev, repo]);
  const handleRemove = async (id) => {
    await api.removeRepo(id);
    setRepos(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Repo Analyzer</h1>
            <p style={{ margin: '6px 0 0', color: '#6b7280' }}>
              Visualize dependencies, structure, and complexity of any local Git repository.
            </p>
          </div>
          <button onClick={() => setShowModal(true)} style={addBtn}>
            + Add Repository
          </button>
        </div>

        {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}

        {!loading && repos.length === 0 && (
          <div style={emptyState}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>No repositories added yet</div>
            <div style={{ color: '#6b7280', marginTop: 6, fontSize: 14 }}>
              Click "Add Repository" and enter the absolute path to a local Git project.
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {repos.map(repo => (
            <RepoCard key={repo.id} repo={repo} onRemove={handleRemove} />
          ))}
        </div>
      </div>

      {showModal && (
        <AddRepoModal onAdded={handleAdd} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

const addBtn = {
  padding: '10px 20px', background: '#6366f1', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
};
const emptyState = {
  textAlign: 'center', padding: '80px 20px',
  border: '2px dashed #e5e7eb', borderRadius: 12,
};
