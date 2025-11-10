import {
  NodeType,
  ExecutionNode,
  ConditionalNode,
  LoopNode,
  FanOutNode,
  AggregatorNode,
  Port,
  DAG,
} from '../types/node';

/**
 * Factory functions for creating nodes
 */

export function createExecutionNode(
  id: string,
  execute: (input: unknown) => Promise<unknown> | unknown,
  options?: {
    label?: string;
    inputPorts?: Port[];
    outputPorts?: Port[];
    metadata?: Record<string, unknown>;
  }
): ExecutionNode {
  return {
    id,
    type: NodeType.EXECUTION,
    label: options?.label || id,
    inputPorts: options?.inputPorts || [{ id: 'input', label: 'Input' }],
    outputPorts: options?.outputPorts || [{ id: 'output', label: 'Output' }],
    execute,
    metadata: options?.metadata,
  };
}

export function createConditionalNode(
  id: string,
  condition: (input: unknown) => Promise<boolean> | boolean,
  options?: {
    label?: string;
    inputPorts?: Port[];
    trueOutputPort?: Port;
    falseOutputPort?: Port;
    metadata?: Record<string, unknown>;
  }
): ConditionalNode {
  return {
    id,
    type: NodeType.CONDITIONAL,
    label: options?.label || id,
    inputPorts: options?.inputPorts || [{ id: 'input', label: 'Input' }],
    trueOutputPort: options?.trueOutputPort || { id: 'true', label: 'True' },
    falseOutputPort: options?.falseOutputPort || { id: 'false', label: 'False' },
    condition,
    metadata: options?.metadata,
  };
}

export function createLoopNode(
  id: string,
  subDag: DAG,
  loopCondition: (input: unknown, iteration: number) => Promise<boolean> | boolean,
  options?: {
    label?: string;
    inputPorts?: Port[];
    outputPorts?: Port[];
    maxIterations?: number;
    metadata?: Record<string, unknown>;
  }
): LoopNode {
  return {
    id,
    type: NodeType.LOOP,
    label: options?.label || id,
    inputPorts: options?.inputPorts || [{ id: 'input', label: 'Input' }],
    outputPorts: options?.outputPorts || [{ id: 'output', label: 'Output' }],
    subDag,
    loopCondition,
    maxIterations: options?.maxIterations,
    metadata: options?.metadata,
  };
}

export function createFanOutNode(
  id: string,
  outputBranches: Array<{ port: Port; subDag?: DAG }>,
  options?: {
    label?: string;
    inputPorts?: Port[];
    metadata?: Record<string, unknown>;
  }
): FanOutNode {
  return {
    id,
    type: NodeType.FAN_OUT,
    label: options?.label || id,
    inputPorts: options?.inputPorts || [{ id: 'input', label: 'Input' }],
    outputBranches,
    metadata: options?.metadata,
  };
}

export function createAggregatorNode(
  id: string,
  aggregate: (inputs: unknown[]) => Promise<unknown> | unknown,
  options?: {
    label?: string;
    inputPorts?: Port[];
    outputPorts?: Port[];
    metadata?: Record<string, unknown>;
  }
): AggregatorNode {
  return {
    id,
    type: NodeType.AGGREGATOR,
    label: options?.label || id,
    inputPorts: options?.inputPorts || [{ id: 'input', label: 'Input' }],
    outputPorts: options?.outputPorts || [{ id: 'output', label: 'Output' }],
    aggregate,
    metadata: options?.metadata,
  };
}

