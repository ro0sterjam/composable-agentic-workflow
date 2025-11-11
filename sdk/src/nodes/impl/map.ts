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
   * @param transformer - The transformer node to apply to each element (cannot be a SequentialTransformerNode)
   * @param config - Optional configuration with parallel flag (defaults to true). transformerId is added automatically.
   * @param label - Optional label for the node
   */
  constructor(
    id: string,
    transformer: TransformerNode<InputType, OutputType, unknown>,
    config?: Omit<MapTransformerNodeConfig, 'transformerId'>,
    label?: string
  ) {
    // Reject SequentialTransformerNode - map can only execute a single transformer
    if (transformer.type === 'sequential') {
      throw new Error(
        'MapTransformerNode cannot accept a SequentialTransformerNode. Use a single transformer node instead.'
      );
    }

    super(
      id,
      'map',
      {
        parallel: config?.parallel ?? true, // Default to true
        transformerId: transformer.id,
      },
      label
    );
    this.type = 'map';
    this.transformer = transformer;
  }
}
