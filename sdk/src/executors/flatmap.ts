import { executeDAGFromNode } from '../dag/executor';
import { getLogger } from '../logger';
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

    const { dag, executorRegistry, cache } = dagContext;

    // Find the transformer node in the DAG
    const transformerNode = dag.nodes.find((n) => n.id === transformerId);
    if (!transformerNode) {
      throw new Error(`Transformer node with id "${transformerId}" not found in DAG`);
    }

    // Helper function to execute the transformer subgraph for a single item
    const executeTransformerSubgraph = async (item: InputType): Promise<OutputType[]> => {
      const logger = getLogger();
      logger.debug(`[FlatMapTransformerExecutor] Executing transformer subgraph for item: ${item}`);
      const result = await executeDAGFromNode(dag, transformerId, {
        executorRegistry,
        input: item,
        cache,
      });
      logger.debug(`[FlatMapTransformerExecutor] Transformer subgraph executed for item: ${item}`);

      if (!result.success) {
        // Find the first error
        for (const [nodeId, nodeResult] of result.results.entries()) {
          if (nodeResult.error) {
            throw new Error(
              `Error executing transformer subgraph for flatmap: ${nodeResult.error.message} (node: ${nodeId})`
            );
          }
        }
        throw new Error('Error executing transformer subgraph for flatmap: unknown error');
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
      let output: unknown;
      const transformerResult = result.results.get(transformerId);
      if (transformerResult?.output !== undefined) {
        // If transformer node is a terminal node with output, use it
        if (terminalNodesWithOutput.includes(transformerId)) {
          output = transformerResult.output;
        } else if (terminalNodesWithOutput.length > 0) {
          // If transformer node has downstream nodes, prefer the downstream terminal node's output
          const terminalResult = result.results.get(terminalNodesWithOutput[0]);
          if (terminalResult?.output !== undefined) {
            output = terminalResult.output;
          }
        } else {
          // No terminal nodes with output, use transformer node's output
          output = transformerResult.output;
        }
      } else if (terminalNodesWithOutput.length > 0) {
        // Transformer node has no output, use terminal node's output
        const terminalResult = result.results.get(terminalNodesWithOutput[0]);
        if (terminalResult?.output !== undefined) {
          output = terminalResult.output;
        }
      }

      if (output === undefined) {
        throw new Error(
          `No output found from transformer subgraph execution. Transformer node: ${transformerId}`
        );
      }

      // Validate that the output is an array (required for flatmap)
      if (!Array.isArray(output)) {
        throw new Error(
          `FlatMap transformer must output an array, but got ${typeof output}. Transformer node: ${transformerId}`
        );
      }

      return output as OutputType[];
    };

    // Execute the transformer subgraph for each input item and flatten the results
    if (parallel) {
      // Run all transformations in parallel
      const promises = input.map((item) => executeTransformerSubgraph(item));
      const results = await Promise.all(promises);
      // Flatten all arrays into a single array
      return results.flat();
    } else {
      // Run transformations sequentially and flatten
      const results: OutputType[] = [];
      for (const item of input) {
        const result = await executeTransformerSubgraph(item);
        results.push(...result);
      }
      return results;
    }
  }
}
