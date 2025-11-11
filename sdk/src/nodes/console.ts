import type { BaseNode, Port } from '../types';
import { NodeType } from '../types';
import { NodeBuilder } from './base-builder';

/**
 * Console sink node - implementation of Sink (takes input, logs to console, no output)
 */
export interface ConsoleSinkNode extends BaseNode {
  type: NodeType.CONSOLE;
  inputPorts: Port[];
  execute: (input: unknown) => Promise<void> | void;
}

/**
 * Builder for console sink nodes
 */
export class ConsoleSinkBuilder extends NodeBuilder<ConsoleSinkNode> {
  constructor(dag: import('../fluent-builder').FluentDAGBuilder, node: ConsoleSinkNode) {
    super(dag, node);
    // Define execute function that logs to console
    node.execute = (input: unknown) => {
      console.log('ConsoleSink:', input);
    };
  }

  inputPorts(ports: Port[]): this {
    this.node.inputPorts = ports;
    return this;
  }
}

