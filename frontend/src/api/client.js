const BASE = 'http://localhost:8000/api';

export const api = {
  listRepos: () =>
    fetch(`${BASE}/repos`).then(r => r.json()),

  addRepo: (path) =>
    fetch(`${BASE}/repos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Failed to add repo');
      return data;
    }),

  removeRepo: (id) =>
    fetch(`${BASE}/repos/${id}`, { method: 'DELETE' }).then(r => r.json()),

  getGraph: (id) =>
    fetch(`${BASE}/repos/${id}/graph`).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Failed to load graph');
      return data;
    }),

  summarize: (repoId, fileId) =>
    fetch(`${BASE}/repos/${repoId}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
    }).then(r => r.json()),
};
