import dotenv from 'dotenv';

import { ConsoleTerminalExecutor } from '../../sdk/src/executors/console';
import { LiteralSourceExecutor } from '../../sdk/src/executors/literal';
import { SimpleLLMExecutor } from '../../sdk/src/executors/llm';
import {
  LiteralSourceNode,
  ConsoleTerminalNode,
  SimpleLLMTransformerNode,
  serializeStandAloneNode,
  executeDAG,
  defaultExecutorRegistry,
} from '../../sdk/src/index';

// Load environment variables
dotenv.config();

/**
 * Playground for testing the DAG SDK
 */

async function main() {
  console.log('Playground starting...\n');

  // Register executors
  defaultExecutorRegistry.registerSource('literal', new LiteralSourceExecutor());
  defaultExecutorRegistry.registerTerminal('console', new ConsoleTerminalExecutor());
  defaultExecutorRegistry.registerTransformer('simple_llm', new SimpleLLMExecutor());

  // Create a simple DAG: literal source -> LLM transformer -> console terminal
  const standalone = new LiteralSourceNode('start', { value: 'Hi there' })
    .pipe(new SimpleLLMTransformerNode('llm', { model: 'openai/gpt-5' }))
    .terminate(new ConsoleTerminalNode('end'));

  console.log('DAG created:', standalone.id);

  // Serialize the DAG
  console.log('\n--- Serializing DAG ---');
  const serializedDAG = serializeStandAloneNode(standalone);
  console.log('Serialized DAG:', JSON.stringify(serializedDAG, null, 2));

  // Execute the serialized DAG
  console.log('\n--- Executing Serialized DAG ---');
  const result = await executeDAG(serializedDAG, {
    onNodeComplete: (nodeId, nodeResult) => {
      if (nodeResult.error) {
        console.error(`Node ${nodeId} failed:`, nodeResult.error.message);
      } else {
        console.log(`Node ${nodeId} completed with output:`, nodeResult.output);
      }
    },
  });

  console.log('\n--- Execution Result ---');
  console.log('Success:', result.success);
  console.log(
    'Results:',
    Array.from(result.results.entries()).map(([id, r]) => ({
      nodeId: id,
      output: r.output,
      error: r.error?.message,
    }))
  );
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
