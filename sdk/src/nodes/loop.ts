import type { BaseNode, Port, DAG } from '../types';
import { NodeType } from '../types';
import { NodeBuilder } from './base-builder';

/**
 * Loop node - wraps a sub-DAG that runs iteratively
 */
export interface LoopNode extends BaseNode {
  type: NodeType.LOOP;
  inputPorts: Port[];
  outputPorts: Port[];
  subDag: DAG;
  loopCondition: (input: unknown, iteration: number) => Promise<boolean> | boolean;
  maxIterations?: number;
}

/**
 * Builder for loop nodes
 */
export class LoopNodeBuilder extends NodeBuilder<LoopNode> {
  maxIterations(max: number): this {
    this.node.maxIterations = max;
    return this;
  }

  subDag(dag: DAG): this {
    this.node.subDag = dag;
    return this;
  }
}

