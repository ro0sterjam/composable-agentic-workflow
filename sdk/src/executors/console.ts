import type { TerminalExecutor, DAGContext } from './registry';
import { getLoggerFromContext } from './registry';

/**
 * Console terminal executor - logs the input using the logger from context
 */
export class ConsoleTerminalExecutor<InputType> implements TerminalExecutor<InputType, undefined> {
  execute(input: InputType, _config: undefined, dagContext: DAGContext): void {
    const logger = getLoggerFromContext(dagContext);
    const message = typeof input === 'string' ? input : JSON.stringify(input, null, 2);
    logger.info(`[Console] ${message}`);
  }
}
