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
  EXECUTION = 'execution',
  CONDITIONAL = 'conditional',
  LOOP = 'loop',
  FAN_OUT = 'fan_out',
  AGGREGATOR = 'aggregator',
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
 * Execution node - takes input, produces output
 */
export interface ExecutionNode extends BaseNode {
  type: NodeType.EXECUTION;
  inputPorts: Port[];
  outputPorts: Port[];
  execute: (input: unknown) => Promise<unknown> | unknown;
}

/**
 * Conditional node - branches based on condition
 */
export interface ConditionalNode extends BaseNode {
  type: NodeType.CONDITIONAL;
  inputPorts: Port[];
  trueOutputPort: Port;
  falseOutputPort: Port;
  condition: (input: unknown) => Promise<boolean> | boolean;
}

/**
 * Loop node - wraps a sub-DAG that runs iteratively
 */
export interface LoopNode extends BaseNode {
  type: NodeType.LOOP;
  inputPorts: Port[];
  outputPorts: Port[];
  subDag: DAG;
  loopCondition: (input: unknown, iteration: number) => Promise<boolean> | boolean;
  maxIterations?: number;
}

/**
 * Fan-out node - duplicates input to multiple paths
 */
export interface FanOutNode extends BaseNode {
  type: NodeType.FAN_OUT;
  inputPorts: Port[];
  outputBranches: Array<{
    port: Port;
    subDag?: DAG; // Optional sub-DAG for this branch
  }>;
}

/**
 * Aggregator node - combines multiple inputs into one output
 */
export interface AggregatorNode extends BaseNode {
  type: NodeType.AGGREGATOR;
  inputPorts: Port[];
  outputPorts: Port[];
  aggregate: (inputs: unknown[]) => Promise<unknown> | unknown;
}

/**
 * Union type for all node types
 */
export type Node = ExecutionNode | ConditionalNode | LoopNode | FanOutNode | AggregatorNode;

/**
 * DAG structure
 */
export interface DAG {
  id: string;
  nodes: Map<NodeId, Node>;
  connections: Connection[];
  entryNodeId?: NodeId; // Optional entry point
  exitNodeIds?: NodeId[]; // Optional exit points
}

