import { FluentDAGBuilder, DAGExecutor, createConfigFromEnv } from '../../sdk/src/index';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Playground for testing the DAG SDK
 */

async function main() {
  console.log('=== DAG SDK Playground ===\n');

  // Simple test: Literal "Hello" -> LLM -> Console
  console.log('Test: Literal "Hello" -> LLM -> Console\n');
  
  // Create literal node with "Hello" -> LLM -> Console
  const builder = new FluentDAGBuilder('hello-llm-console');
  
  builder
    .literal('hello', 'Best food in SF?')
    .label('Hello Literal')
    .to('llm', 'input');
  
  builder
    .llm('llm', async (input) => {
      // The DAGExecutor will call executeLLMNode directly, so this is just a placeholder
      return input;
    })
    .model('openai/gpt-4o') // Using gpt-4o for faster responses
    .label('LLM Node')
    .to('console', 'input');
  
  builder
    .consoleSink('console')
    .label('Console Output');
  
  // Set entry and exit nodes
  builder.entry('hello');
  builder.exit('console');
  
  const dag = builder.build();

  console.log('DAG created:');
  console.log('  Nodes:', dag.nodes.size);
  console.log('  Connections:', dag.connections.length);
  console.log('  Entry node:', dag.entryNodeId);
  console.log('  Exit nodes:', dag.exitNodeIds);
  console.log();

  // Validate DAG
  const validation = builder.getBuilder().validate();
  console.log('Validation:');
  console.log('  Valid:', validation.valid);
  if (validation.errors.length > 0) {
    console.log('  Errors:', validation.errors);
    process.exit(1);
    return;
  }
  console.log();

  // Execute DAG
  console.log('Executing DAG...\n');
  const config = createConfigFromEnv();
  const executor = new DAGExecutor(dag, config);

  try {
    await executor.execute((nodeId, state) => {
      const node = dag.nodes.get(nodeId);
      const nodeLabel = node?.label || nodeId;
      console.log(`[${state.toUpperCase()}] ${nodeLabel} (${nodeId})`);
      
      if (state === 'completed') {
        const context = executor.getContext();
        const output = context.nodeOutputs.get(nodeId);
        if (output) {
          console.log(`  Output:`, output);
        }
      } else if (state === 'failed') {
        const context = executor.getContext();
        const error = context.errors.get(nodeId);
        if (error) {
          console.error(`  Error:`, error);
        }
      }
    });

    console.log('\n✓ DAG execution completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ DAG execution failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

