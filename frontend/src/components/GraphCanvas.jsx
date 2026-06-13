import { useCallback, useMemo } from 'react';
import ReactFlow, {
  MiniMap, Controls, Background,
  useNodesState, useEdgesState,
  BezierEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { T } from '../theme';
import FileNode, { nodeColor, nodeSize } from './FileNode';
import GraphLegend from './GraphLegend';

const nodeTypes = { fileNode: FileNode };
const edgeTypes = { default: BezierEdge };

// ── Radial layout ─────────────────────────────────────────────────────────────
// Groups nodes by their top-level directory, places each group on a ring
// around a central point. More connected (higher degree) nodes get placed
// closer to the center of their group cluster.

function applyRadialLayout(nodes, edges) {
  if (nodes.length === 0) return [];

  // Build degree map for priority positioning
  const degree = {};
  edges.forEach(e => {
    degree[e.source] = (degree[e.source] || 0) + 1;
    degree[e.target] = (degree[e.target] || 0) + 1;
  });

  // Group by top-level directory
  const groups = {};
  nodes.forEach(n => {
    const parts = n.id.split('/');
    const group = parts.length > 1 ? parts[0] : '__root__';
    if (!groups[group]) groups[group] = [];
    groups[group].push(n);
  });

  const groupKeys = Object.keys(groups);
  const numGroups = groupKeys.length;

  // Each group sits at a position on the outer ring
  const outerRadius = Math.max(280, numGroups * 80);
  const positioned = [];

  groupKeys.forEach((gk, gi) => {
    const groupNodes = groups[gk];
    // Angle for this group's center on the outer ring
    const groupAngle = (gi / numGroups) * 2 * Math.PI - Math.PI / 2;
    const gx = Math.cos(groupAngle) * outerRadius;
    const gy = Math.sin(groupAngle) * outerRadius;

    if (groupNodes.length === 1) {
      positioned.push({ ...groupNodes[0], position: { x: gx, y: gy } });
      return;
    }

    // Sort within group: highest degree first (hub files near group center)
    const sorted = [...groupNodes].sort((a, b) =>
      (degree[b.id] || 0) - (degree[a.id] || 0)
    );

    // Inner cluster radius scales with group size
    const innerRadius = Math.max(60, sorted.length * 18);

    sorted.forEach((node, ni) => {
      const localAngle = (ni / sorted.length) * 2 * Math.PI - Math.PI / 2;
      // Hub node (most connected) goes at group center
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

  // Center the whole layout
  const xs = positioned.map(n => n.position.x);
  const ys = positioned.map(n => n.position.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

  return positioned.map(n => ({
    ...n,
    position: { x: n.position.x - cx, y: n.position.y - cy },
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GraphCanvas({ rawNodes, rawEdges, colorMode = 'ext', onNodeClick }) {
  const nodeTypesMemo = useMemo(() => ({
    fileNode: (props) => <FileNode {...props} colorMode={colorMode} />,
  }), [colorMode]);

  const validNodeIds = useMemo(() => new Set(rawNodes.map(n => n.id)), [rawNodes]);
  const filteredEdges = useMemo(
    () => rawEdges.filter(e => validNodeIds.has(e.source) && validNodeIds.has(e.target)),
    [rawEdges, validNodeIds]
  );

  const laid = useMemo(
    () => applyRadialLayout(rawNodes, filteredEdges),
    [rawNodes, filteredEdges]
  );

  const [nodes, , onNodesChange] = useNodesState(laid);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    filteredEdges.map(e => ({
      ...e,
      type: 'default', // bezier
      style: {
        stroke: e.data?.isCycle ? T.red : `${T.indigo}70`,
        strokeWidth: 1,
      },
    }))
  );

  const defaultStroke = (e) =>
    e.data?.isCycle ? T.red : `${T.indigo}70`;

  const handleNodeClick = useCallback((_, node) => {
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
    onNodeClick(node);
  }, [onNodeClick, setEdges]);

  const handlePaneClick = useCallback(() => {
    setEdges(eds => eds.map(e => ({
      ...e,
      style: { stroke: defaultStroke(e), strokeWidth: 1, opacity: 1 },
    })));
  }, [setEdges]);

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
    </div>
  );
}
