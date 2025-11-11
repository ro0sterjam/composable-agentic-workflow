import type { BaseNode, Port, Node } from '../types';
import { NodeBuilder } from './base-builder';

/**
 * Source node - outputs a literal value (no input)
 * This is a behavioral interface that source nodes should implement
 * Implementation: LiteralNode (type: NodeType.LITERAL)
 */
export interface SourceNode extends BaseNode {
  outputPorts: Port[];
  value: string | number | boolean | null | undefined;
}

/**
 * Builder for source nodes (Literal implementation)
 */
export class LiteralNodeBuilder extends NodeBuilder<Node & SourceNode> {
  value(val: string | number | boolean | null | undefined): this {
    this.node.value = val;
    return this;
  }

  outputPorts(ports: Port[]): this {
    this.node.outputPorts = ports;
    return this;
  }
}

