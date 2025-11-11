import {
  LiteralSourceNode,
  ConsoleTerminalNode,
  serializeStandAloneNode,
  executeDAG,
} from '../../sdk/src/index';

/**
 * Playground for testing the DAG SDK
 */

async function main() {
  console.log('Playground starting...\n');

  // Create a simple DAG: literal source -> console terminal
  const source = new LiteralSourceNode('start', { value: 'Hello, world!' });
  const terminal = new ConsoleTerminalNode('end');
  const standalone = source.terminate(terminal);

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
