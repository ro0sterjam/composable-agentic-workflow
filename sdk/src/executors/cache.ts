import type { CacheTransformerNodeConfig } from '../nodes/impl/cache';

import type { TransformerExecutor, DAGContext } from './registry';

/**
 * Set nested property value in an object using dot notation
 * @param obj - The object to set the property in
 * @param path - The property path (e.g., "user.id" or "id")
 * @param value - The value to set
 */
function setNestedProperty(obj: Record<string, unknown>, path: string, value: unknown): void {
  if (!path) {
    throw new Error('Property path cannot be empty');
  }

  const parts = path.split('.');
  let current: Record<string, unknown> = obj;

  // Navigate to the parent of the target property
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  // Set the final property
  const finalPart = parts[parts.length - 1];
  current[finalPart] = value;
}

/**
 * Cache transformer executor - executes cache transformer nodes
 */
export class CacheExecutor<InputType = unknown, OutputType = InputType>
  implements TransformerExecutor<InputType, OutputType, CacheTransformerNodeConfig>
{
  execute(
    input: InputType,
    config: CacheTransformerNodeConfig,
    dagContext: DAGContext
  ): OutputType {
    const { property } = config;

    if (!property) {
      throw new Error('Cache transformer requires a property path');
    }

    // Store the input in the cache at the specified property path
    setNestedProperty(dagContext.cache, property, input);

    // Pass through the input unchanged
    return input as unknown as OutputType;
  }
}
