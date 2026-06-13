import { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  MiniMap, Controls, Background,
  useNodesState, useEdgesState,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import FileNode, { EXT_COLORS } from './FileNode';
import GraphLegend from './GraphLegend';

const nodeTypes = { fileNode: FileNode };

function applyDagreLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', ranksep: 90, nodesep: 70 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach(n => g.setNode(n.id, { width: 180, height: 60 }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map(n => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - 90, y: pos.y - 30 } };
  });
}

export default function GraphCanvas({ rawNodes, rawEdges, onNodeClick }) {
  const laid = useMemo(() => applyDagreLayout(rawNodes, rawEdges), [rawNodes, rawEdges]);
  const [nodes, , onNodesChange] = useNodesState(laid);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rawEdges);
  const [selectedId, setSelectedId] = useState(null);

  // Highlight edges connected to the selected node
  const handleNodeClick = useCallback((_, node) => {
    setSelectedId(node.id);
    setEdges(eds => eds.map(e => ({
      ...e,
      style: {
        ...e.style,
        stroke: (e.source === node.id || e.target === node.id)
          ? '#f59e0b'
          : '#6366f1',
        strokeWidth: (e.source === node.id || e.target === node.id) ? 2.5 : 1.5,
        opacity: (e.source === node.id || e.target === node.id) ? 1 : 0.25,
      },
    })));
    onNodeClick(node);
  }, [onNodeClick, setEdges]);

  // Reset edge styles when canvas background is clicked
  const handlePaneClick = useCallback(() => {
    setSelectedId(null);
    setEdges(eds => eds.map(e => ({
      ...e,
      style: { stroke: '#6366f1', strokeWidth: 1.5, opacity: 1 },
    })));
  }, [setEdges]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <MiniMap
          nodeColor={n => EXT_COLORS[n.data?.extension] || '#6b7280'}
          maskColor="rgba(255,255,255,0.7)"
        />
        <Controls />
        <Background variant="dots" gap={20} size={1} color="#e5e7eb" />
      </ReactFlow>
      <GraphLegend />
    </div>
  );
}
