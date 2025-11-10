import { DAG, Node, NodeId, Connection, PortId } from '../types/node';

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

    // TODO: Check for cycles (would need topological sort)

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

