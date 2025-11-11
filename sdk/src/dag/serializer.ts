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
      // Extract the first and second nodes
      extractNodesAndEdges(seqNode.first, state);
      extractNodesAndEdges(seqNode.second, state);
      // Create edge from first to second
      state.edges.push({
        from: seqNode.first.id,
        to: seqNode.second.id,
      });
      return; // Don't add the sequential node itself
    }
  } else if (nodeType === 'sequential_terminal') {
    // SequentialTerminalNode
    const seqNode = node as any;
    if (seqNode.transformer && seqNode.terminal) {
      extractNodesAndEdges(seqNode.transformer, state);
      extractNodesAndEdges(seqNode.terminal, state);
      state.edges.push({
        from: seqNode.transformer.id,
        to: seqNode.terminal.id,
      });
      return;
    }
  } else if (nodeType === 'sequential_source') {
    // SequentialSourceNode
    const seqNode = node as any;
    if (seqNode.source && seqNode.transformer) {
      extractNodesAndEdges(seqNode.source, state);
      extractNodesAndEdges(seqNode.transformer, state);
      state.edges.push({
        from: seqNode.source.id,
        to: seqNode.transformer.id,
      });
      return;
    }
  } else if (nodeType === 'sequential_source_terminal') {
    // SequentialSourceTerminalNode
    const seqNode = node as any;
    if (seqNode.source && seqNode.terminal) {
      extractNodesAndEdges(seqNode.source, state);
      extractNodesAndEdges(seqNode.terminal, state);
      state.edges.push({
        from: seqNode.source.id,
        to: seqNode.terminal.id,
      });
      return;
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
