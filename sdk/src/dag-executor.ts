import { DAG, Node, NodeId, Connection, NodeType } from './types';
import { executeLLMNode } from './llm-executor';
import type { LiteralNode, LLMNode, ConditionalNode, ConsoleSinkNode, AggregatorNode } from './nodes';
import type { DAGConfig } from './dag-config';

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
  private config: DAGConfig;

  constructor(dag: DAG, config?: DAGConfig) {
    this.dag = dag;
    this.config = config || {};
    this.context = {
      nodeOutputs: new Map(),
      nodeStates: new Map(),
      errors: new Map(),
    };
  }

  /**
   * Get the configuration
   */
  getConfig(): DAGConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  setConfig(config: DAGConfig): void {
    this.config = config;
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
      const incoming = this.dag.connections.filter(conn => conn.toNodeId === nodeId);
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

      const incoming = this.dag.connections.filter(conn => conn.toNodeId === nodeId);
      
      // For nodes with no dependencies, they're ready
      if (incoming.length === 0) {
        ready.push(nodeId);
        continue;
      }

      // Check if all dependencies are executed and have outputs
      const allDependenciesReady = incoming.every(conn => {
        if (!executed.has(conn.fromNodeId)) {
          return false;
        }
        
        // Check if the source node has output on the expected port
        const fromNode = this.dag.nodes.get(conn.fromNodeId);
        if (!fromNode) return false;

        // For conditional nodes, check if the connection is on the correct branch
        if (fromNode.type === NodeType.CONDITIONAL) {
          const conditionalNode = fromNode as ConditionalNode;
          const outputs = this.context.nodeOutputs.get(conn.fromNodeId);
          if (!outputs) return false;
          
          // Check if this connection is on the active branch
          const hasTrueOutput = outputs.has(conditionalNode.trueOutputPort.id);
          const hasFalseOutput = outputs.has(conditionalNode.falseOutputPort.id);
          
          // If connecting to true port, must have true output
          if (conn.fromPortId === conditionalNode.trueOutputPort.id) {
            return hasTrueOutput;
          }
          // If connecting to false port, must have false output
          if (conn.fromPortId === conditionalNode.falseOutputPort.id) {
            return hasFalseOutput;
          }
        }

        // For other nodes, just check if they're executed
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
      conn => conn.toNodeId === nodeId && conn.toPortId === portId
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
  private async executeNode(nodeId: NodeId, onStateChange?: (nodeId: NodeId, state: ExecutionState) => void): Promise<void> {
    const node = this.dag.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Mark as running
    this.context.nodeStates.set(nodeId, 'running');
    onStateChange?.(nodeId, 'running');

    try {
      let output: unknown;

      switch (node.type) {
        case NodeType.LITERAL: {
          const literalNode = node as LiteralNode;
          output = literalNode.value;
          break;
        }

        case NodeType.LLM: {
          const llmNode = node as LLMNode;
          const input = this.getNodeInput(nodeId, 'input');
          output = await executeLLMNode(
            input, 
            llmNode.model, 
            llmNode.structuredOutput,
            this.config
          );
          break;
        }

        case NodeType.CONDITIONAL: {
          const conditionalNode = node as ConditionalNode;
          const input = this.getNodeInput(nodeId, 'input');
          const conditionResult = await conditionalNode.condition(input);
          // Store output on the appropriate port (true or false)
          const outputs = this.context.nodeOutputs.get(nodeId) || new Map();
          if (conditionResult) {
            outputs.set(conditionalNode.trueOutputPort.id, input);
          } else {
            outputs.set(conditionalNode.falseOutputPort.id, input);
          }
          this.context.nodeOutputs.set(nodeId, outputs);
          output = input; // Pass input through
          break;
        }

        case NodeType.CONSOLE: {
          const consoleNode = node as ConsoleSinkNode;
          const input = this.getNodeInput(nodeId, 'input');
          
          // Capture console output by temporarily overriding console.log
          const originalConsoleLog = console.log;
          const capturedLogs: string[] = [];
          
          console.log = (...args: unknown[]) => {
            const logMessage = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            capturedLogs.push(logMessage);
            originalConsoleLog.apply(console, args);
          };
          
          try {
            // Execute the console node (which will call console.log)
            await consoleNode.execute(input);
            
            // Also log the input directly if no logs were captured
            // This ensures we always have output even if the execute function doesn't call console.log
            if (capturedLogs.length === 0) {
              const inputLog = typeof input === 'object' 
                ? JSON.stringify(input, null, 2) 
                : String(input);
              capturedLogs.push(inputLog);
              originalConsoleLog('ConsoleSink:', input);
            }
            
            // Store captured logs in the execution context for retrieval
            if (capturedLogs.length > 0) {
              const outputs = this.context.nodeOutputs.get(nodeId) || new Map();
              outputs.set('_console_logs', capturedLogs);
              this.context.nodeOutputs.set(nodeId, outputs);
            }
          } finally {
            console.log = originalConsoleLog;
          }
          
          output = undefined; // Console nodes don't have output
          break;
        }

        case NodeType.AGGREGATOR: {
          const aggregatorNode = node as AggregatorNode;
          // Collect all inputs from incoming connections
          const inputs: unknown[] = [];
          const incoming = this.dag.connections.filter(conn => conn.toNodeId === nodeId);
          for (const conn of incoming) {
            const fromOutputs = this.context.nodeOutputs.get(conn.fromNodeId);
            if (fromOutputs) {
              const value = fromOutputs.get(conn.fromPortId);
              inputs.push(value);
            }
          }
          output = await aggregatorNode.aggregate(inputs);
          break;
        }

        default:
          throw new Error(`Unsupported node type: ${node.type}`);
      }

      // Store output
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

