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

// ── Node dimensions (must match FileNode.jsx exactly) ────────────────────────
const NODE_W   = 140;
const NODE_H   = 78;
const COL_GAP  = 160;  // horizontal gap between dep-layers within a group
const ROW_GAP  = 48;   // vertical gap between nodes in the same column
const GRP_GAP  = 120;  // vertical gap BETWEEN folder groups

// ── Per-group layered layout ──────────────────────────────────────────────────
// 1. Split nodes by top-level directory (folder group).
// 2. Run Kahn's BFS topological layering per group independently.
// 3. Stack groups vertically with GRP_GAP between them.
// This guarantees all files from the same folder stay in their own visual block,
// with no interleaving, so the GroupRegions overlay is always unambiguous.

function _layerGroup(groupNodes, edges, allIds) {
  if (groupNodes.length === 0) return [];
  const ids = new Set(groupNodes.map(n => n.id));

  const out = new Map();
  const inc = new Map();
  groupNodes.forEach(n => { out.set(n.id, []); inc.set(n.id, []); });

  edges.forEach(e => {
    // Only count edges where BOTH endpoints are in this group for layer calc
    if (ids.has(e.source) && ids.has(e.target)) {
      out.get(e.source)?.push(e.target);
      inc.get(e.target)?.push(e.source);
    }
  });

  const inDeg = new Map();
  groupNodes.forEach(n => inDeg.set(n.id, (inc.get(n.id) || []).length));

  const layerOf = new Map();
  const queue = groupNodes.filter(n => inDeg.get(n.id) === 0).map(n => n.id);
  queue.forEach(id => layerOf.set(id, 0));

  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const curLayer = layerOf.get(cur);
    (out.get(cur) || []).forEach(tgt => {
      const nd = inDeg.get(tgt) - 1;
      inDeg.set(tgt, nd);
      const proposed = curLayer + 1;
      if (!layerOf.has(tgt) || layerOf.get(tgt) < proposed)
        layerOf.set(tgt, proposed);
      if (nd === 0) queue.push(tgt);
    });
  }

  // Cycle nodes — put in middle layer of this group
  const maxL = layerOf.size > 0 ? Math.max(...layerOf.values()) : 0;
  const cycleL = Math.max(0, Math.floor(maxL / 2));
  groupNodes.forEach(n => { if (!layerOf.has(n.id)) layerOf.set(n.id, cycleL); });

  // Collect into sorted columns
  const degree = new Map();
  groupNodes.forEach(n => degree.set(n.id,
    (out.get(n.id)?.length || 0) + (inc.get(n.id)?.length || 0)));

  const cols = new Map();
  groupNodes.forEach(n => {
    const l = layerOf.get(n.id);
    if (!cols.has(l)) cols.set(l, []);
    cols.get(l).push(n);
  });

  const sortedCols = [...cols.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, ns]) => [...ns].sort((a, b) =>
      (degree.get(b.id) || 0) - (degree.get(a.id) || 0)));

  // Position within this group (origin at 0,0 — caller offsets vertically)
  const positioned = [];
  sortedCols.forEach((colNodes, ci) => {
    const colX = ci * (NODE_W + COL_GAP);
    const totalH = colNodes.length * NODE_H + (colNodes.length - 1) * ROW_GAP;
    const startY = -totalH / 2;
    colNodes.forEach((node, ri) => {
      positioned.push({
        ...node,
        width: NODE_W, height: NODE_H,
        position: { x: colX, y: startY + ri * (NODE_H + ROW_GAP) },
      });
    });
  });

  return positioned;
}

function applyLayeredLayout(nodes, edges) {
  if (nodes.length === 0) return [];

  // Split by top-level folder
  const groupMap = new Map();
  nodes.forEach(n => {
    const parts = n.id.split('/');
    const grp = parts.length > 1 ? parts[0] : '__root__';
    if (!groupMap.has(grp)) groupMap.set(grp, []);
    groupMap.get(grp).push(n);
  });

  // Sort groups: larger groups first so the biggest cluster is on top
  const sortedGroups = [...groupMap.entries()]
    .sort(([, a], [, b]) => b.length - a.length);

  const allPositioned = [];
  let cursorY = 0;

  sortedGroups.forEach(([, groupNodes], gi) => {
    const laid = _layerGroup(groupNodes, edges, new Set(nodes.map(n => n.id)));

    // Find the bounding box of this group's internal layout
    if (laid.length === 0) return;
    const ys = laid.map(n => n.position.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys) + NODE_H;
    const groupH = maxY - minY;

    // Centre group horizontally
    const xs = laid.map(n => n.position.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + NODE_W;
    const groupW = maxX - minX;
    const offsetX = -groupW / 2 - minX;

    // Stack vertically: shift so group top sits at cursorY
    const offsetY = cursorY - minY;

    laid.forEach(n => {
      allPositioned.push({
        ...n,
        position: {
          x: n.position.x + offsetX,
          y: n.position.y + offsetY,
        },
      });
    });

    cursorY += groupH + GRP_GAP;
  });

  // Centre the whole diagram
  const xs = allPositioned.map(n => n.position.x);
  const ys = allPositioned.map(n => n.position.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

  return allPositioned.map(n => ({
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
function buildEdge(e, opacity = 0.55, strokeWidth = 1, highlightColor = null) {
  const isCycle = e.data?.isCycle;
  // Default resting colour: noticeably visible but not distracting
  const stroke = highlightColor ?? (isCycle ? T.red : 'rgba(180,190,220,0.85)');
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

// ── Folder region overlay + cross-folder arrows ───────────────────────────────
function GroupRegions({ nodes, filteredEdges }) {
  const { getViewport } = useReactFlow();
  const [vp, setVp] = useState({ x: 0, y: 0, zoom: 1 });

  useEffect(() => {
    let raf;
    const tick = () => { setVp(getViewport()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getViewport]);

  // Build group → nodes map (skip hidden)
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

  // Node → group lookup
  const nodeGroup = useMemo(() => {
    const map = {};
    nodes.forEach(n => {
      map[n.id] = n.id.split('/').length > 1 ? n.id.split('/')[0] : '__root__';
    });
    return map;
  }, [nodes]);

  // Count cross-group edges: { "groupA->groupB": count }
  const crossEdgeCounts = useMemo(() => {
    const counts = {};
    filteredEdges.forEach(e => {
      const sg = nodeGroup[e.source];
      const tg = nodeGroup[e.target];
      if (sg && tg && sg !== tg) {
        const key = `${sg}→${tg}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [filteredEdges, nodeGroup]);

  const palette = [T.indigo, T.teal, T.amber, T.green, '#a78bfa', '#fb923c'];
  const PAD = 36;

  // Compute screen bounding box for each group
  const groupBoxes = useMemo(() => {
    const boxes = {};
    Object.entries(groups).forEach(([group, groupNodes]) => {
      const xs = groupNodes.map(n => n.position.x);
      const ys = groupNodes.map(n => n.position.y);
      boxes[group] = {
        minX: Math.min(...xs) - PAD,
        minY: Math.min(...ys) - PAD,
        maxX: Math.max(...xs) + NODE_W + PAD,
        maxY: Math.max(...ys) + NODE_H + PAD,
      };
    });
    return boxes;
  }, [groups]);

  // Convert graph-space box to screen-space box
  const toScreen = (box) => ({
    sx: box.minX * vp.zoom + vp.x,
    sy: box.minY * vp.zoom + vp.y,
    sw: (box.maxX - box.minX) * vp.zoom,
    sh: (box.maxY - box.minY) * vp.zoom,
  });

  const groupKeys = Object.keys(groups);

  return (
    <svg style={{
      position: 'absolute', inset: 0,
      width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 0, overflow: 'visible',
    }}>

      {/* ── Group region boxes ── */}
      {groupKeys.map((group, gi) => {
        const groupNodes = groups[group];
        if (!groupNodes?.length) return null;
        const box = groupBoxes[group];
        const { sx, sy, sw, sh } = toScreen(box);
        const accent = palette[gi % palette.length];
        const labelName = group === '__root__' ? '/' : group + '/';
        const labelFontSize = Math.max(10, 13 * Math.min(vp.zoom, 1));

        return (
          <g key={group}>
            <rect x={sx} y={sy} width={sw} height={sh}
              rx={14} ry={14} fill={`${accent}09`} />
            <rect x={sx} y={sy} width={sw} height={sh}
              rx={14} ry={14} fill="none"
              stroke={`${accent}55`} strokeWidth={1.5} />
            {/* Label pill */}
            <rect
              x={sx + 12} y={sy - labelFontSize * 0.75}
              width={labelName.length * labelFontSize * 0.62 + 16}
              height={labelFontSize * 1.5}
              rx={4} ry={4}
              fill={`${accent}22`} stroke={`${accent}55`} strokeWidth={1}
            />
            <text
              x={sx + 20} y={sy + labelFontSize * 0.45}
              fontSize={labelFontSize}
              fill={accent}
              fontFamily="var(--font-mono)"
              fontWeight={700} letterSpacing="0.04em"
            >
              {labelName}
            </text>
          </g>
        );
      })}

      {/* ── Cross-folder summary: small chips on the bottom border of source group ── */}
      {Object.entries(crossEdgeCounts).map(([key, count]) => {
        const [srcGrp, tgtGrp] = key.split('→');
        const srcBox = groupBoxes[srcGrp];
        if (!srcBox) return null;

        const si = groupKeys.indexOf(srcGrp);
        const accent = palette[si % palette.length];

        const { sx, sy, sw, sh } = toScreen(srcBox);

        // Stack chips along the bottom edge, offset by index
        const chipIdx = Object.keys(crossEdgeCounts)
          .filter(k => k.startsWith(srcGrp + '→'))
          .indexOf(key);

        const chipW = Math.max(80, (tgtGrp.length + 6) * 7.5) * Math.min(vp.zoom, 1);
        const chipH = 18 * Math.min(vp.zoom, 1);
        const chipX = sx + 12 + chipIdx * (chipW + 6);
        const chipY = sy + sh - chipH / 2;
        const fontSize = Math.max(8, 9 * Math.min(vp.zoom, 1));
        const label = `→ ${tgtGrp}/ ×${count}`;

        return (
          <g key={key}>
            <rect
              x={chipX} y={chipY}
              width={chipW} height={chipH}
              rx={chipH / 2} ry={chipH / 2}
              fill={`${accent}18`}
              stroke={`${accent}50`}
              strokeWidth={1}
            />
            <text
              x={chipX + chipW / 2}
              y={chipY + chipH * 0.66}
              textAnchor="middle"
              fontSize={fontSize}
              fill={accent}
              fontFamily="var(--font-mono)"
              fontWeight={600}
              letterSpacing="0.02em"
            >
              {label}
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
    () => filteredEdges.map(e => buildEdge(e, 0.55, 1)),
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
    setEdges(eds => eds.map(e => buildEdge(e, 0.55, 1)));
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
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      // Base canvas colour + gradient here — Background dots render on top
      background: `
        radial-gradient(ellipse 55% 45% at 68% 38%, rgba(110,30,80,0.22) 0%, transparent 70%),
        radial-gradient(ellipse 40% 35% at 30% 65%, rgba(40,20,90,0.18) 0%, transparent 65%),
        #080a0f
      `,
    }}>
      {/* Folder region overlay */}
      <GroupRegions nodes={nodes} filteredEdges={filteredEdges} />

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
        fitViewOptions={{
          padding: 0.35,          // generous padding so graph doesn't hug edges
          minZoom: 0.3,
          maxZoom: 1.5,
        }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'default',
          markerEnd: { type: MarkerType.ArrowClosed, width: 9, height: 9, color: 'rgba(180,190,220,0.7)' },
          style: { stroke: 'rgba(180,190,220,0.85)', strokeWidth: 1, opacity: 0.55, strokeDasharray: '5 4' },
          animated: false,
        }}
      >
        <MiniMap nodeColor={miniMapColor} maskColor="rgba(7,8,12,0.82)" nodeStrokeWidth={0} zoomable pannable />
        <Controls />
        {/* Dots rendered over the gradient — colour matches the RF site screenshot */}
        <Background variant="dots" gap={22} size={1.5} color="rgba(200,210,230,0.35)" />
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
