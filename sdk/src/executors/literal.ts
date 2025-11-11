import type { SourceExecutor, DAGContext } from './registry';

/**
 * Literal source executor - returns the value from the config
 */
export class LiteralSourceExecutor implements SourceExecutor<string, { value: string }> {
  execute(config: { value: string }, _dagContext: DAGContext): string {
    return config?.value;
  }
}
