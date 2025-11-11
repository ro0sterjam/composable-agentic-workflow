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
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, result: NodeExecutionResult) => void;
}

/**
 * Options for executing a DAG from a specific node
 */
export interface ExecuteFromNodeOptions extends DAGExecutionOptions {
  /**
   * Input value for the starting node (if not a source node)
   * If not provided and the node is not a source node, an error will be thrown
   */
  input?: unknown;
}

/**
 * Execute a serialized DAG
 */
export async function executeDAG(
  dag: SerializedDAG,
  options: DAGExecutionOptions = {}
): Promise<DAGExecutionResult> {
  const { executorRegistry = defaultExecutorRegistry, onNodeStart, onNodeComplete } = options;

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
      // Notify start callback
      if (onNodeStart) {
        onNodeStart(nodeId);
      }

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

  // Collect all node IDs that are part of subgraphs executed by map/flatmap nodes
  // These nodes are executed as part of the map/flatmap execution, not the main DAG flow
  const subgraphNodeIds = new Set<string>();

  // Recursively find all nodes in subgraphs starting from map/flatmap transformers
  const findSubgraphNodes = (transformerId: string, visited: Set<string>): void => {
    if (visited.has(transformerId)) {
      return; // Avoid infinite loops
    }
    visited.add(transformerId);

    // Find all nodes reachable from this transformer node
    const reachableFromTransformer = findReachableNodes(dag, transformerId);

    // Add all reachable nodes to the subgraph set
    for (const nodeId of reachableFromTransformer) {
      subgraphNodeIds.add(nodeId);
    }

    // Find nested map/flatmap nodes in this subgraph and recursively process them
    for (const nodeId of reachableFromTransformer) {
      const node = dag.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      const config = node.config as Record<string, unknown> | undefined;
      if (config && typeof config === 'object') {
        if ((node.type === 'map' || node.type === 'flatmap') && 'transformerId' in config) {
          const nestedTransformerId = config.transformerId;
          if (typeof nestedTransformerId === 'string') {
            findSubgraphNodes(nestedTransformerId, visited);
          }
        }
      }
    }
  };

  // Find all map/flatmap nodes and process their subgraphs
  for (const node of dag.nodes) {
    const config = node.config as Record<string, unknown> | undefined;
    if (config && typeof config === 'object') {
      // Check for transformerId in map and flatmap nodes
      if ((node.type === 'map' || node.type === 'flatmap') && 'transformerId' in config) {
        const transformerId = config.transformerId;
        if (typeof transformerId === 'string') {
          findSubgraphNodes(transformerId, new Set<string>());
        }
      }
      // Add other node reference patterns here as needed
    }
  }

  // Check if all nodes were executed
  // Subgraph nodes (e.g., nodes executed by map/flatmap) are executed by their parent nodes,
  // so they don't need to be in the results map to be considered "executed"
  const directlyExecutedNodeIds = new Set(results.keys());
  const allDirectlyExecutedNodes =
    directlyExecutedNodeIds.size + subgraphNodeIds.size >= nodes.size;

  // Check for nodes that should have been executed but weren't
  for (const nodeId of nodes.keys()) {
    if (!results.has(nodeId) && !subgraphNodeIds.has(nodeId)) {
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
 * Execute a subset of the DAG starting from a given node
 * Only executes nodes that are reachable from the starting node (downstream nodes)
 *
 * @param dag - The full serialized DAG
 * @param startNodeId - The node ID to start execution from
 * @param options - Execution options, including optional input for the starting node
 * @returns Execution result containing results for all executed nodes
 */
export async function executeDAGFromNode(
  dag: SerializedDAG,
  startNodeId: string,
  options: ExecuteFromNodeOptions = {}
): Promise<DAGExecutionResult> {
  const {
    executorRegistry = defaultExecutorRegistry,
    onNodeStart,
    onNodeComplete,
    input,
  } = options;

  // Find the starting node
  const startNode = dag.nodes.find((node) => node.id === startNodeId);
  if (!startNode) {
    throw new Error(`Node with ID "${startNodeId}" not found in DAG`);
  }

  // Find all nodes reachable from the starting node (downstream nodes)
  const reachableNodeIds = findReachableNodes(dag, startNodeId);

  // Also include any nodes referenced by reachable nodes (e.g., transformerId in map/flatmap)
  const referencedNodeIds = findReferencedNodes(dag, reachableNodeIds);
  const allNodeIdsToExecute = new Set([...reachableNodeIds, ...referencedNodeIds]);

  // Build subgraph with only reachable nodes and their edges
  const subgraphNodes = dag.nodes.filter((node) => allNodeIdsToExecute.has(node.id));
  const subgraphEdges = dag.edges.filter(
    (edge) => allNodeIdsToExecute.has(edge.from) && allNodeIdsToExecute.has(edge.to)
  );

  const subgraph: SerializedDAG = {
    nodes: subgraphNodes,
    edges: subgraphEdges,
  };

  // Check if starting node is a source node
  const sourceExecutor = executorRegistry.getSource(startNode.type);
  const isSourceNode = !!sourceExecutor;

  // If not a source node and no input provided, check if it has incoming edges in the full graph
  if (!isSourceNode && input === undefined) {
    const hasIncomingEdges = dag.edges.some((edge) => edge.to === startNodeId);
    if (hasIncomingEdges) {
      throw new Error(
        `Starting node "${startNodeId}" is not a source node and requires input, but no input was provided. ` +
          `Either provide input in options or start from a source node.`
      );
    }
  }

  // Build adjacency list for topological sort
  const nodes = new Map<string, SerializedNode>();
  const inDegree = new Map<string, number>();
  const adjacencyList = new Map<string, string[]>();

  // Initialize nodes and in-degree
  for (const node of subgraph.nodes) {
    nodes.set(node.id, node);
    // Count in-degree only from edges within the subgraph
    inDegree.set(node.id, 0);
    adjacencyList.set(node.id, []);
  }

  // Build graph and calculate in-degrees (only within subgraph)
  for (const edge of subgraph.edges) {
    const from = edge.from;
    const to = edge.to;

    if (!adjacencyList.has(from)) {
      adjacencyList.set(from, []);
    }
    adjacencyList.get(from)!.push(to);

    inDegree.set(to, (inDegree.get(to) || 0) + 1);
  }

  // Initialize queue with the starting node
  const queue: string[] = [];

  // Handle starting node specially
  if (isSourceNode) {
    // Source node - can execute without input
    queue.push(startNodeId);
  } else {
    // Non-source node - treat as if it has in-degree 0 in the subgraph
    // We'll provide input directly when executing
    queue.push(startNodeId);
    // Set in-degree to 0 so it can execute first
    inDegree.set(startNodeId, 0);
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
      // Notify start callback
      if (onNodeStart) {
        onNodeStart(nodeId);
      }

      // Get input for this node
      let nodeInput: unknown;
      if (nodeId === startNodeId && !isSourceNode && input !== undefined) {
        // Use provided input for starting node
        nodeInput = input;
      } else {
        // Get input from connected nodes (or undefined if source node)
        nodeInput = getNodeInput(nodeId, subgraph.edges, nodeOutputs);
      }

      // Execute the node
      const output = await executeNode(node, nodeInput, executorRegistry, dag, cache);

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

  // Check if all nodes in the subgraph were executed
  const allExecuted = Array.from(allNodeIdsToExecute).every((nodeId) => results.has(nodeId));

  return {
    results,
    success: allExecuted && Array.from(results.values()).every((r) => !r.error),
  };
}

/**
 * Find all nodes reachable from a given starting node (downstream nodes)
 * Uses breadth-first search to traverse the graph
 */
function findReachableNodes(dag: SerializedDAG, startNodeId: string): Set<string> {
  const reachable = new Set<string>([startNodeId]);
  const queue: string[] = [startNodeId];

  // Build adjacency list (forward edges - from -> to)
  const adjacencyList = new Map<string, string[]>();
  for (const edge of dag.edges) {
    if (!adjacencyList.has(edge.from)) {
      adjacencyList.set(edge.from, []);
    }
    adjacencyList.get(edge.from)!.push(edge.to);
  }

  // BFS to find all reachable nodes
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const neighbors = adjacencyList.get(nodeId) || [];

    for (const neighborId of neighbors) {
      if (!reachable.has(neighborId)) {
        reachable.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  return reachable;
}

/**
 * Find all nodes referenced by the given node IDs (e.g., transformerId in map/flatmap nodes)
 */
function findReferencedNodes(dag: SerializedDAG, nodeIds: Set<string>): Set<string> {
  const referenced = new Set<string>();

  for (const nodeId of nodeIds) {
    const node = dag.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const config = node.config as Record<string, unknown> | undefined;
    if (config && typeof config === 'object') {
      // Check for transformerId in map and flatmap nodes
      if ((node.type === 'map' || node.type === 'flatmap') && 'transformerId' in config) {
        const transformerId = config.transformerId;
        if (typeof transformerId === 'string') {
          referenced.add(transformerId);
        }
      }
      // Add other node reference patterns here as needed
    }
  }

  return referenced;
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
