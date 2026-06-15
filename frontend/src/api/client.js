const BASE = '/api';

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

  getTree: (id) =>
    fetch(`${BASE}/repos/${id}/tree`).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Failed to load tree');
      return data;
    }),

  summarize: (repoId, fileId) =>
    fetch(`${BASE}/repos/${repoId}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Summarization failed');
      return data;
    }),

  preview: (repoId, fileId) =>
    fetch(`${BASE}/repos/${repoId}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Preview failed');
      return data;
    }),

  exportCsv: (id, name) => {
    const a = document.createElement('a');
    a.href = `${BASE}/repos/${id}/export`;
    a.download = `${name}_metrics.csv`;
    a.click();
  },

  getOverview: (repoId, force = false) =>
    fetch(`${BASE}/repos/${repoId}/overview${force ? '?force=true' : ''}`).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Overview failed');
      return data;
    }),
};
