import type { BaseNode, Port } from '../types';
import { NodeType } from '../types';
import { NodeBuilder } from './base-builder';

/**
 * Sink node - takes input but no output
 */
export interface SinkNode extends BaseNode {
  type: NodeType.SINK;
  inputPorts: Port[];
  execute: (input: unknown) => Promise<void> | void;
}

/**
 * Builder for sink nodes
 */
export class SinkNodeBuilder extends NodeBuilder<SinkNode> {
  execute(fn: (input: unknown) => Promise<void> | void): this {
    this.node.execute = fn;
    return this;
  }

  inputPorts(ports: Port[]): this {
    this.node.inputPorts = ports;
    return this;
  }
}

