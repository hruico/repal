import { useCallback, useMemo, useEffect, useState } from 'react';
import ReactFlow, {
  MiniMap, Controls, Background,
  useNodesState, useEdgesState,
  BezierEdge, MarkerType,
  useReactFlow, ReactFlowProvider,
  Panel,
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

// ── Edge builder — centralises stroke + marker colour in one place ────────────
function buildEdge(e, opacity = 0.15, strokeWidth = 1, highlightColor = null) {
  const stroke = highlightColor ?? (e.data?.isCycle ? T.red : T.indigo);
  return {
    ...e,
    type: 'default',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 10,
      height: 10,
      color: stroke,
    },
    style: {
      stroke,
      strokeWidth,
      opacity,
    },
  };
}

// ── Folder region overlay (Option A from the plan) ────────────────────────────
// Rendered as an absolutely-positioned SVG inside the RF viewport.
// We re-use the same group-keying logic as applyRadialLayout.
function GroupRegions({ nodes, colorMode }) {
  const { getViewport } = useReactFlow();
  const [vp, setVp] = useState({ x: 0, y: 0, zoom: 1 });

  // Recompute on every animation frame so it tracks pan/zoom smoothly
  useEffect(() => {
    let raf;
    const tick = () => {
      setVp(getViewport());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getViewport]);

  // Group visible (non-hidden) nodes by top-level directory
  const groups = useMemo(() => {
    const map = {};
    nodes.forEach(n => {
      if (n.hidden) return;
      const group = n.id.split('/').length > 1 ? n.id.split('/')[0] : '__root__';
      if (!map[group]) map[group] = [];
      map[group].push(n);
    });
    return map;
  }, [nodes]);

  // Palette for region fills — cycle through a few muted accent colours
  const palette = [T.indigo, T.teal, T.amber, T.green, '#a78bfa', '#fb923c'];

  const PAD = 36; // padding around the bounding box

  return (
    <svg
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
        overflow: 'visible',
      }}
    >
      {Object.entries(groups).map(([group, groupNodes], gi) => {
        if (groupNodes.length < 2) return null; // skip singletons

        // Bounding box in graph coords
        const xs = groupNodes.map(n => n.position.x);
        const ys = groupNodes.map(n => n.position.y);
        const minX = Math.min(...xs) - PAD;
        const minY = Math.min(...ys) - PAD;
        const maxX = Math.max(...xs) + PAD + 96; // +96 to account for max node width
        const maxY = Math.max(...ys) + PAD + 96;

        // Transform to screen coords
        const sx = minX * vp.zoom + vp.x;
        const sy = minY * vp.zoom + vp.y;
        const sw = (maxX - minX) * vp.zoom;
        const sh = (maxY - minY) * vp.zoom;

        const accent = palette[gi % palette.length];
        const labelName = group === '__root__' ? '/' : group + '/';

        return (
          <g key={group}>
            <rect
              x={sx} y={sy} width={sw} height={sh}
              rx={16} ry={16}
              fill={`${accent}06`}
              stroke={`${accent}20`}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={sx + 12}
              y={sy + 18}
              fontSize={10 * Math.min(vp.zoom, 1)}
              fill={`${accent}60`}
              fontFamily="var(--font-mono)"
              fontWeight={700}
              letterSpacing="0.04em"
            >
              {labelName}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Inner canvas (needs to be inside ReactFlowProvider for useReactFlow) ──────
function CanvasInner({
  rawNodes, rawEdges, colorMode, onNodeClick,
  impactMode, impactDirection,
}) {
  const nodeTypesMemo = useMemo(() => ({
    fileNode: (props) => <FileNode {...props} colorMode={colorMode} />,
  }), [colorMode]);

  const validNodeIds = useMemo(() => new Set(rawNodes.map(n => n.id)), [rawNodes]);

  const filteredEdges = useMemo(
    () => rawEdges.filter(e => validNodeIds.has(e.source) && validNodeIds.has(e.target)),
    [rawEdges, validNodeIds]
  );

  const layoutKey = useMemo(
    () => [...rawNodes.map(n => n.id)].sort().join('|'),
    [rawNodes]
  );

  const initialLaid = useMemo(
    () => applyRadialLayout(rawNodes, filteredEdges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutKey]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialLaid);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Structural re-layout
  useEffect(() => {
    setNodes(applyRadialLayout(rawNodes, filteredEdges));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  // Search/focus visibility
  useEffect(() => {
    setNodes(prev =>
      prev.map(n => ({ ...n, hidden: !validNodeIds.has(n.id) }))
    );
  }, [validNodeIds, setNodes]);

  // Base edges — dim by default, with arrowheads
  const baseEdges = useMemo(
    () => filteredEdges.map(e => buildEdge(e, 0.15, 1)),
    [filteredEdges]
  );

  useEffect(() => {
    setEdges(baseEdges);
  }, [baseEdges, setEdges]);

  // Adjacency maps
  const dependentsMap = useMemo(() => {
    const map = new Map();
    filteredEdges.forEach(e => {
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

  // Track whether there's an active click-selection so hover doesn't override it
  const [clickSelected, setClickSelected] = useState(null);

  const resetEdges = useCallback(() => {
    setEdges(eds => eds.map(e => buildEdge(e, 0.15, 1)));
  }, [setEdges]);

  const resetNodes = useCallback(() => {
    setNodes(prev => prev.map(n => ({ ...n, style: undefined })));
  }, [setNodes]);

  // ── Node hover (only when no click-selection active) ──────────────────────
  const handleNodeMouseEnter = useCallback((_, node) => {
    if (clickSelected) return; // don't override active selection
    setEdges(eds => eds.map(e => {
      const hit = e.source === node.id || e.target === node.id;
      if (!hit) return e;
      return buildEdge(e, 1, 2, e.data?.isCycle ? T.red : T.indigo);
    }));
  }, [clickSelected, setEdges]);

  const handleNodeMouseLeave = useCallback(() => {
    if (clickSelected) return;
    resetEdges();
  }, [clickSelected, resetEdges]);

  // ── Click handler ─────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((_, node) => {
    setClickSelected(node.id);

    if (impactMode) {
      const { visited, depthMap } = getImpactSet(
        node.id, impactDirection, dependentsMap, dependenciesMap
      );

      const directMap = impactDirection === 'dependents' ? dependentsMap : dependenciesMap;
      const directNeighbors = directMap.get(node.id) || new Set();
      const directCount = directNeighbors.size;
      const transitiveCount = Math.max(0, visited.size - 1 - directCount);

      setNodes(prev => prev.map(n => {
        if (n.id === node.id) return { ...n, style: { filter: `drop-shadow(0 0 8px ${T.amber})`, opacity: 1 } };
        if (visited.has(n.id)) {
          const depth = depthMap.get(n.id) || 1;
          const maxDepth = Math.max(...depthMap.values());
          const fade = maxDepth > 1 ? 1 - (depth - 1) / maxDepth * 0.45 : 1;
          return { ...n, style: { filter: `drop-shadow(0 0 5px ${T.teal}90)`, opacity: fade } };
        }
        return { ...n, style: { opacity: 0.08, filter: 'grayscale(0.9)' } };
      }));

      setEdges(eds => eds.map(e => {
        const isConnected = visited.has(e.source) && visited.has(e.target);
        return isConnected
          ? buildEdge(e, 0.9, 1.5, T.teal)
          : buildEdge(e, 0.06, 0.5);
      }));

      onNodeClick(node, { impactMode: true, impactDirection, totalAffected: visited.size - 1, directCount, transitiveCount });
    } else {
      resetNodes();
      setEdges(eds => eds.map(e => {
        const hit = e.source === node.id || e.target === node.id;
        return hit
          ? buildEdge(e, 1, 2, T.amber)
          : buildEdge(e, 0.1, 0.8);
      }));
      onNodeClick(node, null);
    }
  }, [impactMode, impactDirection, dependentsMap, dependenciesMap, onNodeClick, setEdges, setNodes, resetNodes]);

  const handlePaneClick = useCallback(() => {
    setClickSelected(null);
    resetEdges();
    resetNodes();
  }, [resetEdges, resetNodes]);

  const miniMapColor = useCallback((n) =>
    n.data?.in_cycle ? T.red : nodeColor(n.data ?? {}, colorMode),
  [colorMode]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Folder region overlay — sits behind the RF canvas */}
      <GroupRegions nodes={nodes} colorMode={colorMode} />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypesMemo}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        defaultEdgeOptions={{
          type: 'default',
          markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color: T.indigo },
          style: { stroke: T.indigo, strokeWidth: 1, opacity: 0.15 },
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

// ── Public export — wraps with ReactFlowProvider for useReactFlow inside ──────
export default function GraphCanvas(props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
