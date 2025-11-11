import type { BaseNode, Port, Node } from '../types';
import { NodeBuilder } from './base-builder';

/**
 * Sink node - takes input but no output
 * This is a behavioral interface that sink nodes should implement
 * Implementation: ConsoleSinkNode (type: NodeType.CONSOLE)
 */
export interface SinkNode extends BaseNode {
  inputPorts: Port[];
  execute: (input: unknown) => Promise<void> | void;
}

/**
 * Builder for sink nodes
 * Note: This builder is not used directly. ConsoleSinkBuilder is used instead.
 */
export class SinkNodeBuilder extends NodeBuilder<Node & SinkNode> {
  execute(fn: (input: unknown) => Promise<void> | void): this {
    this.node.execute = fn;
    return this;
  }

  inputPorts(ports: Port[]): this {
    this.node.inputPorts = ports;
    return this;
  }
}

