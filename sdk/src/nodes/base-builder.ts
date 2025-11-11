import type { TransformerNode, SourceNode, TerminalNode, StandAloneNode } from './types';
import type { DAGBuilder } from '../dag-builder';

/**
 * Union type for all node types
 */
type BaseNode = TransformerNode<any, any> | SourceNode<any> | TerminalNode<any> | StandAloneNode;

/**
 * Base class for node builders
 */
export class NodeBuilder<T extends BaseNode> {
  constructor(
    protected dag: DAGBuilder,
    protected node: T
  ) {}

  label(text: string): this {
    this.node.label = text;
    return this;
  }

  metadata(data: Record<string, unknown>): this {
    if ('metadata' in this.node) {
      const nodeWithMetadata = this.node as { metadata?: Record<string, unknown> };
      nodeWithMetadata.metadata = { ...nodeWithMetadata.metadata, ...data };
    }
    return this;
  }

  /**
   * Connect this node's output to another node's input
   */
  to(nodeId: string, port: string = 'output'): DAGBuilder {
    this.dag.connect(this.node.id, 'output', nodeId, port);
    return this.dag;
  }

  /**
   * Connect this node's specific output port (for fan-out)
   */
  toPort(portId: string, nodeId: string, toPort: string = 'input'): DAGBuilder {
    this.dag.connect(this.node.id, portId, nodeId, toPort);
    return this.dag;
  }
}

