import type { FlatMapTransformerNodeConfig } from '../nodes/impl/flatmap';

import type { TransformerExecutor, DAGContext } from './registry';

/**
 * FlatMap transformer executor - executes flatmap transformer nodes
 */
export class FlatMapTransformerExecutor<InputType, OutputType>
  implements TransformerExecutor<InputType[], OutputType[], FlatMapTransformerNodeConfig>
{
  async execute(
    input: InputType[],
    config: FlatMapTransformerNodeConfig,
    dagContext: DAGContext
  ): Promise<OutputType[]> {
    const parallel = config.parallel ?? true; // Default to true
    const transformerId = config.transformerId;

    if (!transformerId) {
      throw new Error(
        `Transformer node ID not found in flatmap node config. Make sure the flatmap node was properly constructed.`
      );
    }

    const { dag, executorRegistry } = dagContext;

    // Find the transformer node in the DAG
    const transformerNode = dag.nodes.find((n) => n.id === transformerId);
    if (!transformerNode) {
      throw new Error(`Transformer node with id "${transformerId}" not found in DAG`);
    }

    // Get the executor for the transformer node type
    const transformerExecutor = executorRegistry.getTransformer(transformerNode.type);
    if (!transformerExecutor) {
      throw new Error(
        `No executor found for transformer node type: ${transformerNode.type}. Make sure an executor is registered for this node type.`
      );
    }

    // Execute the single transformer for each input item and flatten the results
    if (parallel) {
      // Run all transformations in parallel
      const promises = input.map((item) =>
        Promise.resolve(transformerExecutor.execute(item, transformerNode.config || {}, dagContext))
      );
      const results = await Promise.all(promises);
      // Validate that all results are arrays
      for (const result of results) {
        if (!Array.isArray(result)) {
          throw new Error(
            `FlatMap transformer must output an array, but got ${typeof result}. Transformer node type: ${transformerNode.type}`
          );
        }
      }
      // Flatten all arrays into a single array
      return results.flat() as OutputType[];
    } else {
      // Run transformations sequentially and flatten
      const results: OutputType[] = [];
      for (const item of input) {
        const result = await Promise.resolve(
          transformerExecutor.execute(item, transformerNode.config || {}, dagContext)
        );
        // Each result should be an array, flatten it
        if (Array.isArray(result)) {
          results.push(...(result as OutputType[]));
        } else {
          throw new Error(
            `FlatMap transformer must output an array, but got ${typeof result}. Transformer node type: ${transformerNode.type}`
          );
        }
      }
      return results;
    }
  }
}

