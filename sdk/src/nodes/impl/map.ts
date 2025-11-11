import { TransformerNode } from '../types';

/**
 * Config type for MapTransformerNode
 */
export interface MapTransformerNodeConfig {
  parallel?: boolean; // If true, run maps in parallel; otherwise in sequence (defaults to true)
  transformerId: string; // ID of the transformer node to apply to each element (added by constructor)
}

/**
 * Map transformer node - applies a transformer to each element of an input array
 * @template InputType - The type of each input element
 * @template OutputType - The type of each output element
 */
export class MapTransformerNode<InputType, OutputType> extends TransformerNode<
  InputType[],
  OutputType[],
  MapTransformerNodeConfig
> {
  type: 'map';
  transformer: TransformerNode<InputType, OutputType, unknown>;

  /**
   * Creates a new MapTransformerNode
   * @param id - Unique identifier for the node
   * @param transformer - The transformer node to apply to each element. If a SequentialTransformerNode is provided, the transformerId will be extracted from the first node.
   * @param config - Optional configuration with parallel flag (defaults to true). transformerId is added automatically.
   * @param label - Optional label for the node
   */
  constructor(
    id: string,
    transformer: TransformerNode<InputType, OutputType, unknown>,
    config?: Omit<MapTransformerNodeConfig, 'transformerId'>,
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
      'map',
      {
        parallel: config?.parallel ?? true, // Default to true
        transformerId,
      },
      label
    );
    this.type = 'map';
    this.transformer = transformer;
  }
}
