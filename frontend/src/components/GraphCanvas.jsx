import { useCallback, useMemo, useEffect, useState } from 'react';
import ReactFlow, {
  MiniMap, Controls, Background,
  useNodesState, useEdgesState,
  BezierEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { T } from '../theme';
import FileNode, { nodeColor } from './FileNode';
import GraphLegend from './GraphLegend';

const edgeTypes = { default: BezierEdge };

// ── Radial layout ─────────────────────────────────────────────────────────────
function applyRadialLayout(nodes, edges) {
  if (nodes.length === 0) return [];

  const degree = {};
  edges.forEach(e => {
    degree[e.source] = (degree[e.source] || 0) + 1;
    degree[e.target] = (degree[e.target] || 0) + 1;
  });

  const groups = {};
  nodes.forEach(n => {
    const parts = n.id.split('/');
    const group = parts.length > 1 ? parts[0] : '__root__';
    if (!groups[group]) groups[group] = [];
    groups[group].push(n);
  });

  const groupKeys = Object.keys(groups);
  const numGroups = groupKeys.length;
  const outerRadius = Math.max(280, numGroups * 80);
  const positioned = [];

  groupKeys.forEach((gk, gi) => {
    const groupNodes = groups[gk];
    const groupAngle = (gi / numGroups) * 2 * Math.PI - Math.PI / 2;
    const gx = Math.cos(groupAngle) * outerRadius;
    const gy = Math.sin(groupAngle) * outerRadius;

    if (groupNodes.length === 1) {
      positioned.push({ ...groupNodes[0], position: { x: gx, y: gy } });
      return;
    }

    const sorted = [...groupNodes].sort((a, b) =>
      (degree[b.id] || 0) - (degree[a.id] || 0)
    );
    const innerRadius = Math.max(60, sorted.length * 18);

    sorted.forEach((node, ni) => {
      const localAngle = (ni / sorted.length) * 2 * Math.PI - Math.PI / 2;
      const r = ni === 0 ? 0 : innerRadius;
      positioned.push({
        ...node,
        position: {
          x: gx + Math.cos(localAngle) * r,
          y: gy + Math.sin(localAngle) * r,
        },
      });
    });
  });

  const xs = positioned.map(n => n.position.x);
  const ys = positioned.map(n => n.position.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

  return positioned.map(n => ({
    ...n,
    position: { x: n.position.x - cx, y: n.position.y - cy },
  }));
}

// ── BFS impact traversal ──────────────────────────────────────────────────────
function getImpactSet(startId, direction, dependentsMap, dependenciesMap) {
  const map = direction === 'dependents' ? dependentsMap : dependenciesMap;
  const visited = new Set([startId]);
  const queue = [startId];
  const depthMap = new Map([[startId, 0]]);

  while (queue.length) {
    const current = queue.shift();
    const neighbors = map.get(current) || new Set();
    neighbors.forEach(n => {
      if (!visited.has(n)) {
        visited.add(n);
        depthMap.set(n, depthMap.get(current) + 1);
        queue.push(n);
      }
    });
  }

  return { visited, depthMap };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GraphCanvas({
  rawNodes,
  rawEdges,
  colorMode = 'ext',
  onNodeClick,
  impactMode = false,
  impactDirection = 'dependents',
}) {
  // ── Node type — rebuilt only when colorMode changes ──────────────────────
  const nodeTypesMemo = useMemo(() => ({
    fileNode: (props) => <FileNode {...props} colorMode={colorMode} />,
  }), [colorMode]);

  // ── Filter edges to only those between visible nodes ──────────────────────
  const validNodeIds = useMemo(() => new Set(rawNodes.map(n => n.id)), [rawNodes]);

  const filteredEdges = useMemo(
    () => rawEdges.filter(e => validNodeIds.has(e.source) && validNodeIds.has(e.target)),
    [rawEdges, validNodeIds]
  );

  // ── Stable layout key: only changes when the SET of node IDs changes ──────
  // Search/focus filtering changes which nodes are in rawNodes, but we want
  // to preserve positions for nodes that are still present. We re-layout only
  // when the sorted ID list changes (structural change: new repo or re-analyze).
  const layoutKey = useMemo(
    () => [...rawNodes.map(n => n.id)].sort().join('|'),
    [rawNodes]
  );

  // ── Initial layout ────────────────────────────────────────────────────────
  const initialLaid = useMemo(
    () => applyRadialLayout(rawNodes, filteredEdges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutKey] // intentionally keyed on layoutKey, not rawNodes/filteredEdges
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialLaid);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // ── Re-layout on structural change (new repo loaded, re-analyzed) ─────────
  useEffect(() => {
    setNodes(applyRadialLayout(rawNodes, filteredEdges));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]); // NOT rawNodes — avoids fighting user drags on every render

  // ── Sync visible nodes for search/focus (toggle `hidden`, keep positions) ─
  useEffect(() => {
    setNodes(prev =>
      prev.map(n => ({
        ...n,
        hidden: !validNodeIds.has(n.id),
      }))
    );
  }, [validNodeIds, setNodes]);

  // ── Sync edges ────────────────────────────────────────────────────────────
  const baseEdges = useMemo(
    () => filteredEdges.map(e => ({
      ...e,
      type: 'default',
      style: {
        stroke: e.data?.isCycle ? T.red : `${T.indigo}70`,
        strokeWidth: 1,
        opacity: 1,
      },
    })),
    [filteredEdges]
  );

  useEffect(() => {
    setEdges(baseEdges);
  }, [baseEdges, setEdges]);

  // ── Adjacency maps for Impact Mode ───────────────────────────────────────
  // dependentsMap:   nodeId → Set of nodes that import it (who breaks if I change this?)
  // dependenciesMap: nodeId → Set of nodes it imports (what does this depend on?)
  const dependentsMap = useMemo(() => {
    const map = new Map();
    filteredEdges.forEach(e => {
      // edge: source imports target → target's dependents include source
      if (!map.has(e.target)) map.set(e.target, new Set());
      map.get(e.target).add(e.source);
    });
    return map;
  }, [filteredEdges]);

  const dependenciesMap = useMemo(() => {
    const map = new Map();
    filteredEdges.forEach(e => {
      if (!map.has(e.source)) map.set(e.source, new Set());
      map.get(e.source).add(e.target);
    });
    return map;
  }, [filteredEdges]);

  // ── Default edge/node reset helpers ──────────────────────────────────────
  const resetEdges = useCallback(() => {
    setEdges(eds => eds.map(e => ({
      ...e,
      style: {
        stroke: e.data?.isCycle ? T.red : `${T.indigo}70`,
        strokeWidth: 1,
        opacity: 1,
      },
    })));
  }, [setEdges]);

  const resetNodes = useCallback(() => {
    setNodes(prev => prev.map(n => ({ ...n, style: undefined })));
  }, [setNodes]);

  // ── Click handler ─────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((_, node) => {
    if (impactMode) {
      // ── Impact Mode: BFS transitive traversal ──────────────────────────
      const { visited, depthMap } = getImpactSet(
        node.id, impactDirection, dependentsMap, dependenciesMap
      );

      // Count direct vs transitive
      const directMap = impactDirection === 'dependents'
        ? dependentsMap : dependenciesMap;
      const directNeighbors = directMap.get(node.id) || new Set();
      const directCount  = directNeighbors.size;
      const transitiveCount = visited.size - 1 - directCount; // exclude self + direct

      // Style nodes by depth
      setNodes(prev => prev.map(n => {
        if (n.id === node.id) {
          return {
            ...n,
            style: {
              filter: `drop-shadow(0 0 8px ${T.amber})`,
              opacity: 1,
            },
          };
        }
        if (visited.has(n.id)) {
          const depth = depthMap.get(n.id) || 1;
          const maxDepth = Math.max(...depthMap.values());
          const fade = maxDepth > 1 ? 1 - (depth - 1) / maxDepth * 0.45 : 1;
          return {
            ...n,
            style: {
              filter: `drop-shadow(0 0 5px ${T.teal}90)`,
              opacity: fade,
            },
          };
        }
        return { ...n, style: { opacity: 0.1, filter: 'grayscale(0.8)' } };
      }));

      // Style edges
      setEdges(eds => eds.map(e => {
        const inPath =
          (visited.has(e.source) && visited.has(e.target)) &&
          (e.source === node.id || e.target === node.id ||
           visited.has(e.source));
        const isConnected =
          (impactDirection === 'dependents' && visited.has(e.source) && visited.has(e.target)) ||
          (impactDirection === 'dependencies' && visited.has(e.source) && visited.has(e.target));
        return {
          ...e,
          style: {
            stroke: isConnected ? T.teal : `${T.border}40`,
            strokeWidth: isConnected ? 1.5 : 0.5,
            opacity: isConnected ? 0.9 : 0.1,
          },
        };
      }));

      onNodeClick(node, {
        impactMode: true,
        impactDirection,
        totalAffected: visited.size - 1,
        directCount,
        transitiveCount: Math.max(0, transitiveCount),
      });
    } else {
      // ── Normal Mode: highlight direct edges ───────────────────────────
      resetNodes();
      setEdges(eds => eds.map(e => {
        const hit = e.source === node.id || e.target === node.id;
        return {
          ...e,
          style: {
            stroke: hit ? T.amber : (e.data?.isCycle ? `${T.red}30` : `${T.indigo}20`),
            strokeWidth: hit ? 2 : 1,
            opacity: hit ? 1 : 0.18,
          },
        };
      }));
      onNodeClick(node, null);
    }
  }, [
    impactMode, impactDirection,
    dependentsMap, dependenciesMap,
    onNodeClick, setEdges, setNodes, resetNodes,
  ]);

  const handlePaneClick = useCallback(() => {
    resetEdges();
    resetNodes();
  }, [resetEdges, resetNodes]);

  const miniMapColor = useCallback((n) =>
    n.data?.in_cycle ? T.red : nodeColor(n.data ?? {}, colorMode),
  [colorMode]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypesMemo}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        defaultEdgeOptions={{
          type: 'default',
          style: { stroke: `${T.indigo}70`, strokeWidth: 1 },
          animated: false,
        }}
      >
        <MiniMap
          nodeColor={miniMapColor}
          maskColor="rgba(13,17,23,0.8)"
          nodeStrokeWidth={0}
          zoomable pannable
        />
        <Controls />
        <Background variant="dots" gap={28} size={1} color={T.border} />
      </ReactFlow>
      <GraphLegend colorMode={colorMode} />

      {/* Impact Mode indicator badge */}
      {impactMode && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: `${T.teal}18`, border: `1px solid ${T.teal}50`,
          borderRadius: 20, padding: '4px 14px',
          fontSize: 11, fontWeight: 600, color: T.teal,
          fontFamily: 'var(--font-mono)', pointerEvents: 'none',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: T.teal, display: 'inline-block',
            boxShadow: `0 0 6px ${T.teal}`,
          }} />
          IMPACT MODE · {impactDirection === 'dependents' ? 'Who breaks?' : 'What does it need?'}
        </div>
      )}
    </div>
  );
}
