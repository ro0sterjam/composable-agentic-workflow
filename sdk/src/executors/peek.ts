import type { PeekTransformerNodeConfig } from '../nodes/impl/peek';

import type { TransformerExecutor, DAGContext } from './registry';
import { getLoggerFromContext } from './registry';

/**
 * Peek transformer executor - executes peek transformer nodes
 * Logs the input and forwards it unchanged
 */
export class PeekTransformerExecutor<InputType = unknown>
  implements TransformerExecutor<InputType, InputType, PeekTransformerNodeConfig>
{
  async execute(
    input: InputType,
    config: PeekTransformerNodeConfig | undefined,
    dagContext: DAGContext
  ): Promise<InputType> {
    const logger = getLoggerFromContext(dagContext);
    const logMessage = config?.label ? `[${config.label}]` : '[Peek]';
    const message = `${logMessage} ${JSON.stringify(input, null, 2)}`;
    logger.info(message);

    // Forward the input unchanged
    return input;
  }
}
