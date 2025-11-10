import type { BaseNode, Port } from '../types';
import { NodeType } from '../types';
import { NodeBuilder } from './base-builder';

/**
 * Aggregator node - combines multiple inputs into one output
 */
export interface AggregatorNode extends BaseNode {
  type: NodeType.AGGREGATOR;
  inputPorts: Port[];
  outputPorts: Port[];
  aggregate: (inputs: unknown[]) => Promise<unknown> | unknown;
}

/**
 * Builder for aggregator nodes
 */
export class AggregatorNodeBuilder extends NodeBuilder<AggregatorNode> {
  inputPorts(ports: Port[]): this {
    this.node.inputPorts = ports;
    return this;
  }

  outputPorts(ports: Port[]): this {
    this.node.outputPorts = ports;
    return this;
  }
}

