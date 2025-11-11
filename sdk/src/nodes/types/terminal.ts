import type { NodeType } from '../../types';

/**
 * Terminal node - takes input but no output
 * This is an abstract class that terminal nodes should extend
 * Implementation: ConsoleTerminalNode (type: 'console')
 * @template InputType - The type of input data
 * @template ConfigType - The type of configuration for this node
 */
export abstract class TerminalNode<InputType, ConfigType = unknown> {
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
