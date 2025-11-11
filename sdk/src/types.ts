/**
 * Base types for DAG nodes
 */

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

// Re-export node implementations
export { LiteralSourceNode, ConsoleTerminalNode, SimpleLLMTransformerNode } from './nodes';
export type { SimpleLLMTransformerNodeConfig } from './nodes';
