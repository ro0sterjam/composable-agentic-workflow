import { TransformerNode } from '../types';

/**
 * Config type for CacheTransformerNode
 */
export interface CacheTransformerNodeConfig {
  property: string; // Property path where cached value will live (supports dot notation)
}

/**
 * Cache transformer node - caches input in DAG context cache
 * @template InputType - The type of input data
 * @template OutputType - The type of output data (same as input, passes through unchanged)
 */
export class CacheTransformerNode<
  InputType = unknown,
  OutputType = InputType,
> extends TransformerNode<InputType, OutputType, CacheTransformerNodeConfig> {
  type: 'cache';

  constructor(
    id: string,
    config: CacheTransformerNodeConfig,
    label?: string
  ) {
    super(id, 'cache', config, label);
    this.type = 'cache';
  }
}

