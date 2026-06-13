import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import GraphCanvas from '../components/GraphCanvas';
import SidePanel from '../components/SidePanel';

export default function GraphView() {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadGraph = useCallback(() => {
    setLoading(true);
    setError('');
    setSelectedNode(null);
    api.getGraph(repoId)
      .then(setGraphData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [repoId]);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  // Escape key to deselect node
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') setSelectedNode(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filteredNodes = (graphData?.nodes ?? []).filter(n =>
    n.data.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={root}>
      {/* Topbar */}
      <header style={topBar}>
        {/* Left */}
        <div style={topLeft}>
          <button onClick={() => navigate('/')} style={ghostBtn} title="Back to dashboard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div style={divider} />
          {/* Brand */}
          <div style={brandMini}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
              {graphData?.repo?.name ?? '…'}
            </span>
          </div>
        </div>

        {/* Center — search */}
        <div style={searchWrap}>
          <svg style={searchIcon} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            placeholder="Filter files…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={searchInput}
          />
          {search && (
            <button onClick={() => setSearch('')} style={clearBtn}>✕</button>
          )}
        </div>

        {/* Right */}
        <div style={topRight}>
          {graphData && (
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={statChip('#f0fdf4', '#16a34a')}>{filteredNodes.length} files</span>
              <span style={statChip('#eef2ff', '#4f46e5')}>{graphData.edges.length} deps</span>
            </div>
          )}
          <div style={divider} />
          <button onClick={loadGraph} style={ghostBtn} title="Re-analyze (re-runs traversal)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            <span>Re-analyze</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={body}>
        <div style={{ flex: 1, position: 'relative', background: '#f8fafc' }}>
          {loading && (
            <Centered>
              <div style={spinEl} />
              <div style={{ color: '#64748b', fontSize: 13 }}>Traversing repository…</div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>Computing LoC and cyclomatic complexity</div>
            </Centered>
          )}
          {error && (
            <Centered>
              <div style={{ fontSize: 32, marginBottom: 4 }}>⚠️</div>
              <div style={{ color: '#dc2626', fontSize: 13, fontWeight: 600, maxWidth: 320, textAlign: 'center' }}>{error}</div>
              <button onClick={() => navigate('/')} style={{ ...ghostBtn, marginTop: 8 }}>← Back to Dashboard</button>
            </Centered>
          )}
          {!loading && !error && graphData && (
            <GraphCanvas
              rawNodes={filteredNodes}
              rawEdges={graphData.edges}
              onNodeClick={setSelectedNode}
            />
          )}
        </div>

        <SidePanel
          selectedNode={selectedNode}
          repoId={repoId}
          onClose={() => setSelectedNode(null)}
        />
      </div>

      {/* Bottom hint */}
      {!loading && !error && (
        <div style={hint}>
          Scroll to zoom · Drag to pan · Click node to inspect · <kbd style={kbd}>Esc</kbd> to deselect
        </div>
      )}
    </div>
  );
}

function Centered({ children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {children}
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────────── */

const root = {
  display: 'flex', flexDirection: 'column',
  height: '100vh', width: '100vw', overflow: 'hidden',
  background: '#f8fafc',
};
const topBar = {
  height: 54, display: 'flex', alignItems: 'center',
  justifyContent: 'space-between', gap: 12,
  padding: '0 16px', borderBottom: '1px solid #e2e8f0',
  background: '#fff', flexShrink: 0,
};
const topLeft = { display: 'flex', alignItems: 'center', gap: 12, flex: 1 };
const topRight = { display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end' };
const body = { flex: 1, display: 'flex', overflow: 'hidden' };
const brandMini = { display: 'flex', alignItems: 'center', gap: 7 };
const divider = { width: 1, height: 18, background: '#e2e8f0', flexShrink: 0 };
const ghostBtn = {
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '5px 10px', background: 'none',
  border: '1px solid #e2e8f0', borderRadius: 6,
  cursor: 'pointer', fontSize: 12, color: '#475569',
  fontWeight: 500,
};
const searchWrap = {
  position: 'relative', display: 'flex', alignItems: 'center',
};
const searchIcon = {
  position: 'absolute', left: 10, pointerEvents: 'none',
};
const searchInput = {
  padding: '6px 28px 6px 30px',
  border: '1.5px solid #e2e8f0', borderRadius: 7,
  fontSize: 13, width: 220, background: '#f8fafc',
  color: '#0f172a',
};
const clearBtn = {
  position: 'absolute', right: 8,
  background: 'none', border: 'none',
  cursor: 'pointer', fontSize: 11, color: '#94a3b8',
};
const statChip = (bg, color) => ({
  background: bg, color,
  borderRadius: 5, padding: '3px 9px',
  fontSize: 12, fontWeight: 600,
});
const spinEl = {
  width: 26, height: 26,
  border: '3px solid #e2e8f0', borderTopColor: '#6366f1',
  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
};
const hint = {
  padding: '6px 16px', background: '#fff',
  borderTop: '1px solid #f1f5f9',
  fontSize: 11, color: '#94a3b8', textAlign: 'center',
  flexShrink: 0,
};
const kbd = {
  background: '#f1f5f9', border: '1px solid #e2e8f0',
  borderRadius: 4, padding: '1px 5px', fontSize: 10,
  fontFamily: 'ui-monospace, Consolas, monospace',
};
