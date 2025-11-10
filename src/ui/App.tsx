import React, { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  NodeTypes,
  BackgroundVariant,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { DAGBuilder } from '../dag/dag';
import { NodeType } from '../types/node';
import { createExecutionNode, createConditionalNode, createLoopNode, createFanOutNode, createAggregatorNode } from '../nodes/node-factory';
import CustomNode from './components/CustomNode';
import Sidebar from './components/Sidebar';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

let nodeIdCounter = 0;
const getNodeId = () => `node_${++nodeIdCounter}`;

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [dagBuilder] = useState(() => new DAGBuilder('main-dag'));
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      
      // Also add to DAG builder
      if (params.source && params.target && params.sourceHandle && params.targetHandle) {
        dagBuilder.connect(
          params.source,
          params.sourceHandle,
          params.target,
          params.targetHandle
        );
      }
    },
    [setEdges, dagBuilder]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const createDAGNode = useCallback((nodeType: NodeType, id: string) => {
    const label = nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace('_', ' ');
    
    switch (nodeType) {
      case NodeType.EXECUTION:
        return createExecutionNode(id, async (input) => input, { label });
      case NodeType.CONDITIONAL:
        return createConditionalNode(id, async () => true, { label });
      case NodeType.LOOP:
        return createLoopNode(
          id,
          new DAGBuilder(`sub-dag-${id}`).build(),
          async () => false,
          { label }
        );
      case NodeType.FAN_OUT:
        return createFanOutNode(id, [{ port: { id: 'output', label: 'Output' } }], { label });
      case NodeType.AGGREGATOR:
        return createAggregatorNode(id, async (inputs) => inputs, { label });
      default:
        return createExecutionNode(id, async (input) => input, { label });
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nodeId = getNodeId();
      const dagNode = createDAGNode(type, nodeId);
      dagBuilder.addNode(dagNode);

      const newNode: Node = {
        id: nodeId,
        type: 'custom',
        position,
        data: {
          label: dagNode.label || nodeId,
          nodeType: type,
          id: nodeId,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, dagBuilder, createDAGNode]
  );

  const onNodeAdd = useCallback((nodeType: NodeType) => {
    if (!reactFlowInstance) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const position = reactFlowInstance.screenToFlowPosition({
      x: centerX,
      y: centerY,
    });

    const nodeId = getNodeId();
    const dagNode = createDAGNode(nodeType, nodeId);
    dagBuilder.addNode(dagNode);

    const newNode: Node = {
      id: nodeId,
      type: 'custom',
      position,
      data: {
        label: dagNode.label || nodeId,
        nodeType,
        id: nodeId,
      },
    };

    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance, setNodes, dagBuilder, createDAGNode]);

  const onSave = useCallback(() => {
    const validation = dagBuilder.validate();
    console.log('DAG Validation:', validation);
    
    const dag = dagBuilder.build();
    console.log('DAG Structure:', {
      nodes: Array.from(dag.nodes.values()).map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
      })),
      connections: dag.connections,
    });
    
    // You can save to localStorage or send to server
    localStorage.setItem('dag-editor-state', JSON.stringify({
      nodes,
      edges,
    }));
    
    alert('DAG saved! Check console for structure.');
  }, [dagBuilder, nodes, edges]);

  return (
    <div className="app">
      <div className="toolbar">
        <h1>Composable Search - DAG Editor</h1>
        <button onClick={onSave}>Save DAG</button>
      </div>
      <div className="editor-container">
        <Sidebar onNodeAdd={onNodeAdd} />
        <div className="flow-container" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default App;

