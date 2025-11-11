import { TransformerNode } from '../types';

/**
 * Config type for PeekTransformerNode
 */
export interface PeekTransformerNodeConfig {
  label?: string; // Optional label for the log message
}

/**
 * Peek transformer node - logs input and forwards it unchanged
 * Useful for debugging/inspection in a pipeline
 * @template InputType - The type of input data (and output data, since it's passthrough)
 */
export class PeekTransformerNode<InputType = unknown> extends TransformerNode<
  InputType,
  InputType,
  PeekTransformerNodeConfig
> {
  type: 'peek';

  /**
   * Creates a new PeekTransformerNode
   * @param id - Unique identifier for the node
   * @param config - Optional configuration with label for log message
   * @param label - Optional label for the node
   */
  constructor(id: string, config?: PeekTransformerNodeConfig, label?: string) {
    super(
      id,
      'peek',
      config || {},
      label
    );
    this.type = 'peek';
  }
}

