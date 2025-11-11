import type { NodeType } from '../../types';

/**
 * Standalone node - takes no input and produces no output (pure side effect)
 * This is an abstract class that standalone nodes should extend
 * @template ConfigType - The type of configuration for this node
 */
export abstract class StandAloneNode<ConfigType = unknown> {
  id: string;
  type: NodeType;
  label?: string;
  config?: ConfigType;

  constructor(id: string, type: NodeType, config?: ConfigType, label?: string) {
    this.id = id;
    this.type = type;
    this.config = config;
    this.label = label || id;
  }
}

