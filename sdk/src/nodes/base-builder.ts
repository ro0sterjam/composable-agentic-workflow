import type { Node } from '../types';
import { NodeType } from '../types';
import type { FluentDAGBuilder } from '../fluent-builder';

/**
 * Base class for node builders
 */
export class NodeBuilder<T extends Node> {
  constructor(
    protected dag: FluentDAGBuilder,
    protected node: T
  ) {}

  label(text: string): this {
    this.node.label = text;
    return this;
  }

  metadata(data: Record<string, unknown>): this {
    this.node.metadata = { ...this.node.metadata, ...data };
    return this;
  }

  /**
   * Connect this node's output to another node's input
   */
  to(nodeId: string, port: string = 'input'): FluentDAGBuilder {
    const outputPort = this.node.type === NodeType.CONDITIONAL 
      ? 'true' 
      : 'output';
    this.dag.connect(this.node.id, outputPort, nodeId, port);
    return this.dag;
  }

  /**
   * Connect this node's true output (for conditionals)
   */
  toTrue(nodeId: string, port: string = 'input'): FluentDAGBuilder {
    if (this.node.type === NodeType.CONDITIONAL) {
      this.dag.connect(this.node.id, 'true', nodeId, port);
    }
    return this.dag;
  }

  /**
   * Connect this node's false output (for conditionals)
   */
  toFalse(nodeId: string, port: string = 'input'): FluentDAGBuilder {
    if (this.node.type === NodeType.CONDITIONAL) {
      this.dag.connect(this.node.id, 'false', nodeId, port);
    }
    return this.dag;
  }

  /**
   * Connect this node's specific output port (for fan-out)
   */
  toPort(portId: string, nodeId: string, toPort: string = 'input'): FluentDAGBuilder {
    this.dag.connect(this.node.id, portId, nodeId, toPort);
    return this.dag;
  }
}

