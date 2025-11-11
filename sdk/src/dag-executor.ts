import { DAG, Node, NodeId, Connection, TransformerNode } from './types';

export type ExecutionState = 'idle' | 'running' | 'completed' | 'failed';

export interface ExecutionResult {
  nodeId: NodeId;
  state: ExecutionState;
  output?: unknown;
  error?: Error;
}

export interface ExecutionContext {
  nodeOutputs: Map<NodeId, Map<string, unknown>>; // nodeId -> portId -> value
  nodeStates: Map<NodeId, ExecutionState>;
  errors: Map<NodeId, Error>;
}

/**
 * DAG Executor - executes a DAG and tracks execution state
 */
export class DAGExecutor {
  private dag: DAG;
  private context: ExecutionContext;

  constructor(dag: DAG) {
    this.dag = dag;
    this.context = {
      nodeOutputs: new Map(),
      nodeStates: new Map(),
      errors: new Map(),
    };
  }

  /**
   * Get execution state for a node
   */
  getNodeState(nodeId: NodeId): ExecutionState {
    return this.context.nodeStates.get(nodeId) || 'idle';
  }

  /**
   * Get error for a node (if any)
   */
  getNodeError(nodeId: NodeId): Error | undefined {
    return this.context.errors.get(nodeId);
  }

  /**
   * Get all node states
   */
  getAllNodeStates(): Map<NodeId, ExecutionState> {
    return new Map(this.context.nodeStates);
  }

  /**
   * Get execution context (for accessing console logs)
   */
  getContext(): ExecutionContext {
    return this.context;
  }

  /**
   * Reset execution context
   */
  reset(): void {
    this.context = {
      nodeOutputs: new Map(),
      nodeStates: new Map(),
      errors: new Map(),
    };
  }

  /**
   * Find entry nodes (nodes with no incoming connections, or explicitly set entry nodes)
   */
  private findEntryNodes(): NodeId[] {
    const entryNodes: NodeId[] = [];

    // If entry node is explicitly set, use it
    if (this.dag.entryNodeId && this.dag.nodes.has(this.dag.entryNodeId)) {
      entryNodes.push(this.dag.entryNodeId);
      return entryNodes;
    }

    // Otherwise, find nodes with no incoming connections
    for (const nodeId of this.dag.nodes.keys()) {
      const incoming = this.dag.connections.filter((conn) => conn.toNodeId === nodeId);
      if (incoming.length === 0) {
        entryNodes.push(nodeId);
      }
    }

    return entryNodes;
  }

  /**
   * Get nodes that are ready to execute (all dependencies have completed)
   */
  private getReadyNodes(executed: Set<NodeId>): NodeId[] {
    const ready: NodeId[] = [];

    for (const nodeId of this.dag.nodes.keys()) {
      if (executed.has(nodeId)) continue;

      const incoming = this.dag.connections.filter((conn) => conn.toNodeId === nodeId);

      // For nodes with no dependencies, they're ready
      if (incoming.length === 0) {
        ready.push(nodeId);
        continue;
      }

      // Check if all dependencies are executed and have outputs
      const allDependenciesReady = incoming.every((conn) => {
        if (!executed.has(conn.fromNodeId)) {
          return false;
        }

        // Check if the source node has output on the expected port
        const fromNode = this.dag.nodes.get(conn.fromNodeId);
        if (!fromNode) return false;

        // Check if they're executed
        return true;
      });

      if (allDependenciesReady) {
        ready.push(nodeId);
      }
    }

    return ready;
  }

  /**
   * Get input value for a node from its incoming connections
   */
  private getNodeInput(nodeId: NodeId, portId: string): unknown {
    const connection = this.dag.connections.find(
      (conn) => conn.toNodeId === nodeId && conn.toPortId === portId
    );

    if (!connection) {
      return undefined;
    }

    const fromNodeOutputs = this.context.nodeOutputs.get(connection.fromNodeId);
    if (!fromNodeOutputs) {
      return undefined;
    }

    return fromNodeOutputs.get(connection.fromPortId);
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    nodeId: NodeId,
    onStateChange?: (nodeId: NodeId, state: ExecutionState) => void
  ): Promise<void> {
    const node = this.dag.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }


    // Mark as running
    this.context.nodeStates.set(nodeId, 'running');
    onStateChange?.(nodeId, 'running');

    try {
      let output: unknown;

      // Handle different node types
      // Source nodes and Standalone nodes have execute() with no parameters
      // Transformer and Terminal nodes have execute(input) with one parameter
      // Check if this is a source or standalone node by checking node type
      // Source nodes: 'literal' (produces output)
      // Standalone nodes: (produces no output, side effect only)
      // For now, we check the node type, but this could be extended
      const isSourceNode = node.type === 'literal'; // Add other source node types here as needed
      // TODO: Add standalone node type detection when standalone nodes are implemented

      if (isSourceNode) {
        // Source node - no input needed, execute() returns output
        const sourceNode = node as { execute(): Promise<unknown> | unknown };
        output = await Promise.resolve(sourceNode.execute());
      } else {
        // Transformer, Terminal, or Standalone node
        // Check if node has execute with no parameters (standalone) or one parameter (transformer/terminal)
        // For now, assume all non-source nodes need input
        // Get input from connections (may be undefined for standalone nodes that don't have connections)
        const input = this.getNodeInput(nodeId, 'input');
        const executableNode = node as { execute(input?: unknown): Promise<unknown> | unknown };
        output = await Promise.resolve(executableNode.execute(input));
        // Note: Terminal and Standalone nodes return void, so output will be undefined
      }

      // Store output if it's not undefined
      if (output !== undefined) {
        const outputs = this.context.nodeOutputs.get(nodeId) || new Map();
        outputs.set('output', output);
        this.context.nodeOutputs.set(nodeId, outputs);
      }

      // Mark as completed
      this.context.nodeStates.set(nodeId, 'completed');
      onStateChange?.(nodeId, 'completed');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.context.errors.set(nodeId, err);
      this.context.nodeStates.set(nodeId, 'failed');
      onStateChange?.(nodeId, 'failed');
      throw err;
    }
  }

  /**
   * Execute the entire DAG
   */
  async execute(onStateChange?: (nodeId: NodeId, state: ExecutionState) => void): Promise<void> {
    this.reset();

    const entryNodes = this.findEntryNodes();
    if (entryNodes.length === 0) {
      throw new Error('No entry nodes found in DAG');
    }

    const executed = new Set<NodeId>();
    const queue: NodeId[] = [...entryNodes];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;

      if (executed.has(nodeId)) {
        continue;
      }

      try {
        await this.executeNode(nodeId, onStateChange);
        executed.add(nodeId);

        // Add ready nodes to queue
        const ready = this.getReadyNodes(executed);
        for (const readyNodeId of ready) {
          if (!queue.includes(readyNodeId)) {
            queue.push(readyNodeId);
          }
        }
      } catch (error) {
        // Error already handled in executeNode, but we stop execution
        // Continue with other nodes that don't depend on this one
        executed.add(nodeId);
      }
    }
  }
}
