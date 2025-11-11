import type { Node } from '../types';
import { NodeBuilder } from './base-builder';
import type { TerminalNode } from './types';

/**
 * Builder for sink nodes
 */
export class SinkNodeBuilder<InputType> extends NodeBuilder<Node & TerminalNode<InputType>> {
  execute(fn: (input: InputType) => Promise<void> | void): this {
    this.node.execute = fn;
    return this;
  }
}

