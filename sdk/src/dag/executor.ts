import { defaultExecutorRegistry } from '../executors/registry';
import type { ExecutorRegistry } from '../executors/registry';

import type { SerializedDAG, SerializedNode, SerializedEdge } from './serializer';

export type { SerializedDAG, SerializedNode, SerializedEdge } from './serializer';

/**
 * Execution result for a single node
 */
export interface NodeExecutionResult {
  nodeId: string;
  output?: unknown;
  error?: Error;
}

/**
 * Execution result for the entire DAG
 */
export interface DAGExecutionResult {
  results: Map<string, NodeExecutionResult>;
  success: boolean;
}

/**
 * Options for DAG execution
 */
export interface DAGExecutionOptions {
  executorRegistry?: ExecutorRegistry;
  onNodeComplete?: (nodeId: string, result: NodeExecutionResult) => void;
}

/**
 * Execute a serialized DAG
 */
export async function executeDAG(
  dag: SerializedDAG,
  options: DAGExecutionOptions = {}
): Promise<DAGExecutionResult> {
  const { executorRegistry = defaultExecutorRegistry, onNodeComplete } = options;

  // Build adjacency list for topological sort
  const nodes = new Map<string, SerializedNode>();
  const inDegree = new Map<string, number>();
  const adjacencyList = new Map<string, string[]>();

  // Initialize nodes and in-degree
  for (const node of dag.nodes) {
    nodes.set(node.id, node);
    inDegree.set(node.id, 0);
    adjacencyList.set(node.id, []);
  }

  // Build graph and calculate in-degrees
  for (const edge of dag.edges) {
    const from = edge.from;
    const to = edge.to;

    if (!adjacencyList.has(from)) {
      adjacencyList.set(from, []);
    }
    adjacencyList.get(from)!.push(to);

    inDegree.set(to, (inDegree.get(to) || 0) + 1);
  }

  // Find entry nodes (nodes with in-degree 0)
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  // Store node outputs
  const nodeOutputs = new Map<string, unknown>();
  const results = new Map<string, NodeExecutionResult>();

  // Topological sort and execution
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodes.get(nodeId)!;

    try {
      // Get input for this node (output from previous nodes)
      const input = getNodeInput(nodeId, dag.edges, nodeOutputs);

      // Execute the node
      const output = await executeNode(node, input, executorRegistry);

      // Store output
      nodeOutputs.set(nodeId, output);

      const result: NodeExecutionResult = {
        nodeId,
        output,
      };
      results.set(nodeId, result);

      // Notify callback
      if (onNodeComplete) {
        onNodeComplete(nodeId, result);
      }

      // Process dependent nodes
      const dependents = adjacencyList.get(nodeId) || [];
      for (const dependentId of dependents) {
        const currentDegree = inDegree.get(dependentId)!;
        inDegree.set(dependentId, currentDegree - 1);

        if (inDegree.get(dependentId) === 0) {
          queue.push(dependentId);
        }
      }
    } catch (error) {
      const result: NodeExecutionResult = {
        nodeId,
        error: error instanceof Error ? error : new Error(String(error)),
      };
      results.set(nodeId, result);

      if (onNodeComplete) {
        onNodeComplete(nodeId, result);
      }

      // Stop execution on error
      return {
        results,
        success: false,
      };
    }
  }

  // Check if all nodes were executed
  const allExecuted = results.size === nodes.size;
  if (!allExecuted) {
    // Some nodes couldn't be reached (cycle or disconnected)
    for (const nodeId of nodes.keys()) {
      if (!results.has(nodeId)) {
        results.set(nodeId, {
          nodeId,
          error: new Error('Node was not executed (possibly part of a cycle or disconnected)'),
        });
      }
    }
  }

  return {
    results,
    success: allExecuted && Array.from(results.values()).every((r) => !r.error),
  };
}

/**
 * Get input for a node by collecting outputs from connected nodes
 */
function getNodeInput(
  nodeId: string,
  edges: SerializedEdge[],
  nodeOutputs: Map<string, unknown>
): unknown {
  // Find edges that point to this node
  const incomingEdges = edges.filter((edge) => edge.to === nodeId);

  if (incomingEdges.length === 0) {
    // No input (source node)
    return undefined;
  }

  if (incomingEdges.length === 1) {
    // Single input - return the output directly
    const fromNodeId = incomingEdges[0].from;
    return nodeOutputs.get(fromNodeId);
  }

  // Multiple inputs - return as array
  return incomingEdges.map((edge) => nodeOutputs.get(edge.from));
}

/**
 * Execute a single node using the executor registry
 */
async function executeNode(
  node: SerializedNode,
  input: unknown,
  executorRegistry: ExecutorRegistry
): Promise<unknown> {
  const nodeType = node.type;

  // Try to find an executor for this node type
  const sourceExecutor = executorRegistry.getSource(nodeType);
  const transformerExecutor = executorRegistry.getTransformer(nodeType);
  const terminalExecutor = executorRegistry.getTerminal(nodeType);
  const standaloneExecutor = executorRegistry.getStandalone(nodeType);

  if (sourceExecutor) {
    // Source node - no input needed
    return await Promise.resolve(sourceExecutor.execute(node.config));
  } else if (transformerExecutor) {
    // Transformer node - needs input
    if (input === undefined) {
      throw new Error(`Transformer node ${node.id} requires input but none was provided`);
    }
    return await Promise.resolve(transformerExecutor.execute(input, node.config));
  } else if (terminalExecutor) {
    // Terminal node - needs input, no output
    if (input === undefined) {
      throw new Error(`Terminal node ${node.id} requires input but none was provided`);
    }
    await Promise.resolve(terminalExecutor.execute(input, node.config));
    return undefined; // Terminal nodes don't produce output
  } else if (standaloneExecutor) {
    // Standalone node - no input, no output
    await Promise.resolve(standaloneExecutor.execute(node.config));
    return undefined; // Standalone nodes don't produce output
  } else {
    throw new Error(
      `No executor found for node type: ${nodeType}. Make sure an executor is registered for this node type.`
    );
  }
}
