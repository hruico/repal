import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { T } from '../theme';
import GraphCanvas from '../components/GraphCanvas';
import SidePanel from '../components/SidePanel';
import FolderTree from '../components/FolderTree';
import OverviewPanel from '../components/OverviewPanel';

export default function GraphView() {
  const { repoId } = useParams();
  const navigate = useNavigate();

  const [graphData, setGraphData] = useState(null);
  const [treeData,  setTreeData]  = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [impactInfo,   setImpactInfo]   = useState(null);
  const [search,    setSearch]    = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(true);
  const [colorMode, setColorMode] = useState('ext');
  const [focusId,   setFocusId]   = useState(null);
  const [showTree,  setShowTree]  = useState(false);
  const [impactMode,      setImpactMode]      = useState(false);
  const [impactDirection, setImpactDirection] = useState('dependents');

  // ── Overview state ──────────────────────────────────────────────────────────
  const [overview,          setOverview]          = useState('');
  const [overviewLoading,   setOverviewLoading]   = useState(false);
  const [overviewError,     setOverviewError]     = useState('');
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);

  const fetchOverview = useCallback((force = false) => {
    setOverviewLoading(true);
    setOverviewError('');
    api.getOverview(repoId, force)
      .then(res => setOverview(res.overview))
      .catch(e => setOverviewError(e.message))
      .finally(() => setOverviewLoading(false));
  }, [repoId]);

  const loadGraph = useCallback(() => {
    setLoading(true); setError(''); setSelectedNode(null); setFocusId(null);
    setImpactInfo(null); setImpactMode(false);
    Promise.all([api.getGraph(repoId), api.getTree(repoId)])
      .then(([g, t]) => { setGraphData(g); setTreeData(t.tree); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [repoId]);

  useEffect(() => { loadGraph(); }, [loadGraph]);
  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        setSelectedNode(null); setFocusId(null); setImpactInfo(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Subgraph focus: keep selected node + immediate neighbours
  const { visibleNodes, visibleEdges } = useMemo(() => {
    const all = (graphData?.nodes ?? []).filter(n =>
      n.data.label.toLowerCase().includes(search.toLowerCase())
    );
    if (!focusId) return { visibleNodes: all, visibleEdges: graphData?.edges ?? [] };

    const neighbors = new Set([focusId]);
    (graphData?.edges ?? []).forEach(e => {
      if (e.source === focusId) neighbors.add(e.target);
      if (e.target === focusId) neighbors.add(e.source);
    });
    const vn = all.filter(n => neighbors.has(n.id));
    const vnIds = new Set(vn.map(n => n.id));
    const ve = (graphData?.edges ?? []).filter(e => vnIds.has(e.source) && vnIds.has(e.target));
    return { visibleNodes: vn, visibleEdges: ve };
  }, [graphData, search, focusId]);

  const stats = graphData?.stats;

  const handleNodeClick = (node, impactData) => {
    setSelectedNode(node);
    setImpactInfo(impactData ?? null);
  };

  const handleTreeClick = (id) => {
    const node = graphData?.nodes.find(n => n.id === id);
    if (node) { setSelectedNode(node); setFocusId(id); }
  };

  return (
    <div style={root}>

      {/* ── Toolbar ── */}
      <header style={toolbar}>
        <div style={toolLeft}>
          <button onClick={() => navigate('/')} style={iconBtn} title="Dashboard">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div style={vline} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={T.indigo} strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke={T.indigo} strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="#a78bfa" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontWeight: 600, fontSize: 13, color: T.textPrimary, fontFamily: 'var(--font-mono)' }}>
              {graphData?.repo?.name ?? '…'}
            </span>
          </div>
        </div>

        {/* Search */}
        <div style={searchWrap}>
          <svg style={{ position: 'absolute', left: 9, pointerEvents: 'none' }}
            width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke={T.textMuted} strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            placeholder="Filter files…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={searchInput}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 7, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: T.textMuted }}>
              ✕
            </button>
          )}
        </div>

        <div style={toolRight}>
          {/* Stats */}
          {stats && (
            <div style={{ display: 'flex', gap: 5 }}>
              <Chip color={T.green}>{visibleNodes.length} files</Chip>
              <Chip color={T.indigo}>{visibleEdges.length} deps</Chip>
              {stats.cycle_count > 0 && <Chip color={T.red}>⚑ {stats.cycle_count}</Chip>}
              {focusId && (
                <button onClick={() => setFocusId(null)} style={focusPill}>
                  ✕ Focus
                </button>
              )}
            </div>
          )}

          <div style={vline} />

          {/* Color mode */}
          <select value={colorMode} onChange={e => setColorMode(e.target.value)} style={sel}>
            <option value="ext">Language</option>
            <option value="loc">LoC heat</option>
            <option value="cc">CC heat</option>
            <option value="risk">Risk hotspots</option>
          </select>

          {/* Impact Mode toggle */}
          <button
            onClick={() => { setImpactMode(m => !m); setImpactInfo(null); }}
            style={{
              ...iconBtn,
              color: impactMode ? T.teal : T.textSecondary,
              background: impactMode ? `${T.teal}15` : 'transparent',
              borderColor: impactMode ? `${T.teal}50` : T.border,
            }}
            title="Impact Mode — blast radius analysis"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
            Impact
          </button>

          {/* Impact direction — only visible when impact mode is on */}
          {impactMode && (
            <select
              value={impactDirection}
              onChange={e => { setImpactDirection(e.target.value); setImpactInfo(null); }}
              style={{ ...sel, borderColor: `${T.teal}50`, color: T.teal }}
              title="Traversal direction"
            >
              <option value="dependents">Who breaks? ↓</option>
              <option value="dependencies">Needs what? ↑</option>
            </select>
          )}

          {/* Tree toggle */}
          <button
            onClick={() => setShowTree(t => !t)}
            style={{ ...iconBtn, color: showTree ? T.indigo : T.textSecondary,
              background: showTree ? `${T.indigo}15` : 'transparent',
              borderColor: showTree ? `${T.indigo}40` : T.border,
            }}
            title="Toggle folder tree"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </button>

          {/* CSV export */}
          {graphData && (
            <button
              onClick={() => api.exportCsv(repoId, graphData.repo.name)}
              style={iconBtn}
              title="Export metrics as CSV"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          )}

          {/* Re-analyze */}
          <button onClick={loadGraph} style={iconBtn} title="Re-analyze">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Body — canvas fills full area, panels float on top ── */}
      <div style={body}>

        {/* Folder tree panel — still a sidebar, not floating */}
        {showTree && (
          <div style={treePanel}>
            <div style={treePanelHead}>EXPLORER</div>
            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 12 }}>
              <FolderTree
                node={treeData}
                onFileClick={handleTreeClick}
                activeId={selectedNode?.id}
              />
            </div>
          </div>
        )}

        {/* Canvas — fills remaining space, floating panels sit on top */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {loading && (
            <Center>
              <div style={bigSpin} />
              <div style={{ color: T.textSecondary, fontSize: 13 }}>Traversing repository…</div>
              <div style={{ color: T.textMuted, fontSize: 11 }}>
                Computing metrics and building dependency graph
              </div>
            </Center>
          )}
          {error && (
            <Center>
              <div style={{ fontSize: 26, marginBottom: 8 }}>⚠</div>
              <div style={{ color: T.red, fontSize: 13, fontWeight: 600, maxWidth: 280, textAlign: 'center' }}>
                {error}
              </div>
              <button onClick={() => navigate('/')} style={{ ...iconBtn, marginTop: 12 }}>
                ← Dashboard
              </button>
            </Center>
          )}
          {!loading && !error && graphData && (
            <GraphCanvas
              rawNodes={visibleNodes}
              rawEdges={visibleEdges}
              colorMode={colorMode}
              onNodeClick={handleNodeClick}
              impactMode={impactMode}
              impactDirection={impactDirection}
            />
          )}

          {/* ── Floating Overview Panel ── */}
          {!loading && !error && graphData && (
            <OverviewPanel
              overview={overview}
              loading={overviewLoading}
              error={overviewError}
              collapsed={overviewCollapsed}
              onToggle={() => setOverviewCollapsed(c => !c)}
              onRegenerate={() => { setOverview(''); fetchOverview(true); }}
            />
          )}

          {/* ── Floating Side Panel ── */}
          {!loading && !error && graphData && (
            <SidePanel
              selectedNode={selectedNode}
              repoId={repoId}
              impactInfo={impactInfo}
              graphStats={stats}
              overview={overview}
              overviewLoading={overviewLoading}
              onClose={() => { setSelectedNode(null); setImpactInfo(null); }}
            />
          )}
        </div>
      </div>

      {/* Hint bar */}
      {!loading && !error && (
        <div style={hintBar}>
          Scroll to zoom · Drag to pan · Click node to inspect ·{' '}
          <kbd style={kbd}>Esc</kbd> to deselect
          {impactMode && (
            <span style={{ marginLeft: 10, color: T.teal, fontWeight: 600 }}>
              · Impact Mode active — click a node to trace blast radius
            </span>
          )}
          {stats && (
            <span style={{ marginLeft: 16, color: T.textMuted }}>
              {stats.total_loc.toLocaleString()} total LoC
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Center({ children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {children}
    </div>
  );
}

function Chip({ color, children }) {
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 20,
      fontWeight: 600, background: `${color}15`,
      color, border: `1px solid ${color}28`,
    }}>
      {children}
    </span>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────────── */

const root = {
  display: 'flex', flexDirection: 'column',
  height: '100vh', width: '100vw', overflow: 'hidden',
  background: T.bg0,
};
const toolbar = {
  height: 50, display: 'flex', alignItems: 'center',
  justifyContent: 'space-between', gap: 10,
  padding: '0 14px', borderBottom: `1px solid ${T.border}`,
  background: T.bg1, flexShrink: 0,
};
const toolLeft  = { display: 'flex', alignItems: 'center', gap: 10, flex: 1 };
const toolRight = { display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' };
const body = { flex: 1, display: 'flex', overflow: 'hidden' };
const vline = { width: 1, height: 16, background: T.border, flexShrink: 0 };
const iconBtn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  padding: '5px 8px', background: 'transparent',
  border: `1px solid ${T.border}`, borderRadius: 6,
  cursor: 'pointer', color: T.textSecondary,
  fontFamily: 'var(--font-sans)', fontSize: 12,
};
const searchWrap = { position: 'relative', display: 'flex', alignItems: 'center' };
const searchInput = {
  padding: '5px 24px 5px 26px',
  border: `1px solid ${T.border}`, borderRadius: 6,
  fontSize: 12, width: 200,
  background: T.bg2, color: T.textPrimary,
  fontFamily: 'var(--font-sans)',
};
const sel = {
  padding: '4px 8px',
  background: T.bg2, border: `1px solid ${T.border}`,
  borderRadius: 6, color: T.textSecondary,
  fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-sans)',
};
const focusPill = {
  padding: '2px 8px', borderRadius: 20,
  background: `${T.amber}15`, color: T.amber,
  border: `1px solid ${T.amber}30`,
  cursor: 'pointer', fontSize: 11, fontWeight: 600,
  fontFamily: 'var(--font-sans)',
};
const treePanel = {
  width: 220, borderRight: `1px solid ${T.border}`,
  background: T.bg1, display: 'flex', flexDirection: 'column',
  flexShrink: 0, overflow: 'hidden',
};
const treePanelHead = {
  padding: '10px 12px 8px',
  fontSize: 10, fontWeight: 700, color: T.textMuted,
  letterSpacing: '0.08em', fontFamily: 'var(--font-mono)',
  borderBottom: `1px solid ${T.border}`, flexShrink: 0,
};
const bigSpin = {
  width: 28, height: 28,
  border: `3px solid ${T.border}`, borderTopColor: T.indigo,
  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
};
const hintBar = {
  padding: '5px 16px', borderTop: `1px solid ${T.border}`,
  fontSize: 10, color: T.textMuted, textAlign: 'center',
  background: T.bg1, flexShrink: 0, fontFamily: 'var(--font-mono)',
};
const kbd = {
  background: T.bg2, border: `1px solid ${T.border}`,
  borderRadius: 3, padding: '1px 5px', fontSize: 10,
  fontFamily: 'var(--font-mono)',
};
