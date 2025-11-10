/**
 * Base types for DAG nodes
 */

export type NodeId = string;
export type PortId = string;

/**
 * Base interface for all nodes
 */
export interface BaseNode {
  id: NodeId;
  type: NodeType;
  label?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Node type enum
 */
export enum NodeType {
  CONDITIONAL = 'conditional',
  LOOP = 'loop',
  FAN_OUT = 'fan_out',
  AGGREGATOR = 'aggregator',
  LLM = 'llm',
  LITERAL = 'literal',
  CONSOLE = 'console',
}

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
import type {
  ConditionalNode,
  LoopNode,
  FanOutNode,
  AggregatorNode,
  LLMNode,
  LiteralNode,
  ConsoleSinkNode,
} from './nodes';

export type {
  ConditionalNode,
  LoopNode,
  FanOutNode,
  AggregatorNode,
  LLMNode,
  LiteralNode,
  ConsoleSinkNode,
};

export type Node = ConditionalNode | LoopNode | FanOutNode | AggregatorNode | LLMNode | LiteralNode | ConsoleSinkNode;

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
export interface SerializableNode extends Omit<BaseNode, 'metadata'> {
  metadata?: Record<string, unknown>;
  // Execution node fields
  inputPorts?: Port[];
  outputPorts?: Port[];
  // Conditional node fields
  trueOutputPort?: Port;
  falseOutputPort?: Port;
  // Loop node fields
  subDag?: DAGData;
  maxIterations?: number;
  // Fan-out node fields
  outputBranches?: Array<{
    port: Port;
    subDag?: DAGData;
  }>;
  // Literal node fields
  value?: string | number | boolean | null | undefined;
  // LLM node fields
  model?: string;
  structuredOutput?: {
    schema: Record<string, unknown>;
    mode?: 'json' | 'json_schema' | 'tool';
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

