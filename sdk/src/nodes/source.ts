import type { BaseNode, Port } from '../types';
import { NodeType } from '../types';
import { NodeBuilder } from './base-builder';

/**
 * Source node - outputs a literal value (no input)
 * Implementation: Literal
 */
export interface SourceNode extends BaseNode {
  type: NodeType.SOURCE;
  outputPorts: Port[];
  value: string | number | boolean | null | undefined;
}

/**
 * Builder for source nodes (Literal implementation)
 */
export class LiteralNodeBuilder extends NodeBuilder<SourceNode> {
  value(val: string | number | boolean | null | undefined): this {
    this.node.value = val;
    return this;
  }

  outputPorts(ports: Port[]): this {
    this.node.outputPorts = ports;
    return this;
  }
}

