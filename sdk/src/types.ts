/**
 * Base types for DAG nodes
 */

export type NodeId = string;
export type PortId = string;

// Re-export node types from nodes
export { TransformerNode, SourceNode, TerminalNode, StandAloneNode } from './nodes/types';

/**
 * Node type - free form string identifier for node types
 */
export type NodeType = string;

/**
 * Default node type constants
 */
export const DEFAULT_NODE_TYPES = {
  LLM: 'llm',
  LITERAL: 'literal',
  CONSOLE: 'console',
  EXA_SEARCH: 'exa_search',
} as const;

/**
 * Port definition for inputs/outputs
 */
export interface Port {
  id: PortId;
  label?: string;
  dataType?: string;
}

/**
 * Connection between nodes
 */
export interface Connection {
  id: string;
  fromNodeId: NodeId;
  fromPortId: PortId;
  toNodeId: NodeId;
  toPortId: PortId;
}

/**
 * Union type for all node types
 * Imported from nodes to avoid circular dependency
 */
import type { LLMNode, LiteralSourceNode, ConsoleTerminalNode, ExaSearchNode } from './nodes';

export type { LLMNode, LiteralSourceNode, ConsoleTerminalNode, ExaSearchNode };

/**
 * Union type for all node types
 * Uses 'any' types to allow the union to work with all possible instantiations
 */
export type Node =
  | LLMNode<any, any>
  | LiteralSourceNode<any>
  | ConsoleTerminalNode<any>
  | ExaSearchNode<any, any>;

/**
 * DAG structure (serializable version)
 */
export interface DAGData {
  id: string;
  nodes: Record<NodeId, SerializableNode>;
  connections: Connection[];
  entryNodeId?: NodeId;
  exitNodeIds?: NodeId[];
}

/**
 * Serializable node (without functions)
 */
export interface SerializableNode {
  id: string;
  type: NodeType;
  label?: string;
  metadata?: Record<string, unknown>;
  // Execution node fields
  inputPorts?: Port[];
  outputPorts?: Port[];
  // Literal node fields
  value?: string | number | boolean | null | undefined;
  // LLM node fields
  model?: string;
  schema?: Record<string, unknown>; // JSONSchema7
  mode?: 'auto' | 'json' | 'tool';
  // Exa Search node fields
  config?: {
    searchType?: 'auto' | 'neural' | 'keyword' | 'fast';
    includeDomains?: string[];
    excludeDomains?: string[];
    includeText?: string[];
    excludeText?: string[];
    category?:
      | 'company'
      | 'research paper'
      | 'news'
      | 'pdf'
      | 'github'
      | 'tweet'
      | 'personal site'
      | 'linkedin profile'
      | 'financial report';
    numResults?: number;
    text?: boolean;
    contents?: boolean | { numChars?: number };
    highlights?: boolean;
    summary?: boolean;
  };
}

/**
 * DAG structure (runtime version with functions)
 */
export interface DAG {
  id: string;
  nodes: Map<NodeId, Node>;
  connections: Connection[];
  entryNodeId?: NodeId;
  exitNodeIds?: NodeId[];
}
