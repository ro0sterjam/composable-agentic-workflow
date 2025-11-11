import { SourceNode } from './types';

/**
 * Literal source node - implementation of Source (outputs a literal value, no input)
 * @template OutputType - The type of output data
 */
export class LiteralSourceNode<OutputType> extends SourceNode<OutputType> {
  type: 'literal';
  value: OutputType;

  constructor(id: string, value: OutputType, label?: string) {
    super(id, 'literal', label);
    this.type = 'literal';
    this.value = value;
  }

  execute(): OutputType {
    return this.value;
  }
}

