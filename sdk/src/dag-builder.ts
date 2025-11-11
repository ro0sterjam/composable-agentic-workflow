import { DAG, Node, NodeId, Connection, PortId, DAGData, NodeType } from './types';
import type { ConditionalNode, LoopNode, FanOutNode, AggregatorNode, LiteralNode, ConsoleSinkNode } from './nodes';

/**
 * DAG Builder and Manager
 */
export class DAGBuilder {
  private dag: DAG;

  constructor(id: string) {
    this.dag = {
      id,
      nodes: new Map(),
      connections: [],
    };
  }

  /**
   * Add a node to the DAG
   */
  addNode(node: Node): this {
    this.dag.nodes.set(node.id, node);
    return this;
  }

  /**
   * Remove a node and all its connections
   */
  removeNode(nodeId: NodeId): this {
    this.dag.nodes.delete(nodeId);
    this.dag.connections = this.dag.connections.filter(
      (conn) => conn.fromNodeId !== nodeId && conn.toNodeId !== nodeId
    );
    return this;
  }

  /**
   * Connect two nodes
   */
  connect(
    fromNodeId: NodeId,
    fromPortId: PortId,
    toNodeId: NodeId,
    toPortId: PortId,
    connectionId?: string
  ): this {
    const connection: Connection = {
      id: connectionId || `${fromNodeId}:${fromPortId}->${toNodeId}:${toPortId}`,
      fromNodeId,
      fromPortId,
      toNodeId,
      toPortId,
    };
    this.dag.connections.push(connection);
    return this;
  }

  /**
   * Remove a connection
   */
  disconnect(connectionId: string): this {
    this.dag.connections = this.dag.connections.filter((conn) => conn.id !== connectionId);
    return this;
  }

  /**
   * Set the entry node
   */
  setEntryNode(nodeId: NodeId): this {
    this.dag.entryNodeId = nodeId;
    return this;
  }

  /**
   * Add exit node
   */
  addExitNode(nodeId: NodeId): this {
    if (!this.dag.exitNodeIds) {
      this.dag.exitNodeIds = [];
    }
    this.dag.exitNodeIds.push(nodeId);
    return this;
  }

  /**
   * Get the built DAG
   */
  build(): DAG {
    return this.dag;
  }

  /**
   * Get a node by ID
   */
  getNode(nodeId: NodeId): Node | undefined {
    return this.dag.nodes.get(nodeId);
  }

  /**
   * Get all connections for a node
   */
  getNodeConnections(nodeId: NodeId): Connection[] {
    return this.dag.connections.filter(
      (conn) => conn.fromNodeId === nodeId || conn.toNodeId === nodeId
    );
  }

  /**
   * Get incoming connections for a node
   */
  getIncomingConnections(nodeId: NodeId): Connection[] {
    return this.dag.connections.filter((conn) => conn.toNodeId === nodeId);
  }

  /**
   * Get outgoing connections for a node
   */
  getOutgoingConnections(nodeId: NodeId): Connection[] {
    return this.dag.connections.filter((conn) => conn.fromNodeId === nodeId);
  }

  /**
   * Validate the DAG structure
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if entry node exists
    if (this.dag.entryNodeId && !this.dag.nodes.has(this.dag.entryNodeId)) {
      errors.push(`Entry node ${this.dag.entryNodeId} does not exist`);
    }

    // Check if exit nodes exist
    if (this.dag.exitNodeIds) {
      for (const exitNodeId of this.dag.exitNodeIds) {
        if (!this.dag.nodes.has(exitNodeId)) {
          errors.push(`Exit node ${exitNodeId} does not exist`);
        }
      }
    }

    // Validate connections reference existing nodes
    for (const conn of this.dag.connections) {
      if (!this.dag.nodes.has(conn.fromNodeId)) {
        errors.push(`Connection references non-existent from node: ${conn.fromNodeId}`);
      }
      if (!this.dag.nodes.has(conn.toNodeId)) {
        errors.push(`Connection references non-existent to node: ${conn.toNodeId}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Serialize DAG to JSON
   */
  toJSON(): DAGData {
    const nodes: Record<NodeId, any> = {};
    
    for (const [id, node] of this.dag.nodes.entries()) {
      const serializable: any = {
        id: node.id,
        type: node.type,
        label: node.label,
        metadata: node.metadata,
      };

      // Check for execution-like nodes (LLM, EXA_SEARCH, etc.)
      if (node.type === NodeType.LLM || node.type === NodeType.EXA_SEARCH) {
        const execNode = node as { inputPorts: any[]; outputPorts: any[] };
        serializable.inputPorts = execNode.inputPorts;
        serializable.outputPorts = execNode.outputPorts;
      } else if (node.type === NodeType.CONDITIONAL) {
        const condNode = node as ConditionalNode;
        serializable.inputPorts = condNode.inputPorts;
        serializable.trueOutputPort = condNode.trueOutputPort;
        serializable.falseOutputPort = condNode.falseOutputPort;
      } else if (node.type === NodeType.LOOP) {
        const loopNode = node as LoopNode;
        serializable.inputPorts = loopNode.inputPorts;
        serializable.outputPorts = loopNode.outputPorts;
        serializable.maxIterations = loopNode.maxIterations;
        // Note: subDag would need to be serialized recursively
        // For now, we'll skip it or serialize it separately
      } else if (node.type === NodeType.FAN_OUT) {
        const fanOutNode = node as FanOutNode;
        serializable.inputPorts = fanOutNode.inputPorts;
        serializable.outputBranches = fanOutNode.outputBranches.map(branch => ({
          port: branch.port,
          // subDag would need recursive serialization
        }));
      } else if (node.type === NodeType.AGGREGATOR) {
        const aggNode = node as AggregatorNode;
        serializable.inputPorts = aggNode.inputPorts;
        serializable.outputPorts = aggNode.outputPorts;
      } else if (node.type === NodeType.LITERAL) {
        const literalNode = node as LiteralNode;
        serializable.outputPorts = literalNode.outputPorts;
        serializable.value = literalNode.value;
      } else if (node.type === NodeType.CONSOLE) {
        const consoleNode = node as ConsoleSinkNode;
        serializable.inputPorts = consoleNode.inputPorts;
      }

      nodes[id] = serializable;
    }

    return {
      id: this.dag.id,
      nodes,
      connections: this.dag.connections,
      entryNodeId: this.dag.entryNodeId,
      exitNodeIds: this.dag.exitNodeIds,
    };
  }

  /**
   * Create DAGBuilder from JSON
   */
  static fromJSON(data: DAGData): DAGBuilder {
    const builder = new DAGBuilder(data.id);
    
    // Note: This creates placeholder nodes without functions
    // In a real implementation, you'd need to restore functions from metadata or configuration
    for (const [id, nodeData] of Object.entries(data.nodes)) {
      // This is a simplified version - you'd need to properly reconstruct nodes
      // For now, we'll just store the serializable data
    }

    for (const conn of data.connections) {
      builder.connect(conn.fromNodeId, conn.fromPortId, conn.toNodeId, conn.toPortId, conn.id);
    }

    if (data.entryNodeId) {
      builder.setEntryNode(data.entryNodeId);
    }

    if (data.exitNodeIds) {
      for (const exitId of data.exitNodeIds) {
        builder.addExitNode(exitId);
      }
    }

    return builder;
  }
}

