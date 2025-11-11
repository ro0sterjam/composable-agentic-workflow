import type { PeekTransformerNodeConfig } from '../nodes/impl/peek';

import type { TransformerExecutor, DAGContext } from './registry';

/**
 * Peek transformer executor - executes peek transformer nodes
 * Logs the input and forwards it unchanged
 */
export class PeekTransformerExecutor<InputType = unknown>
  implements TransformerExecutor<InputType, InputType, PeekTransformerNodeConfig>
{
  private logFn?: (message: string, data: unknown) => void;

  /**
   * Creates a new PeekTransformerExecutor
   * @param logFn - Optional logging function (defaults to console.log)
   */
  constructor(logFn?: (message: string, data: unknown) => void) {
    this.logFn = logFn;
  }

  async execute(
    input: InputType,
    config: PeekTransformerNodeConfig,
    _dagContext: DAGContext
  ): Promise<InputType> {
    const logMessage = config.label ? `[${config.label}]` : '[Peek]';
    const message = `${logMessage} ${JSON.stringify(input, null, 2)}`;

    if (this.logFn) {
      this.logFn(message, input);
    } else {
      console.log(message);
    }

    // Forward the input unchanged
    return input;
  }
}
