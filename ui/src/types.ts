/**
 * Types for the UI - matching SDK's SerializedDAG format
 */

export type NodeType = string;

export const NODE_TYPES = {
  LITERAL: 'literal',
  CONSOLE: 'console',
  SIMPLE_LLM: 'simple_llm',
  STRUCTURED_LLM: 'structured_llm',
  MAP: 'map',
  PEEK: 'peek',
} as const;

// For backward compatibility with existing code that uses NodeType.LITERAL etc
export const NodeType = NODE_TYPES;

/**
 * Serialized DAG representation (matches SDK's SerializedDAG)
 */
export interface SerializedDAG {
  nodes: SerializedNode[];
  edges: SerializedEdge[];
}

/**
 * Serialized node representation (matches SDK's SerializedNode)
 */
export interface SerializedNode {
  id: string;
  type: string;
  label?: string;
  config?: unknown;
}

/**
 * Serialized edge representation (matches SDK's SerializedEdge)
 */
export interface SerializedEdge {
  from: string;
  to: string;
}
