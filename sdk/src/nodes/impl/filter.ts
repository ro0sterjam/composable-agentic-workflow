import { TransformerNode } from '../types';

/**
 * Config type for FilterTransformerNode
 */
export interface FilterTransformerNodeConfig {
  expression: string; // Expression to evaluate (uses 'input' as the variable name)
}

/**
 * Filter transformer node - filters array items based on an expression
 * @template InputType - The type of input data (should be an array)
 * @template OutputType - The type of output data (filtered array)
 */
export class FilterTransformerNode<
  InputType = unknown[],
  OutputType = InputType,
> extends TransformerNode<InputType, OutputType, FilterTransformerNodeConfig> {
  type: 'filter';

  constructor(id: string, config: FilterTransformerNodeConfig, label?: string) {
    super(id, 'filter', config, label);
    this.type = 'filter';
  }
}
