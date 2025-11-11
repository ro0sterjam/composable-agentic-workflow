import { defaultExecutorRegistry } from '../executors/registry';
import type { ExecutorRegistry, DAGContext } from '../executors/registry';

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

  // Find entry nodes - only source nodes (nodes with in-degree 0 AND have a source executor)
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      const node = nodes.get(nodeId)!;
      // Only add to queue if it's a source node (has a source executor)
      const sourceExecutor = executorRegistry.getSource(node.type);
      if (sourceExecutor) {
        queue.push(nodeId);
      }
    }
  }

  // Store node outputs
  const nodeOutputs = new Map<string, unknown>();
  const results = new Map<string, NodeExecutionResult>();

  // Create cache that lives for the lifetime of the DAG execution
  const cache: Record<string, unknown> = {};

  // Topological sort and execution
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodes.get(nodeId)!;

    try {
      // Get input for this node (output from previous nodes)
      const input = getNodeInput(nodeId, dag.edges, nodeOutputs);

      // Execute the node
      const output = await executeNode(node, input, executorRegistry, dag, cache);

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

  // Collect all node IDs that are referenced by other nodes (e.g., transformerId in map/flatmap nodes)
  const referencedNodeIds = new Set<string>();
  for (const node of dag.nodes) {
    const config = node.config as Record<string, unknown> | undefined;
    if (config && typeof config === 'object') {
      // Check for transformerId in map and flatmap nodes
      if ((node.type === 'map' || node.type === 'flatmap') && 'transformerId' in config) {
        const transformerId = config.transformerId;
        if (typeof transformerId === 'string') {
          referencedNodeIds.add(transformerId);
        }
      }
      // Add other node reference patterns here as needed
    }
  }

  // Check if all nodes were executed
  // Referenced nodes (e.g., transformerId in map nodes) are executed by their parent nodes,
  // so they don't need to be in the results map to be considered "executed"
  const directlyExecutedNodeIds = new Set(results.keys());
  const allDirectlyExecutedNodes =
    directlyExecutedNodeIds.size + referencedNodeIds.size >= nodes.size;

  // Check for nodes that should have been executed but weren't
  for (const nodeId of nodes.keys()) {
    if (!results.has(nodeId) && !referencedNodeIds.has(nodeId)) {
      const node = nodes.get(nodeId)!;
      const inDegreeValue = inDegree.get(nodeId) || 0;
      const sourceExecutor = executorRegistry.getSource(node.type);

      // If this is a source node that wasn't executed, it means there was an issue
      // Otherwise, it's a node that wasn't reachable from any source
      const errorMessage = sourceExecutor
        ? 'Source node was not executed (possibly disconnected from execution flow)'
        : inDegreeValue > 0
          ? 'Node was not executed (not reachable from any source node)'
          : 'Node was not executed (not a source node and has no incoming edges)';

      results.set(nodeId, {
        nodeId,
        error: new Error(errorMessage),
      });
    }
  }

  return {
    results,
    success: allDirectlyExecutedNodes && Array.from(results.values()).every((r) => !r.error),
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
  executorRegistry: ExecutorRegistry,
  dag: SerializedDAG,
  cache: Record<string, unknown>
): Promise<unknown> {
  const nodeType = node.type;
  const dagContext: DAGContext = { dag, executorRegistry, cache };

  // Try to find an executor for this node type
  const sourceExecutor = executorRegistry.getSource(nodeType);
  const transformerExecutor = executorRegistry.getTransformer(nodeType);
  const terminalExecutor = executorRegistry.getTerminal(nodeType);
  const standaloneExecutor = executorRegistry.getStandalone(nodeType);

  if (sourceExecutor) {
    // Source node - no input needed
    return await Promise.resolve(sourceExecutor.execute(node.config || {}, dagContext));
  } else if (transformerExecutor) {
    // Transformer node - needs input
    if (input === undefined) {
      throw new Error(`Transformer node ${node.id} requires input but none was provided`);
    }
    return await Promise.resolve(transformerExecutor.execute(input, node.config || {}, dagContext));
  } else if (terminalExecutor) {
    // Terminal node - needs input, no output
    if (input === undefined) {
      throw new Error(`Terminal node ${node.id} requires input but none was provided`);
    }
    await Promise.resolve(terminalExecutor.execute(input, node.config || {}, dagContext));
    return undefined; // Terminal nodes don't produce output
  } else if (standaloneExecutor) {
    // Standalone node - no input, no output
    await Promise.resolve(standaloneExecutor.execute(node.config || {}, dagContext));
    return undefined; // Standalone nodes don't produce output
  } else {
    throw new Error(
      `No executor found for node type: ${nodeType}. Make sure an executor is registered for this node type.`
    );
  }
}
