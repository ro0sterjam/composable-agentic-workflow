import type { BaseNode, Port } from '../types';
import { NodeType } from '../types';
import { NodeBuilder } from './base-builder';

/**
 * Literal node - implementation of Source (outputs a literal value, no input)
 */
export interface LiteralNode extends BaseNode {
  type: NodeType.LITERAL;
  outputPorts: Port[];
  value: string | number | boolean | null | undefined;
}

/**
 * Builder for literal nodes
 */
export class LiteralNodeBuilder extends NodeBuilder<LiteralNode> {
  value(val: string | number | boolean | null | undefined): this {
    this.node.value = val;
    return this;
  }

  outputPorts(ports: Port[]): this {
    this.node.outputPorts = ports;
    return this;
  }
}

