import { TransformerNode } from '../types';

/**
 * Recursively extract the first non-sequential transformer node ID from a transformer node.
 * If the transformer is a SequentialTransformerNode, recursively traverse to find the actual first transformer.
 * @param transformer - The transformer node (may be a SequentialTransformerNode)
 * @returns The ID of the first non-sequential transformer node in the chain
 */
function getFirstTransformerId(transformer: TransformerNode<any, any, any>): string {
  if (transformer.type === 'sequential') {
    const seqNode = transformer as any;
    if (seqNode.first) {
      // Recursively get the first transformer ID from the first node
      return getFirstTransformerId(seqNode.first);
    } else {
      throw new Error(
        'SequentialTransformerNode must have a first node to extract transformerId from.'
      );
    }
  } else {
    // This is a regular transformer node, return its ID
    return transformer.id;
  }
}

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
   * @param transformer - The transformer node to apply to each element. If a SequentialTransformerNode (or nested SequentialTransformerNodes) is provided, the transformerId will be recursively extracted from the first non-sequential transformer node.
   * @param config - Optional configuration with parallel flag (defaults to true). transformerId is added automatically.
   * @param label - Optional label for the node
   */
  constructor(
    id: string,
    transformer: TransformerNode<InputType, OutputType, unknown>,
    config?: Omit<MapTransformerNodeConfig, 'transformerId'>,
    label?: string
  ) {
    // Recursively extract the first non-sequential transformer ID
    const transformerId = getFirstTransformerId(transformer);

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
