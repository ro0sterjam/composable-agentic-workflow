import type { Node, Edge } from 'reactflow';

import type { SerializedDAG, SerializedNode, SerializedEdge } from '../types';

/**
 * Convert ReactFlow nodes and edges to SerializedDAG format
 */
export function convertToSerializedDAG(nodes: Node[], edges: Edge[]): SerializedDAG {
  const serializedNodes: SerializedNode[] = nodes.map((node) => {
    const nodeType = node.data.nodeType as string;
    const config: Record<string, unknown> = {};

    // Extract config based on node type
    if (nodeType === 'literal') {
      config.value = node.data.value ?? '';
    }

    return {
      id: node.id,
      type: nodeType,
      label: node.data.label || node.id,
      ...(Object.keys(config).length > 0 && { config }),
    };
  });

  const serializedEdges: SerializedEdge[] = edges.map((edge) => ({
    from: edge.source,
    to: edge.target,
  }));

  return {
    nodes: serializedNodes,
    edges: serializedEdges,
  };
}
