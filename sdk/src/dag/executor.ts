import { defaultExecutorRegistry, getLoggerFromContext } from '../executors/registry';
import type { ExecutorRegistry, DAGContext } from '../executors/registry';
import { getLogger } from '../logger';

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
  lastNodeResult?: NodeExecutionResult; // Result of the last node executed in the graph/subgraph (may be undefined if last node is terminal)
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
  /**
   * Cache object to share across subgraph executions
   * If not provided, a new cache will be created for this subgraph execution
   */
  cache?: Record<string, unknown>;
}

/**
 * Validation result for DAG
 */
export interface DAGValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a DAG structure
 * Checks for common issues like duplicate edges pointing to the same target
 * and invalid node type connections
 */
export function validateDAG(
  dag: SerializedDAG,
  executorRegistry?: ExecutorRegistry
): DAGValidationResult {
  const errors: string[] = [];
  const registry = executorRegistry || defaultExecutorRegistry;

  // Build node map for quick lookup
  const nodeMap = new Map<string, SerializedNode>();
  for (const node of dag.nodes) {
    nodeMap.set(node.id, node);
  }

  // Helper function to determine node type category
  const getNodeCategory = (nodeId: string): 'source' | 'transformer' | 'terminal' | 'unknown' => {
    const node = nodeMap.get(nodeId);
    if (!node) return 'unknown';

    if (registry.getSource(node.type)) return 'source';
    if (registry.getTransformer(node.type)) return 'transformer';
    if (registry.getTerminal(node.type)) return 'terminal';
    return 'unknown';
  };

  // Check for duplicate edges with the same target (to)
  const targetToEdges = new Map<string, SerializedEdge[]>();
  for (const edge of dag.edges) {
    if (!targetToEdges.has(edge.to)) {
      targetToEdges.set(edge.to, []);
    }
    targetToEdges.get(edge.to)!.push(edge);
  }

  // Find targets with multiple incoming edges
  for (const [targetId, edges] of targetToEdges.entries()) {
    if (edges.length > 1) {
      const sources = edges.map((e) => e.from).join(', ');
      errors.push(
        `Node "${targetId}" has multiple incoming connections (from: ${sources}). Input connectors cannot have multiple connections.`
      );
    }
  }

  // Build set of nodes referenced by nesting nodes (map/flatmap/agent)
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
      // Check for tools in agent nodes
      if (node.type === 'agent' && 'tools' in config) {
        const tools = config.tools;
        if (Array.isArray(tools)) {
          for (const tool of tools) {
            if (typeof tool === 'object' && tool !== null && 'transformerId' in tool) {
              const toolTransformerId = tool.transformerId;
              if (typeof toolTransformerId === 'string') {
                referencedNodeIds.add(toolTransformerId);
              }
            }
          }
        }
      }
    }
  }

  // Validate node type connections
  for (const edge of dag.edges) {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);

    if (!fromNode) {
      errors.push(`Edge references non-existent source node "${edge.from}"`);
      continue;
    }

    if (!toNode) {
      errors.push(`Edge references non-existent target node "${edge.to}"`);
      continue;
    }

    const fromCategory = getNodeCategory(edge.from);
    const toCategory = getNodeCategory(edge.to);

    // Terminal nodes cannot be sources (they don't produce output)
    if (fromCategory === 'terminal') {
      const fromLabel = fromNode.label || fromNode.id;
      errors.push(
        `Invalid connection: Terminal node "${fromLabel}" (${fromNode.type}) cannot be a source. Terminal nodes do not produce output.`
      );
    }

    // Source nodes cannot be targets (they don't take input)
    if (toCategory === 'source') {
      const toLabel = toNode.label || toNode.id;
      errors.push(
        `Invalid connection: Source node "${toLabel}" (${toNode.type}) cannot be a target. Source nodes do not accept input.`
      );
    }

    // Nodes used as subgraphs cannot have incoming connections in the main DAG
    if (referencedNodeIds.has(edge.to)) {
      const toLabel = toNode.label || toNode.id;
      errors.push(
        `Invalid connection: Node "${toLabel}" (${toNode.type}) is being used as a subgraph transformer (by map/flatmap/agent) and cannot have incoming connections in the main DAG.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Execute a serialized DAG
 */
export async function executeDAG(
  dag: SerializedDAG,
  options: DAGExecutionOptions = {}
): Promise<DAGExecutionResult> {
  const { executorRegistry = defaultExecutorRegistry, onNodeStart, onNodeComplete } = options;

  // Validate DAG structure before execution
  const validation = validateDAG(dag, executorRegistry);
  if (!validation.valid) {
    const errorMessage = `DAG validation failed:\n${validation.errors.join('\n')}`;
    const logger = getLogger();
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

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
    const nodeLabel = node.label || nodeId;
    const logger = getLogger();
    const startTime = Date.now();

    try {
      // Log node start
      logger.debug(`[DAG] Starting node execution: ${nodeLabel} (${node.type})`);

      // Notify start callback
      if (onNodeStart) {
        onNodeStart(nodeId);
      }

      // Get input for this node (output from previous nodes)
      const input = getNodeInput(nodeId, dag.edges, nodeOutputs);

      // Execute the node
      const output = await executeNode(node, input, executorRegistry, dag, cache);

      // Calculate execution time
      const executionTime = Date.now() - startTime;

      // Store output
      nodeOutputs.set(nodeId, output);

      const result: NodeExecutionResult = {
        nodeId,
        output,
      };
      results.set(nodeId, result);

      // Log node completion with timing
      logger.debug(
        `[DAG] Completed node execution: ${nodeLabel} (${node.type}) - took ${executionTime}ms`
      );

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
      const executionTime = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));

      const result: NodeExecutionResult = {
        nodeId,
        error: errorObj,
      };
      results.set(nodeId, result);

      // Log node completion with error and timing
      logger.error(
        `[DAG] Failed node execution: ${nodeLabel} (${node.type}) - took ${executionTime}ms - ${errorObj.message}`
      );

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

  // Collect all node IDs that are part of subgraphs executed by map/flatmap/agent nodes
  // These nodes are executed as part of their parent node's execution, not the main DAG flow
  // They may execute conditionally, so we don't mark them as errors if they're not executed in the main flow
  const subgraphNodeIds = new Set<string>();

  // Recursively find all nodes in subgraphs starting from transformers
  const findSubgraphNodes = (transformerId: string, visited: Set<string>): void => {
    if (visited.has(transformerId)) {
      return; // Avoid infinite loops
    }
    visited.add(transformerId);

    // Find all nodes reachable from this transformer node
    const reachableFromTransformer = findReachableNodes(dag, transformerId);

    // Also include referenced nodes (e.g., transformerId in nested map/flatmap)
    const referencedNodeIds = findReferencedNodes(dag, reachableFromTransformer);
    const allSubgraphNodes = new Set([...reachableFromTransformer, ...referencedNodeIds]);

    // Add all nodes to the subgraph set
    for (const nodeId of allSubgraphNodes) {
      subgraphNodeIds.add(nodeId);
    }

    // Find nested map/flatmap/agent nodes in this subgraph and recursively process them
    for (const nodeId of allSubgraphNodes) {
      const node = dag.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      const config = node.config as Record<string, unknown> | undefined;
      if (config && typeof config === 'object') {
        // Check for nested map/flatmap nodes
        if ((node.type === 'map' || node.type === 'flatmap') && 'transformerId' in config) {
          const nestedTransformerId = config.transformerId;
          if (typeof nestedTransformerId === 'string') {
            findSubgraphNodes(nestedTransformerId, visited);
          }
        }
        // Check for nested agent nodes (tools)
        if (node.type === 'agent' && 'tools' in config) {
          const tools = config.tools;
          if (Array.isArray(tools)) {
            for (const tool of tools) {
              if (typeof tool === 'object' && tool !== null && 'transformerId' in tool) {
                const toolTransformerId = tool.transformerId;
                if (typeof toolTransformerId === 'string') {
                  findSubgraphNodes(toolTransformerId, visited);
                }
              }
            }
          }
        }
      }
    }
  };

  // Find all map/flatmap/agent nodes and process their subgraphs
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
      // Check for tools in agent nodes
      if (node.type === 'agent' && 'tools' in config) {
        const tools = config.tools;
        if (Array.isArray(tools)) {
          for (const tool of tools) {
            if (typeof tool === 'object' && tool !== null && 'transformerId' in tool) {
              const toolTransformerId = tool.transformerId;
              if (typeof toolTransformerId === 'string') {
                findSubgraphNodes(toolTransformerId, new Set<string>());
              }
            }
          }
        }
      }
    }
  }

  // Check if all nodes were executed
  // Subgraph nodes (e.g., nodes executed by map/flatmap/agent) are executed by their parent nodes,
  // so they don't need to be in the results map to be considered "executed"
  // Since subgraphs may execute conditionally, we don't mark them as errors if they're not in the main flow
  const directlyExecutedNodeIds = new Set(results.keys());
  const nodesInMainFlow = nodes.size - subgraphNodeIds.size;
  const allDirectlyExecutedNodes = directlyExecutedNodeIds.size >= nodesInMainFlow;

  // Check for nodes that should have been executed but weren't
  // Skip nodes that are part of subgraphs - they execute conditionally and don't need to be in the main flow
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
    cache: providedCache,
  } = options;

  // Find the starting node
  const startNode = dag.nodes.find((node) => node.id === startNodeId);
  if (!startNode) {
    throw new Error(`Node with ID "${startNodeId}" not found in DAG`);
  }

  // Find all nodes reachable from the starting node (downstream nodes)
  const reachableNodeIds = findReachableNodes(dag, startNodeId);
  const logger = getLogger();
  logger.debug(
    `[executeDAGFromNode] Starting from node '${startNodeId}', found ${reachableNodeIds.size} reachable nodes:`,
    Array.from(reachableNodeIds).join(', ')
  );

  // Also include any nodes referenced by reachable nodes (e.g., transformerId in map/flatmap)
  const referencedNodeIds = findReferencedNodes(dag, reachableNodeIds);
  logger.debug(
    `[executeDAGFromNode] Found ${referencedNodeIds.size} referenced nodes:`,
    Array.from(referencedNodeIds).join(', ')
  );
  const allNodeIdsToExecute = new Set([...reachableNodeIds, ...referencedNodeIds]);
  logger.debug(
    `[executeDAGFromNode] Total nodes to execute: ${allNodeIdsToExecute.size}`,
    Array.from(allNodeIdsToExecute).join(', ')
  );

  // Build subgraph with only reachable nodes and their edges
  const subgraphNodes = dag.nodes.filter((node) => allNodeIdsToExecute.has(node.id));
  const subgraphEdges = dag.edges.filter(
    (edge) => allNodeIdsToExecute.has(edge.from) && allNodeIdsToExecute.has(edge.to)
  );

  const subgraph: SerializedDAG = {
    nodes: subgraphNodes,
    edges: subgraphEdges,
  };

  // Validate subgraph structure before execution
  const subgraphValidation = validateDAG(subgraph, executorRegistry);
  if (!subgraphValidation.valid) {
    const errorMessage = `Subgraph validation failed:\n${subgraphValidation.errors.join('\n')}`;
    const logger = getLogger();
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Check if starting node is a source node
  const sourceExecutor = executorRegistry.getSource(startNode.type);
  const isSourceNode = !!sourceExecutor;
  logger.debug(
    `[executeDAGFromNode] Starting node '${startNodeId}' type: '${startNode.type}', isSourceNode: ${isSourceNode}, hasInput: ${input !== undefined}`
  );

  // If not a source node and no input provided, check if it has incoming edges in the full graph
  if (!isSourceNode && input === undefined) {
    const hasIncomingEdges = dag.edges.some((edge) => edge.to === startNodeId);
    logger.debug(
      `[executeDAGFromNode] Starting node '${startNodeId}' is not a source node, hasIncomingEdges: ${hasIncomingEdges}`
    );
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

  // Use provided cache if available, otherwise create a new one
  // This allows cache to be shared across subgraph executions (e.g., from agent tools)
  const cache: Record<string, unknown> = providedCache || {};

  // Topological sort and execution
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodes.get(nodeId)!;
    const nodeLabel = node.label || nodeId;
    const startTime = Date.now();

    try {
      // Log node start
      logger.debug(`[DAG] Starting node execution: ${nodeLabel} (${node.type})`);

      // Notify start callback
      if (onNodeStart) {
        onNodeStart(nodeId);
      }

      // Get input for this node
      let nodeInput: unknown;
      if (nodeId === startNodeId && !isSourceNode && input !== undefined) {
        // Use provided input for starting node
        nodeInput = input;
        logger.debug(
          `[executeDAGFromNode] Node '${nodeId}' using provided input:`,
          typeof nodeInput === 'string'
            ? nodeInput.substring(0, 100) + (nodeInput.length > 100 ? '...' : '')
            : JSON.stringify(nodeInput).substring(0, 100) + '...'
        );
      } else {
        // Get input from connected nodes (or undefined if source node)
        nodeInput = getNodeInput(nodeId, subgraph.edges, nodeOutputs);
        logger.debug(
          `[executeDAGFromNode] Node '${nodeId}' input from edges:`,
          nodeInput === undefined
            ? 'undefined'
            : typeof nodeInput === 'string'
              ? nodeInput.substring(0, 100) + (nodeInput.length > 100 ? '...' : '')
              : JSON.stringify(nodeInput).substring(0, 100) + '...'
        );
      }

      // Execute the node
      logger.debug(`[executeDAGFromNode] Executing node '${nodeId}' of type '${node.type}'`);
      const output = await executeNode(node, nodeInput, executorRegistry, dag, cache);
      logger.debug(
        `[executeDAGFromNode] Node '${nodeId}' execution completed, output type: ${typeof output}`
      );

      // Calculate execution time
      const executionTime = Date.now() - startTime;

      // Store output
      nodeOutputs.set(nodeId, output);

      const result: NodeExecutionResult = {
        nodeId,
        output,
      };
      results.set(nodeId, result);

      // Log node completion with timing
      logger.debug(
        `[DAG] Completed node execution: ${nodeLabel} (${node.type}) - took ${executionTime}ms`
      );

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
      const executionTime = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));

      const result: NodeExecutionResult = {
        nodeId,
        error: errorObj,
      };
      results.set(nodeId, result);

      // Log node completion with error and timing
      logger.error(
        `[DAG] Failed node execution: ${nodeLabel} (${node.type}) - took ${executionTime}ms - ${errorObj.message}`
      );

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

  // For subgraph execution, success means:
  // 1. The starting node executed (or at least we attempted to execute it)
  // 2. No errors occurred in any of the nodes that were executed
  // Note: Not all nodes in the subgraph need to execute (e.g., terminal nodes, unreachable nodes)
  const startingNodeExecuted = results.has(startNodeId);
  const nodesWithErrors = Array.from(results.entries()).filter(([_, r]) => r.error);
  const hasErrors = nodesWithErrors.length > 0;
  const success = startingNodeExecuted && !hasErrors;

  logger.debug(
    `[executeDAGFromNode] Execution completed. Starting node executed: ${startingNodeExecuted}, Results: ${results.size}/${allNodeIdsToExecute.size}`
  );
  logger.debug(`[executeDAGFromNode] Executed nodes:`, Array.from(results.keys()).join(', '));
  if (nodesWithErrors.length > 0) {
    logger.error(
      `[executeDAGFromNode] Nodes with errors:`,
      nodesWithErrors.map(([id, r]) => `${id}: ${r.error?.message}`).join(', ')
    );
  } else {
    logger.debug(`[executeDAGFromNode] Nodes with errors: none`);
  }
  logger.debug(
    `[executeDAGFromNode] Success: ${success} (startingNodeExecuted: ${startingNodeExecuted}, hasErrors: ${hasErrors})`
  );

  return {
    results,
    success,
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
 * Find all nodes referenced by the given node IDs (e.g., transformerId in map/flatmap/agent nodes)
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
      // Check for tools in agent nodes
      if (node.type === 'agent' && 'tools' in config) {
        const tools = config.tools;
        if (Array.isArray(tools)) {
          for (const tool of tools) {
            if (typeof tool === 'object' && tool !== null && 'transformerId' in tool) {
              const toolTransformerId = tool.transformerId;
              if (typeof toolTransformerId === 'string') {
                referenced.add(toolTransformerId);
              }
            }
          }
        }
      }
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
  const logger = getLogger();
  const nodeType = node.type;
  const dagContext: DAGContext = { dag, executorRegistry, cache };

  logger.debug(`[executeNode] Executing node '${node.id}' of type '${nodeType}'`);

  // Try to find an executor for this node type
  const sourceExecutor = executorRegistry.getSource(nodeType);
  const transformerExecutor = executorRegistry.getTransformer(nodeType);
  const terminalExecutor = executorRegistry.getTerminal(nodeType);
  const standaloneExecutor = executorRegistry.getStandalone(nodeType);

  try {
    if (sourceExecutor) {
      // Source node - no input needed
      logger.debug(`[executeNode] Executing source node '${node.id}'`);
      const output = await Promise.resolve(sourceExecutor.execute(node.config || {}, dagContext));
      logger.debug(
        `[executeNode] Source node '${node.id}' completed, output type: ${typeof output}`
      );
      return output;
    } else if (transformerExecutor) {
      // Transformer node - needs input
      if (input === undefined) {
        const error = new Error(`Transformer node ${node.id} requires input but none was provided`);
        logger.error(`[executeNode] ${error.message}`);
        throw error;
      }
      logger.debug(
        `[executeNode] Executing transformer node '${node.id}' with input type: ${typeof input}`
      );
      const output = await Promise.resolve(
        transformerExecutor.execute(input, node.config || {}, dagContext)
      );
      logger.debug(
        `[executeNode] Transformer node '${node.id}' completed, output type: ${typeof output}`
      );
      return output;
    } else if (terminalExecutor) {
      // Terminal node - needs input, no output
      if (input === undefined) {
        const error = new Error(`Terminal node ${node.id} requires input but none was provided`);
        logger.error(`[executeNode] ${error.message}`);
        throw error;
      }
      logger.debug(
        `[executeNode] Executing terminal node '${node.id}' with input type: ${typeof input}`
      );
      await Promise.resolve(terminalExecutor.execute(input, node.config || {}, dagContext));
      logger.debug(`[executeNode] Terminal node '${node.id}' completed`);
      return undefined; // Terminal nodes don't produce output
    } else if (standaloneExecutor) {
      // Standalone node - no input, no output
      logger.debug(`[executeNode] Executing standalone node '${node.id}'`);
      await Promise.resolve(standaloneExecutor.execute(node.config || {}, dagContext));
      logger.debug(`[executeNode] Standalone node '${node.id}' completed`);
      return undefined; // Standalone nodes don't produce output
    } else {
      const error = new Error(
        `No executor found for node type: ${nodeType}. Make sure an executor is registered for this node type.`
      );
      logger.error(`[executeNode] ${error.message}`);
      throw error;
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error(`[executeNode] Error executing node '${node.id}':`, errorObj.message);
    if (errorObj.stack) {
      logger.error(`[executeNode] Node '${node.id}' error stack:`, errorObj.stack);
    }
    if (error instanceof Error && error.cause) {
      logger.error(`[executeNode] Node '${node.id}' error cause:`, error.cause);
    }
    throw errorObj;
  }
}
