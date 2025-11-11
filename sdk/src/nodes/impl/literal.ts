import { SourceNode } from '../types';

/**
 * Config type for LiteralSourceNode
 */
export interface LiteralSourceNodeConfig<OutputType> {
  value: OutputType;
}

/**
 * Literal source node - implementation of Source (outputs a literal value, no input)
 * @template OutputType - The type of output data
 */
export class LiteralSourceNode extends SourceNode<string, LiteralSourceNodeConfig<string>> {
  type: 'literal';

  constructor(id: string, config: LiteralSourceNodeConfig<string>, label?: string) {
    super(id, 'literal', config, label);
    this.type = 'literal';
  }
}
