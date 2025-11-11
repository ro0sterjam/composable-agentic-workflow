import type { NodeType } from '../../types';

/**
 * Terminal node - takes input but no output
 * This is an abstract class that terminal nodes should extend
 * Implementation: ConsoleTerminalNode (type: 'console')
 * @template InputType - The type of input data
 */
export abstract class TerminalNode<InputType> {
  id: string;
  type: NodeType;
  label?: string;

  constructor(id: string, type: NodeType, label?: string) {
    this.id = id;
    this.type = type;
    this.label = label || id;
  }

  /**
   * Execute the terminal node with input
   * @param input - The input data for this node
   * @returns void (terminal nodes don't produce output)
   */
  abstract execute(input: InputType): Promise<void> | void;
}
