import type { SourceExecutor, DAGContext } from './registry';

/**
 * Dataset source executor - returns the array of objects from config
 */
export class DatasetSourceExecutor implements SourceExecutor<unknown[], { value: unknown[] }> {
  execute(config: { value: unknown[] }, _dagContext: DAGContext): unknown[] {
    if (!config?.value) {
      return [];
    }

    // Ensure it's an array
    if (!Array.isArray(config.value)) {
      throw new Error('Dataset value must be an array');
    }

    // Ensure all elements are objects
    for (const item of config.value) {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new Error('Dataset must contain an array of objects');
      }
    }

    return config.value;
  }
}

