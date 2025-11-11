import type { TerminalExecutor, DAGContext } from './registry';

/**
 * Console terminal executor - logs the input using a provided logging function
 */
export class ConsoleTerminalExecutor<InputType> implements TerminalExecutor<InputType, undefined> {
  private logFn: (message: string, data: InputType) => void;

  constructor(logFn?: (message: string, data: InputType) => void) {
    this.logFn = logFn || ((message: string, data: InputType) => console.log(message, data));
  }

  execute(input: InputType, _config: undefined, _dagContext: DAGContext): void {
    this.logFn('ConsoleTerminal:', input);
  }
}
