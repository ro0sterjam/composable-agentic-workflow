import { ConsoleTerminalNode, LiteralSourceNode } from '../../sdk/src/nodes';

/**
 * Playground for testing the DAG SDK
 */

async function main() {
  new LiteralSourceNode('start', 'Hello, world!')
    .terminate(new ConsoleTerminalNode('end'))
    .execute();
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
