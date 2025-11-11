import type { TerminalExecutor } from './registry';

/**
 * Console terminal executor - logs the input to console
 */
export class ConsoleTerminalExecutor<InputType> implements TerminalExecutor<InputType, undefined> {
  execute(input: InputType, _config: undefined): void {
    console.log('ConsoleTerminal:', input);
  }
}
