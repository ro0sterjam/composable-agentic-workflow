import { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';
import { Node, Connection } from '../../types/node';

export function nodeToReactFlowNode(node: Node): ReactFlowNode {
  return {
    id: node.id,
    type: 'custom',
    position: { x: 0, y: 0 }, // Position should be set by UI
    data: {
      label: node.label || node.id,
      nodeType: node.type,
      id: node.id,
    },
  };
}

export function edgeToReactFlowEdge(connection: Connection): ReactFlowEdge {
  return {
    id: connection.id,
    source: connection.fromNodeId,
    target: connection.toNodeId,
    sourceHandle: connection.fromPortId,
    targetHandle: connection.toPortId,
  };
}

