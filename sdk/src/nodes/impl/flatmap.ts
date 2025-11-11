import { TransformerNode } from '../types';

/**
 * Config type for FlatMapTransformerNode
 */
export interface FlatMapTransformerNodeConfig {
  parallel?: boolean; // If true, run maps in parallel; otherwise in sequence (defaults to true)
  transformerId: string; // ID of the transformer node to apply to each element (added by constructor)
}

/**
 * FlatMap transformer node - applies a transformer to each element of an input array and flattens the results
 * The transformer must output an array, and all arrays are flattened into a single array
 * @template InputType - The type of each input element
 * @template OutputType - The type of each output element (after flattening)
 */
export class FlatMapTransformerNode<InputType, OutputType> extends TransformerNode<
  InputType[],
  OutputType[],
  FlatMapTransformerNodeConfig
> {
  type: 'flatmap';
  transformer: TransformerNode<InputType, OutputType[], unknown>;

  /**
   * Creates a new FlatMapTransformerNode
   * @param id - Unique identifier for the node
   * @param transformer - The transformer node to apply to each element (must output an array, cannot be a SequentialTransformerNode)
   * @param config - Optional configuration with parallel flag (defaults to true). transformerId is added automatically.
   * @param label - Optional label for the node
   */
  constructor(
    id: string,
    transformer: TransformerNode<InputType, OutputType[], unknown>,
    config?: Omit<FlatMapTransformerNodeConfig, 'transformerId'>,
    label?: string
  ) {
    // Reject SequentialTransformerNode - flatmap can only execute a single transformer
    if (transformer.type === 'sequential') {
      throw new Error(
        'FlatMapTransformerNode cannot accept a SequentialTransformerNode. Use a single transformer node instead.'
      );
    }

    super(
      id,
      'flatmap',
      {
        parallel: config?.parallel ?? true, // Default to true
        transformerId: transformer.id,
      },
      label
    );
    this.type = 'flatmap';
    this.transformer = transformer;
  }
}

