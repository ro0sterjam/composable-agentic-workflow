import type { ExtractTransformerNodeConfig } from '../nodes/impl/extract';

import type { TransformerExecutor, DAGContext } from './registry';

/**
 * Get nested property value from an object using dot notation
 * @param obj - The object to get the property from
 * @param path - The property path (e.g., "user.id" or "id")
 * @returns The property value or undefined
 */
function getNestedProperty(obj: unknown, path: string): unknown {
  if (!path) return obj;

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Extract transformer executor - executes extract transformer nodes
 */
export class ExtractExecutor<InputType = unknown, OutputType = unknown>
  implements TransformerExecutor<InputType, OutputType, ExtractTransformerNodeConfig>
{
  execute(
    input: InputType,
    config: ExtractTransformerNodeConfig,
    _dagContext: DAGContext
  ): OutputType {
    const { property } = config;

    if (!property) {
      throw new Error('Extract transformer requires a property path');
    }

    // Extract the property from the input
    const extractedValue = getNestedProperty(input, property);

    // Return the extracted value (or undefined if not found)
    return extractedValue as OutputType;
  }
}

