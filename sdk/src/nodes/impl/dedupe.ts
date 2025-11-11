import { TransformerNode } from '../types';

/**
 * Dedupe method options
 */
export type DedupeMethod = 'first' | 'last' | 'most frequent';

/**
 * Config type for DedupeTransformerNode
 */
export interface DedupeTransformerNodeConfig {
  byProperty?: string; // Property to dedupe by (supports dot notation for nested properties)
  method?: DedupeMethod; // Method to use when duplicates are found (default: 'first')
}

/**
 * Dedupe transformer node - removes duplicates from an array
 * @template InputType - The type of input data (typically an array)
 * @template OutputType - The type of output data (same array type, but deduplicated)
 */
export class DedupeTransformerNode<
  InputType = unknown[],
  OutputType = InputType,
> extends TransformerNode<InputType, OutputType, DedupeTransformerNodeConfig> {
  type: 'dedupe';

  constructor(id: string, config?: DedupeTransformerNodeConfig, label?: string) {
    super(id, 'dedupe', config, label);
    this.type = 'dedupe';
  }
}
