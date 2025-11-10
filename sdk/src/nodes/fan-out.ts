import type { BaseNode, Port, DAG } from '../types';
import { NodeType } from '../types';
import { NodeBuilder } from './base-builder';

/**
 * Fan-out node - duplicates input to multiple paths
 */
export interface FanOutNode extends BaseNode {
  type: NodeType.FAN_OUT;
  inputPorts: Port[];
  outputBranches: Array<{
    port: Port;
    subDag?: DAG; // Optional sub-DAG for this branch
  }>;
}

/**
 * Builder for fan-out nodes
 */
export class FanOutNodeBuilder extends NodeBuilder<FanOutNode> {
  branch(port: Port, subDag?: DAG): this {
    this.node.outputBranches.push({ port, subDag });
    return this;
  }
}

