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
  LITERAL: 'literal',
  CONSOLE: 'console',
} as const;

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
import type { LiteralSourceNode, ConsoleTerminalNode } from './nodes';

export type { LiteralSourceNode, ConsoleTerminalNode };

/**
 * Union type for all node types
 * Uses 'any' types to allow the union to work with all possible instantiations
 */
export type Node = LiteralSourceNode<any> | ConsoleTerminalNode<any>;

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
  // Literal node fields
  value?: string | number | boolean | null | undefined;
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
