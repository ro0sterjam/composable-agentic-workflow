import type { DedupeTransformerNodeConfig, DedupeMethod } from '../nodes/impl/dedupe';

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
 * Get a string representation of a value for comparison
 */
function getValueKey(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
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
 * Dedupe transformer executor - executes dedupe transformer nodes
 */
export class DedupeExecutor<InputType = unknown[], OutputType = InputType>
  implements TransformerExecutor<InputType, OutputType, DedupeTransformerNodeConfig>
{
  execute(
    input: InputType,
    config: DedupeTransformerNodeConfig,
    _dagContext: DAGContext
  ): OutputType {
    // Ensure input is an array
    if (!Array.isArray(input)) {
      throw new Error('Dedupe transformer requires an array input');
    }

    const method: DedupeMethod = config.method || 'first';
    const byProperty = config.byProperty;

    // If no property is specified, dedupe by the value itself
    if (!byProperty) {
      return this.dedupeByValue(input as unknown[], method) as OutputType;
    }

    // Dedupe by property
    return this.dedupeByProperty(input as unknown[], byProperty, method) as OutputType;
  }

  /**
   * Dedupe array by value (no property specified)
   */
  private dedupeByValue(arr: unknown[], method: DedupeMethod): unknown[] {
    if (method === 'first') {
      const seen = new Set<string>();
      const result: unknown[] = [];
      for (const item of arr) {
        const key = getValueKey(item);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      }
      return result;
    }

    if (method === 'last') {
      const lastIndex = new Map<string, number>();
      arr.forEach((item, index) => {
        const key = getValueKey(item);
        lastIndex.set(key, index);
      });

      const result: unknown[] = [];
      const added = new Set<string>();
      for (let i = arr.length - 1; i >= 0; i--) {
        const key = getValueKey(arr[i]);
        if (!added.has(key) && lastIndex.get(key) === i) {
          added.add(key);
          result.unshift(arr[i]);
        }
      }
      return result;
    }

    // method === 'most frequent'
    // Count frequency of each item
    const itemFrequency = new Map<string, { count: number; item: unknown; firstIndex: number }>();
    arr.forEach((item, index) => {
      const key = getValueKey(item);
      const existing = itemFrequency.get(key);
      if (existing) {
        existing.count++;
      } else {
        itemFrequency.set(key, { count: 1, item, firstIndex: index });
      }
    });

    // Keep only the most frequent items (if there's a tie, keep all)
    const maxCount = Math.max(...Array.from(itemFrequency.values()).map((v) => v.count));
    const mostFrequentKeys = new Set(
      Array.from(itemFrequency.entries())
        .filter(([, data]) => data.count === maxCount)
        .map(([key]) => key)
    );

    // Return items in original order, keeping first occurrence of each most frequent value
    const result: unknown[] = [];
    const seen = new Set<string>();
    for (const item of arr) {
      const key = getValueKey(item);
      if (mostFrequentKeys.has(key) && !seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }

    return result;
  }

  /**
   * Dedupe array by property value
   */
  private dedupeByProperty(arr: unknown[], property: string, method: DedupeMethod): unknown[] {
    if (method === 'first') {
      const seen = new Set<string>();
      const result: unknown[] = [];
      for (const item of arr) {
        const propValue = getNestedProperty(item, property);
        const key = getValueKey(propValue);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      }
      return result;
    }

    if (method === 'last') {
      const lastIndex = new Map<string, number>();
      arr.forEach((item, index) => {
        const propValue = getNestedProperty(item, property);
        const key = getValueKey(propValue);
        lastIndex.set(key, index);
      });

      const result: unknown[] = [];
      const added = new Set<string>();
      for (let i = arr.length - 1; i >= 0; i--) {
        const item = arr[i];
        const propValue = getNestedProperty(item, property);
        const key = getValueKey(propValue);
        if (!added.has(key) && lastIndex.get(key) === i) {
          added.add(key);
          result.unshift(item);
        }
      }
      return result;
    }

    // method === 'most frequent'
    // First, count frequency of each item in the array
    const itemFrequency = new Map<string, { count: number; item: unknown; firstIndex: number }>();
    arr.forEach((item, index) => {
      const itemKey = getValueKey(item);
      const existing = itemFrequency.get(itemKey);
      if (existing) {
        existing.count++;
      } else {
        itemFrequency.set(itemKey, { count: 1, item, firstIndex: index });
      }
    });

    // Group items by property value and find the most frequent item in each group
    const groups = new Map<string, { item: unknown; frequency: number; firstIndex: number }>();
    arr.forEach((item, index) => {
      const propValue = getNestedProperty(item, property);
      const propKey = getValueKey(propValue);
      const itemKey = getValueKey(item);
      const freqData = itemFrequency.get(itemKey);

      if (!freqData) return;

      const existing = groups.get(propKey);
      if (
        !existing ||
        freqData.count > existing.frequency ||
        (freqData.count === existing.frequency && freqData.firstIndex < existing.firstIndex)
      ) {
        groups.set(propKey, {
          item,
          frequency: freqData.count,
          firstIndex: freqData.firstIndex,
        });
      }
    });

    // Return items in original order
    const resultItems = new Set(Array.from(groups.values()).map((g) => getValueKey(g.item)));
    const seenProperties = new Set<string>();
    const result: unknown[] = [];

    for (const item of arr) {
      const propValue = getNestedProperty(item, property);
      const propKey = getValueKey(propValue);
      const itemKey = getValueKey(item);

      if (resultItems.has(itemKey) && !seenProperties.has(propKey)) {
        seenProperties.add(propKey);
        result.push(item);
      }
    }

    return result;
  }
}
