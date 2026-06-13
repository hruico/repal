import { useState, useEffect } from 'react';
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

  const loadGraph = () => {
    setLoading(true);
    setError('');
    api.getGraph(repoId)
      .then(setGraphData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadGraph(); }, [repoId]);

  const filteredNodes = (graphData?.nodes ?? []).filter(n =>
    n.data.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={topBar}>
        <button onClick={() => navigate('/')} style={backBtn}>← Dashboard</button>
        {graphData?.repo && (
          <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}>
            {graphData.repo.name}
          </span>
        )}
        <input
          placeholder="Filter files…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={searchInput}
        />
        {graphData && (
          <>
            <span style={badge}>{filteredNodes.length} files</span>
            <span style={{ ...badge, background: '#ede9fe', color: '#6366f1' }}>
              {graphData.edges.length} dependencies
            </span>
          </>
        )}
        <button onClick={loadGraph} style={backBtn} title="Re-analyze repository">
          ↻ Re-analyze
        </button>
      </div>

      {/* Canvas + Side panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          {loading && (
            <Status>Traversing repository and computing metrics…</Status>
          )}
          {error && (
            <Status color="#ef4444">
              {error}
              <br />
              <button onClick={() => navigate('/')} style={{ ...backBtn, marginTop: 12 }}>
                Back to Dashboard
              </button>
            </Status>
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
    </div>
  );
}

function Status({ children, color = '#6b7280' }) {
  return (
    <div style={{ padding: 60, textAlign: 'center', color, fontSize: 14, lineHeight: 1.8 }}>
      {children}
    </div>
  );
}

const topBar = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '10px 20px', borderBottom: '1px solid #e5e7eb',
  background: '#fff', flexShrink: 0, flexWrap: 'wrap',
};
const backBtn = {
  padding: '6px 14px', background: '#f3f4f6',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
};
const searchInput = {
  padding: '6px 12px', border: '1px solid #d1d5eb',
  borderRadius: 8, fontSize: 13, width: 200,
};
const badge = {
  background: '#f0fdf4', color: '#16a34a',
  borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600,
};
