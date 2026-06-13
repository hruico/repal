import { useCallback, useMemo } from 'react';
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
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 50 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach(n => g.setNode(n.id, { width: 180, height: 56 }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map(n => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - 90, y: pos.y - 28 } };
  });
}

export default function GraphCanvas({ rawNodes, rawEdges, onNodeClick }) {
  const laid = useMemo(() => applyDagreLayout(rawNodes, rawEdges), [rawNodes, rawEdges]);
  const [nodes, , onNodesChange] = useNodesState(laid);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rawEdges);

  const handleNodeClick = useCallback((_, node) => {
    setEdges(eds => eds.map(e => {
      const hit = e.source === node.id || e.target === node.id;
      return {
        ...e,
        style: {
          stroke: hit ? '#f59e0b' : '#cbd5e1',
          strokeWidth: hit ? 2 : 1,
          opacity: hit ? 1 : 0.3,
        },
      };
    }));
    onNodeClick(node);
  }, [onNodeClick, setEdges]);

  const handlePaneClick = useCallback(() => {
    setEdges(eds => eds.map(e => ({
      ...e,
      style: { stroke: '#cbd5e1', strokeWidth: 1, opacity: 1 },
    })));
  }, [setEdges]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        defaultEdgeOptions={{ style: { stroke: '#cbd5e1', strokeWidth: 1 }, animated: false }}
      >
        <MiniMap nodeColor={n => EXT_COLORS[n.data?.extension] || '#94a3b8'} zoomable pannable />
        <Controls />
        <Background variant="dots" gap={20} size={1} color="#e2e8f0" />
      </ReactFlow>
      <GraphLegend />
    </div>
  );
}
