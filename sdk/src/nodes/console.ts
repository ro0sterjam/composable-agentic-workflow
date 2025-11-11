import { TerminalNode } from './types';

/**
 * Console terminal node - implementation of Terminal (takes input, logs to console, no output)
 * @template InputType - The type of input data
 */
export class ConsoleTerminalNode<InputType> extends TerminalNode<InputType> {
  type: 'console';

  constructor(id: string, label?: string) {
    super(id, 'console', label);
    this.type = 'console';
  }

  execute(input: InputType): void {
    console.log('ConsoleTerminal:', input);
  }
}

