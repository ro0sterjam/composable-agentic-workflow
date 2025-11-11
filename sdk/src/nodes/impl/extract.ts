import { TransformerNode } from '../types';

/**
 * Config type for ExtractTransformerNode
 */
export interface ExtractTransformerNodeConfig {
  property: string; // Property path to extract (supports dot notation)
}

/**
 * Extract transformer node - extracts a property from input
 * @template InputType - The type of input data
 * @template OutputType - The type of output data (the extracted property value)
 */
export class ExtractTransformerNode<
  InputType = unknown,
  OutputType = unknown,
> extends TransformerNode<InputType, OutputType, ExtractTransformerNodeConfig> {
  type: 'extract';

  constructor(id: string, config: ExtractTransformerNodeConfig, label?: string) {
    super(id, 'extract', config, label);
    this.type = 'extract';
  }
}
