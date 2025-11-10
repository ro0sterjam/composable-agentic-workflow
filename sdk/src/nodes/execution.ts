import type { BaseNode, Port } from '../types';
import { NodeType } from '../types';
import { NodeBuilder } from './base-builder';

/**
 * Execution node - takes input, produces output
 */
export interface ExecutionNode extends BaseNode {
  type: NodeType.EXECUTION;
  inputPorts: Port[];
  outputPorts: Port[];
  execute: (input: unknown) => Promise<unknown> | unknown;
}

/**
 * Builder for execution nodes
 */
export class ExecutionNodeBuilder extends NodeBuilder<ExecutionNode> {
  inputPorts(ports: Port[]): this {
    this.node.inputPorts = ports;
    return this;
  }

  outputPorts(ports: Port[]): this {
    this.node.outputPorts = ports;
    return this;
  }
}

