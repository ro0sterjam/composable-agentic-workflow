import type { MapTransformerNodeConfig } from '../nodes/impl/map';

import type { TransformerExecutor, DAGContext } from './registry';

/**
 * Map transformer executor - executes map transformer nodes
 */
export class MapTransformerExecutor<InputType, OutputType>
  implements TransformerExecutor<InputType[], OutputType[], MapTransformerNodeConfig>
{
  async execute(
    input: InputType[],
    config: MapTransformerNodeConfig,
    dagContext: DAGContext
  ): Promise<OutputType[]> {
    const parallel = config.parallel ?? true; // Default to true
    const transformerId = config.transformerId;

    if (!transformerId) {
      throw new Error(
        `Transformer node ID not found in map node config. Make sure the map node was properly constructed.`
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

    // Execute the single transformer for each input item
    if (parallel) {
      // Run all transformations in parallel
      const promises = input.map((item) =>
        Promise.resolve(transformerExecutor.execute(item, transformerNode.config, dagContext))
      );
      const results = await Promise.all(promises);
      return results as OutputType[];
    } else {
      // Run transformations sequentially
      const results: OutputType[] = [];
      for (const item of input) {
        const result = await Promise.resolve(
          transformerExecutor.execute(item, transformerNode.config, dagContext)
        );
        results.push(result as OutputType);
      }
      return results;
    }
  }
}
