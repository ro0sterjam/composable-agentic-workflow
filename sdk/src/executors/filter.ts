import type { FilterTransformerNodeConfig } from '../nodes/impl/filter';

import type { TransformerExecutor, DAGContext } from './registry';

/**
 * Filter transformer executor - executes filter transformer nodes
 */
export class FilterExecutor<InputType = unknown[], OutputType = InputType>
  implements TransformerExecutor<InputType, OutputType, FilterTransformerNodeConfig>
{
  execute(
    input: InputType,
    config: FilterTransformerNodeConfig,
    _dagContext: DAGContext
  ): OutputType {
    const { expression } = config;

    if (!expression || !expression.trim()) {
      throw new Error('Filter transformer requires an expression');
    }

    // Ensure input is an array
    if (!Array.isArray(input)) {
      throw new Error('Filter transformer requires an array input');
    }

    // Create a function that evaluates the expression with 'input' as a variable
    // Using Function constructor is safer than eval as it doesn't have access to local scope
    let filterFn: (input: unknown) => boolean;
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      filterFn = new Function('input', `return ${expression}`) as (input: unknown) => boolean;
    } catch (error) {
      throw new Error(`Invalid filter expression: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Filter the array, keeping only items where the expression evaluates to true
    const filtered = input.filter((item) => {
      try {
        const result = filterFn(item);
        // Coerce to boolean (handle truthy/falsy values)
        return Boolean(result);
      } catch (error) {
        // If evaluation fails for an item, skip it (or we could throw - for now, skip)
        console.warn(`Filter expression evaluation failed for item:`, error);
        return false;
      }
    });

    return filtered as OutputType;
  }
}

