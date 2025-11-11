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
   * @param transformer - The transformer node to apply to each element (must output an array). If a SequentialTransformerNode is provided, the transformerId will be extracted from the first node.
   * @param config - Optional configuration with parallel flag (defaults to true). transformerId is added automatically.
   * @param label - Optional label for the node
   */
  constructor(
    id: string,
    transformer: TransformerNode<InputType, OutputType[], unknown>,
    config?: Omit<FlatMapTransformerNodeConfig, 'transformerId'>,
    label?: string
  ) {
    // If it's a SequentialTransformerNode, extract the transformerId from the first node
    // Otherwise, use the transformer's ID directly
    let transformerId: string;
    if (transformer.type === 'sequential') {
      const seqNode = transformer as any;
      if (seqNode.first) {
        transformerId = seqNode.first.id;
      } else {
        throw new Error(
          'SequentialTransformerNode must have a first node to extract transformerId from.'
        );
      }
    } else {
      transformerId = transformer.id;
    }

    super(
      id,
      'flatmap',
      {
        parallel: config?.parallel ?? true, // Default to true
        transformerId,
      },
      label
    );
    this.type = 'flatmap';
    this.transformer = transformer;
  }
}

