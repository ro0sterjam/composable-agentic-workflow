import { executeDAGFromNode } from '../dag/executor';
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

    const { dag, executorRegistry, cache } = dagContext;

    // Find the transformer node in the DAG
    const transformerNode = dag.nodes.find((n) => n.id === transformerId);
    if (!transformerNode) {
      throw new Error(`Transformer node with id "${transformerId}" not found in DAG`);
    }

    // Helper function to execute the transformer subgraph for a single item
    const executeTransformerSubgraph = async (item: InputType): Promise<OutputType> => {
      const result = await executeDAGFromNode(dag, transformerId, {
        executorRegistry,
        input: item,
        cache,
      });

      if (!result.success) {
        // Find the first error
        for (const [nodeId, nodeResult] of result.results.entries()) {
          if (nodeResult.error) {
            throw new Error(
              `Error executing transformer subgraph for map: ${nodeResult.error.message} (node: ${nodeId})`
            );
          }
        }
        throw new Error('Error executing transformer subgraph for map: unknown error');
      }

      // Extract output from the transformer subgraph
      // Find nodes with no outgoing edges in the executed subgraph (terminal nodes in the subgraph)
      const executedNodeIds = new Set(result.results.keys());
      const terminalNodes = Array.from(executedNodeIds).filter((nodeId) => {
        // Check if this node has any outgoing edges to other executed nodes
        return !dag.edges.some((edge) => edge.from === nodeId && executedNodeIds.has(edge.to));
      });

      // Filter to only terminal nodes that have defined output (skip terminal executors like Console)
      const terminalNodesWithOutput = terminalNodes.filter((nodeId) => {
        const nodeResult = result.results.get(nodeId);
        return nodeResult?.output !== undefined;
      });

      // Prefer the transformer node's output if it exists and is defined
      const transformerResult = result.results.get(transformerId);
      if (transformerResult?.output !== undefined) {
        // If transformer node is a terminal node with output, use it
        if (terminalNodesWithOutput.includes(transformerId)) {
          return transformerResult.output as OutputType;
        }
        // If transformer node has downstream nodes, prefer the downstream terminal node's output
        // But if no terminal nodes have output, fall back to transformer node's output
        if (terminalNodesWithOutput.length > 0) {
          const terminalResult = result.results.get(terminalNodesWithOutput[0]);
          if (terminalResult?.output !== undefined) {
            return terminalResult.output as OutputType;
          }
        }
        // No terminal nodes with output, use transformer node's output
        return transformerResult.output as OutputType;
      }

      // Transformer node has no output, try to use terminal node's output
      if (terminalNodesWithOutput.length > 0) {
        const terminalResult = result.results.get(terminalNodesWithOutput[0]);
        if (terminalResult?.output !== undefined) {
          return terminalResult.output as OutputType;
        }
      }

      throw new Error(
        `No output found from transformer subgraph execution. Transformer node: ${transformerId}`
      );
    };

    // Execute the transformer subgraph for each input item
    if (parallel) {
      // Run all transformations in parallel
      const promises = input.map((item) => executeTransformerSubgraph(item));
      const results = await Promise.all(promises);
      return results;
    } else {
      // Run transformations sequentially
      const results: OutputType[] = [];
      for (const item of input) {
        const result = await executeTransformerSubgraph(item);
        results.push(result);
      }
      return results;
    }
  }
}
