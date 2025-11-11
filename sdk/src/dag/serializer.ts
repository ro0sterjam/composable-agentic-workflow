import type { StandAloneNode, SourceNode, TerminalNode, TransformerNode } from '../nodes/types';

/**
 * Serialized DAG representation
 */
export interface SerializedDAG {
  nodes: SerializedNode[];
  edges: SerializedEdge[];
}

/**
 * Serialized node representation
 */
export interface SerializedNode {
  id: string;
  type: string;
  label?: string;
  config?: unknown;
}

/**
 * Serialized edge representation
 */
export interface SerializedEdge {
  from: string;
  to: string;
}

/**
 * Internal state for tracking nodes and edges during serialization
 */
interface SerializationState {
  nodes: Map<string, SerializedNode>;
  edges: SerializedEdge[];
  visited: Set<string>;
}

/**
 * Serialize a StandAloneNode to a DAG JSON representation
 * Flattens sequential nodes into edges
 */
export function serializeStandAloneNode(node: StandAloneNode<any>): SerializedDAG {
  const state: SerializationState = {
    nodes: new Map(),
    edges: [],
    visited: new Set(),
  };

  // Recursively extract nodes and edges
  extractNodesAndEdges(node, state);

  return {
    nodes: Array.from(state.nodes.values()),
    edges: state.edges,
  };
}

/**
 * Recursively extract nodes and edges from a node, flattening sequential compositions
 */
function extractNodesAndEdges(
  node:
    | StandAloneNode<any>
    | SourceNode<any, any>
    | TerminalNode<any, any>
    | TransformerNode<any, any, any>,
  state: SerializationState
): void {
  // Skip if already visited
  if (state.visited.has(node.id)) {
    return;
  }
  state.visited.add(node.id);

  // Check if this is a sequential node that needs to be flattened
  const nodeType = node.type;

  if (nodeType === 'sequential') {
    // SequentialTransformerNode
    const seqNode = node as any;
    if (seqNode.first && seqNode.second) {
      // Recursively extract the first and second nodes (they might be nested sequential nodes)
      extractNodesAndEdges(seqNode.first, state);
      extractNodesAndEdges(seqNode.second, state);

      // Find the actual output node from first (could be nested)
      const firstOutputId = getOutputNodeId(seqNode.first);
      // Find the actual input node from second (could be nested)
      const secondInputId = getInputNodeId(seqNode.second);

      // Create edge from first's output to second's input
      state.edges.push({
        from: firstOutputId,
        to: secondInputId,
      });
      return; // Don't add the sequential node itself
    }
  } else if (nodeType === 'sequential_terminal') {
    // SequentialTerminalNode
    const seqNode = node as any;
    if (seqNode.transformer && seqNode.terminal) {
      // Recursively extract the transformer (which might be a SequentialTransformerNode)
      extractNodesAndEdges(seqNode.transformer, state);
      extractNodesAndEdges(seqNode.terminal, state);

      // Find the actual output node from the transformer (could be nested)
      const transformerOutputId = getOutputNodeId(seqNode.transformer);
      state.edges.push({
        from: transformerOutputId,
        to: seqNode.terminal.id,
      });
      return;
    }
  } else if (nodeType === 'sequential_source') {
    // SequentialSourceNode
    const seqNode = node as any;
    if (seqNode.source && seqNode.transformer) {
      // Recursively extract the source and transformer (they might be nested sequential nodes)
      extractNodesAndEdges(seqNode.source, state);
      extractNodesAndEdges(seqNode.transformer, state);

      // Find the actual output node from source (could be nested)
      const sourceOutputId = getOutputNodeId(seqNode.source);
      // Find the actual input node from transformer (could be nested)
      const transformerInputId = getInputNodeId(seqNode.transformer);

      // Create edge from source's output to transformer's input
      state.edges.push({
        from: sourceOutputId,
        to: transformerInputId,
      });
      return;
    }
  } else if (nodeType === 'sequential_source_terminal') {
    // SequentialSourceTerminalNode
    const seqNode = node as any;
    if (seqNode.source && seqNode.terminal) {
      // Recursively extract the source (which might be a SequentialSourceNode)
      extractNodesAndEdges(seqNode.source, state);
      extractNodesAndEdges(seqNode.terminal, state);

      // Find the actual output node from the source (could be nested)
      const sourceOutputId = getOutputNodeId(seqNode.source);
      state.edges.push({
        from: sourceOutputId,
        to: seqNode.terminal.id,
      });
      return;
    }
  }

  // Special handling for map nodes - need to serialize the nested transformer
  if (nodeType === 'map') {
    const mapNode = node as any;
    if (mapNode.transformer) {
      // Recursively extract the transformer node (so it's added to the nodes array)
      // This will flatten sequential nodes and extract all nested nodes
      // If it's a SequentialTransformerNode, the entire chain will be extracted
      extractNodesAndEdges(mapNode.transformer, state);
      // The transformerId in the config points to the first node (for SequentialTransformerNode)
      // or the transformer node itself (for regular transformers)
    }
  }

  // Special handling for flatmap nodes - need to serialize the nested transformer
  if (nodeType === 'flatmap') {
    const flatmapNode = node as any;
    if (flatmapNode.transformer) {
      // Recursively extract the transformer node (so it's added to the nodes array)
      // This will flatten sequential nodes and extract all nested nodes
      // If it's a SequentialTransformerNode, the entire chain will be extracted
      extractNodesAndEdges(flatmapNode.transformer, state);
      // The transformerId in the config points to the first node (for SequentialTransformerNode)
      // or the transformer node itself (for regular transformers)
    }
  }

  // Special handling for agent nodes - need to serialize the nested transformer nodes in tools
  if (nodeType === 'agent') {
    const agentNode = node as any;
    if (agentNode.tools && Array.isArray(agentNode.tools)) {
      // Recursively extract transformer nodes from each tool
      for (const tool of agentNode.tools) {
        if (tool.transformer) {
          extractNodesAndEdges(tool.transformer, state);
          // The transformerId is already in the config from the AgentTransformerNode constructor
        }
      }
    }
  }

  // This is a regular node, add it to the nodes map
  const serializedNode: SerializedNode = {
    id: node.id,
    type: node.type,
    label: node.label,
  };

  // Only include config if it's defined
  const nodeConfig = (node as any).config;
  if (nodeConfig !== undefined) {
    serializedNode.config = nodeConfig;
  }

  state.nodes.set(node.id, serializedNode);
}

/**
 * Get the output node ID from a node (recursively traversing sequential nodes)
 */
function getOutputNodeId(
  node: SourceNode<any, any> | TerminalNode<any, any> | TransformerNode<any, any, any>
): string {
  const nodeType = node.type;

  if (nodeType === 'sequential') {
    // SequentialTransformerNode - get output from second node
    const seqNode = node as any;
    if (seqNode.second) {
      return getOutputNodeId(seqNode.second);
    }
  } else if (nodeType === 'sequential_terminal') {
    // SequentialTerminalNode - get output from transformer
    const seqNode = node as any;
    if (seqNode.transformer) {
      return getOutputNodeId(seqNode.transformer);
    }
  } else if (nodeType === 'sequential_source') {
    // SequentialSourceNode - get output from transformer
    const seqNode = node as any;
    if (seqNode.transformer) {
      return getOutputNodeId(seqNode.transformer);
    }
  } else if (nodeType === 'sequential_source_terminal') {
    // SequentialSourceTerminalNode - get output from source
    const seqNode = node as any;
    if (seqNode.source) {
      return getOutputNodeId(seqNode.source);
    }
  }

  // Regular node - return its ID
  return node.id;
}

/**
 * Get the input node ID from a node (recursively traversing sequential nodes)
 */
function getInputNodeId(
  node: SourceNode<any, any> | TerminalNode<any, any> | TransformerNode<any, any, any>
): string {
  const nodeType = node.type;

  if (nodeType === 'sequential') {
    // SequentialTransformerNode - get input from first node
    const seqNode = node as any;
    if (seqNode.first) {
      return getInputNodeId(seqNode.first);
    }
  } else if (nodeType === 'sequential_terminal') {
    // SequentialTerminalNode - get input from transformer
    const seqNode = node as any;
    if (seqNode.transformer) {
      return getInputNodeId(seqNode.transformer);
    }
  } else if (nodeType === 'sequential_source') {
    // SequentialSourceNode - get input from source
    const seqNode = node as any;
    if (seqNode.source) {
      return getInputNodeId(seqNode.source);
    }
  } else if (nodeType === 'sequential_source_terminal') {
    // SequentialSourceTerminalNode - get input from source
    const seqNode = node as any;
    if (seqNode.source) {
      return getInputNodeId(seqNode.source);
    }
  }

  // Regular node - return its ID
  return node.id;
}
