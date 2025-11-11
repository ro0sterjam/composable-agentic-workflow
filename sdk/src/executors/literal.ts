import type { SourceExecutor } from './registry';

/**
 * Literal source executor - returns the value from the config
 */
export class LiteralSourceExecutor implements SourceExecutor<string, { value: string }> {
  execute(config: { value: string }): string {
    return config?.value;
  }
}
