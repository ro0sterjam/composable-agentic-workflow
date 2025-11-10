import type { BaseNode, Port } from '../types';
import { NodeType } from '../types';
import { NodeBuilder } from './base-builder';

/**
 * Conditional node - branches based on condition
 */
export interface ConditionalNode extends BaseNode {
  type: NodeType.CONDITIONAL;
  inputPorts: Port[];
  trueOutputPort: Port;
  falseOutputPort: Port;
  condition: (input: unknown) => Promise<boolean> | boolean;
}

/**
 * Builder for conditional nodes
 */
export class ConditionalNodeBuilder extends NodeBuilder<ConditionalNode> {
  truePort(port: Port): this {
    this.node.trueOutputPort = port;
    return this;
  }

  falsePort(port: Port): this {
    this.node.falseOutputPort = port;
    return this;
  }
}

