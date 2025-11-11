import { getLogger } from '../logger';
import type { DAGContext } from './registry';

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
 * Convert a value to a string representation for interpolation
 */
function valueToString(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Interpolate a string template with input and DAG context cache values
 * Supports:
 * - ${input} - the input value
 * - ${dagContext.cache.???} - cached values (supports dot notation)
 *
 * @param template - The template string to interpolate
 * @param input - The input value to interpolate
 * @param dagContext - The DAG context containing the cache
 * @returns The interpolated string
 */
export function interpolateString(
  template: string,
  input: unknown,
  dagContext: DAGContext
): string {
  let result = template;

  // Replace ${input} with the input value
  result = result.replace(/\$\{input\}/g, () => valueToString(input));

  // Replace ${dagContext.cache.???} with cached values
  // Match ${dagContext.cache.property} or ${dagContext.cache.nested.property}
  result = result.replace(/\$\{dagContext\.cache\.([^}]+)\}/g, (match, cachePath) => {
    const trimmedPath = cachePath.trim();
    const cachedValue = getNestedProperty(dagContext.cache, trimmedPath);
    if (cachedValue === undefined) {
      // Log warning if cache value not found (for debugging)
      const logger = getLogger();
      logger.debug(`[interpolation] Cache value not found for path: ${trimmedPath}, cache keys:`, Object.keys(dagContext.cache));
      // Return the original placeholder if the value is not found
      return match;
    }
    const logger = getLogger();
    logger.debug(`[interpolation] Replacing ${match} with cached value from path: ${trimmedPath}`);
    return valueToString(cachedValue);
  });

  return result;
}
