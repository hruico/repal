import { useCallback, useMemo, useEffect, useState } from 'react';
import ReactFlow, {
  MiniMap, Controls, Background,
  useNodesState, useEdgesState,
  BezierEdge, MarkerType,
  useReactFlow, ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { T } from '../theme';
import FileNode, { nodeColor } from './FileNode';
import GraphLegend from './GraphLegend';

const edgeTypes = { default: BezierEdge };

// ── Node dimensions (must match FileNode.jsx) ─────────────────────────────────
const NODE_W = 140;   // actual rendered width  + margin
const NODE_H = 70;    // actual rendered height + margin
const COL_GAP = 90;   // horizontal gap between columns
const ROW_GAP = 22;   // vertical gap between rows

// ── Layered (hierarchical) layout ────────────────────────────────────────────
// Groups nodes into topological layers (depth from sources).
// Nodes in the same layer stack vertically; layers spread horizontally.
// Cycle members are placed together in the middle layer.
function applyLayeredLayout(nodes, edges) {
  if (nodes.length === 0) return [];

  const ids = new Set(nodes.map(n => n.id));

  // Build adjacency (source → targets) and reverse (target → sources)
  const out = new Map();   // source → [target]
  const inc = new Map();   // target → [source]
  nodes.forEach(n => { out.set(n.id, []); inc.set(n.id, []); });
  edges.forEach(e => {
    if (ids.has(e.source) && ids.has(e.target)) {
      out.get(e.source)?.push(e.target);
      inc.get(e.target)?.push(e.source);
    }
  });

  // ── Kahn's BFS to assign layers ───────────────────────────────────────────
  // Nodes whose in-degree drops to 0 are "ready" — they go into the next layer.
  // Cycle members never fully drain to 0; we handle them separately.
  const inDeg = new Map();
  nodes.forEach(n => inDeg.set(n.id, (inc.get(n.id) || []).length));

  const layerOf = new Map();
  const queue = nodes.filter(n => inDeg.get(n.id) === 0).map(n => n.id);
  queue.forEach(id => layerOf.set(id, 0));

  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const curLayer = layerOf.get(cur);
    (out.get(cur) || []).forEach(tgt => {
      const newDeg = inDeg.get(tgt) - 1;
      inDeg.set(tgt, newDeg);
      const proposed = curLayer + 1;
      if (!layerOf.has(tgt) || layerOf.get(tgt) < proposed) {
        layerOf.set(tgt, proposed);
      }
      if (newDeg === 0) queue.push(tgt);
    });
  }

  // Any node not yet assigned is part of a cycle — put it in a "middle" layer
  const maxLayer = layerOf.size > 0 ? Math.max(...layerOf.values()) : 0;
  const cycleLayer = Math.floor(maxLayer / 2) + 1;
  nodes.forEach(n => {
    if (!layerOf.has(n.id)) layerOf.set(n.id, cycleLayer);
  });

  // ── Group nodes by layer ──────────────────────────────────────────────────
  const layers = new Map();
  nodes.forEach(n => {
    const l = layerOf.get(n.id);
    if (!layers.has(l)) layers.set(l, []);
    layers.get(l).push(n);
  });

  // Sort layers by key, sort each layer's nodes by their degree (hub first)
  const degree = new Map();
  nodes.forEach(n => degree.set(n.id, (out.get(n.id)?.length || 0) + (inc.get(n.id)?.length || 0)));

  const sortedLayers = [...layers.entries()]
    .sort(([a], [b]) => a - b)
    .map(([l, ns]) => [l, [...ns].sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0))]);

  // ── Assign x/y positions ──────────────────────────────────────────────────
  const positioned = [];
  sortedLayers.forEach(([, layerNodes], colIdx) => {
    const colX = colIdx * (NODE_W + COL_GAP);
    const totalH = layerNodes.length * NODE_H + (layerNodes.length - 1) * ROW_GAP;
    const startY = -totalH / 2;
    layerNodes.forEach((node, rowIdx) => {
      positioned.push({
        ...node,
        position: {
          x: colX,
          y: startY + rowIdx * (NODE_H + ROW_GAP),
        },
      });
    });
  });

  // Centre the whole layout
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

// ── Edge builder ──────────────────────────────────────────────────────────────
function buildEdge(e, opacity = 0.25, strokeWidth = 1, highlightColor = null) {
  const isCycle = e.data?.isCycle;
  const stroke = highlightColor ?? (isCycle ? T.red : 'rgba(140,150,180,0.7)');
  return {
    ...e,
    type: 'default',
    markerEnd: { type: MarkerType.ArrowClosed, width: 9, height: 9, color: stroke },
    style: {
      stroke,
      strokeWidth,
      opacity,
      strokeDasharray: highlightColor ? 'none' : (isCycle ? '4 3' : '5 4'),
    },
  };
}

// ── Folder region overlay ─────────────────────────────────────────────────────
function GroupRegions({ nodes }) {
  const { getViewport } = useReactFlow();
  const [vp, setVp] = useState({ x: 0, y: 0, zoom: 1 });

  useEffect(() => {
    let raf;
    const tick = () => { setVp(getViewport()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getViewport]);

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

  const palette = [T.indigo, T.teal, T.amber, T.green, '#a78bfa', '#fb923c'];
  const PAD = 28;

  return (
    <svg style={{
      position: 'absolute', inset: 0,
      width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 0, overflow: 'visible',
    }}>
      {Object.entries(groups).map(([group, groupNodes], gi) => {
        if (groupNodes.length < 2) return null;
        const xs = groupNodes.map(n => n.position.x);
        const ys = groupNodes.map(n => n.position.y);
        const minX = Math.min(...xs) - PAD;
        const minY = Math.min(...ys) - PAD;
        const maxX = Math.max(...xs) + NODE_W + PAD;
        const maxY = Math.max(...ys) + NODE_H + PAD;
        const sx = minX * vp.zoom + vp.x;
        const sy = minY * vp.zoom + vp.y;
        const sw = (maxX - minX) * vp.zoom;
        const sh = (maxY - minY) * vp.zoom;
        const accent = palette[gi % palette.length];
        const labelName = group === '__root__' ? '/' : group + '/';
        return (
          <g key={group}>
            <rect x={sx} y={sy} width={sw} height={sh}
              rx={12} ry={12}
              fill={`${accent}05`}
              stroke={`${accent}18`}
              strokeWidth={1}
              strokeDasharray="5 4"
            />
            <text x={sx + 10} y={sy + 16}
              fontSize={Math.max(9, 10 * Math.min(vp.zoom, 1))}
              fill={`${accent}55`}
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

// ── Canvas gradient background ────────────────────────────────────────────────
// The reddish-purple radial glow from the React Flow site screenshot.
function CanvasGradient() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      zIndex: 0, pointerEvents: 'none',
      background: `
        radial-gradient(ellipse 55% 45% at 68% 38%, rgba(110,30,80,0.22) 0%, transparent 70%),
        radial-gradient(ellipse 40% 35% at 30% 65%, rgba(40,20,90,0.18) 0%, transparent 65%),
        #080a0f
      `,
    }} />
  );
}

// ── Inner canvas ──────────────────────────────────────────────────────────────
function CanvasInner({ rawNodes, rawEdges, colorMode, onNodeClick, impactMode, impactDirection }) {
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
    () => applyLayeredLayout(rawNodes, filteredEdges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutKey]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialLaid);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setNodes(applyLayeredLayout(rawNodes, filteredEdges));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  useEffect(() => {
    setNodes(prev => prev.map(n => ({ ...n, hidden: !validNodeIds.has(n.id) })));
  }, [validNodeIds, setNodes]);

  const baseEdges = useMemo(
    () => filteredEdges.map(e => buildEdge(e, 0.18, 1)),
    [filteredEdges]
  );

  useEffect(() => { setEdges(baseEdges); }, [baseEdges, setEdges]);

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

  const [clickSelected, setClickSelected] = useState(null);

  const resetEdges = useCallback(() => {
    setEdges(eds => eds.map(e => buildEdge(e, 0.18, 1)));
  }, [setEdges]);

  const resetNodes = useCallback(() => {
    setNodes(prev => prev.map(n => ({ ...n, style: undefined })));
  }, [setNodes]);

  const handleNodeMouseEnter = useCallback((_, node) => {
    if (clickSelected) return;
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

  const handleNodeClick = useCallback((_, node) => {
    setClickSelected(node.id);

    if (impactMode) {
      const { visited, depthMap } = getImpactSet(node.id, impactDirection, dependentsMap, dependenciesMap);
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
        return isConnected ? buildEdge(e, 0.9, 1.5, T.teal) : buildEdge(e, 0.06, 0.5);
      }));

      onNodeClick(node, { impactMode: true, impactDirection, totalAffected: visited.size - 1, directCount, transitiveCount });
    } else {
      resetNodes();
      setEdges(eds => eds.map(e => {
        const hit = e.source === node.id || e.target === node.id;
        return hit ? buildEdge(e, 1, 2, T.amber) : buildEdge(e, 0.08, 0.8);
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
      {/* Canvas gradient — reddish-purple glow like the RF site */}
      <CanvasGradient />

      {/* Folder region overlay */}
      <GroupRegions nodes={nodes} />

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
        fitViewOptions={{ padding: 0.16 }}
        defaultEdgeOptions={{
          type: 'default',
          markerEnd: { type: MarkerType.ArrowClosed, width: 9, height: 9, color: 'rgba(140,150,180,0.5)' },
          style: { stroke: 'rgba(140,150,180,0.5)', strokeWidth: 1, opacity: 0.18, strokeDasharray: '5 4' },
          animated: false,
        }}
        style={{ background: 'transparent' }}
      >
        <MiniMap nodeColor={miniMapColor} maskColor="rgba(7,8,12,0.82)" nodeStrokeWidth={0} zoomable pannable />
        <Controls />
        <Background variant="dots" gap={24} size={1} color="rgba(255,255,255,0.055)" />
      </ReactFlow>

      <GraphLegend colorMode={colorMode} />

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
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.teal, display: 'inline-block', boxShadow: `0 0 6px ${T.teal}` }} />
          IMPACT MODE · {impactDirection === 'dependents' ? 'Who breaks?' : 'What does it need?'}
        </div>
      )}
    </div>
  );
}

export default function GraphCanvas(props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
