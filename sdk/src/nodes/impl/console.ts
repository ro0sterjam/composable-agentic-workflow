import { TerminalNode } from '../types';

/**
 * Console terminal node - logs input to console
 * @template InputType - The type of input data
 */
export class ConsoleTerminalNode<InputType> extends TerminalNode<InputType, unknown> {
  type: 'console';

  constructor(id: string, config?: unknown, label?: string) {
    super(id, 'console', config, label);
    this.type = 'console';
  }
}

