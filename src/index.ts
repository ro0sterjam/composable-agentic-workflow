import { DAGBuilder } from './dag/dag';
import {
  createExecutionNode,
  createConditionalNode,
  createAggregatorNode,
} from './nodes/node-factory';

async function main() {
  // Example: Create a simple DAG with execution nodes
  const builder = new DAGBuilder('example-dag');

  // Create some execution nodes
  const node1 = createExecutionNode('node1', async (input) => {
    console.log('Node 1 executing with input:', input);
    return { processed: input, step: 1 };
  }, { label: 'Process Input' });

  const node2 = createExecutionNode('node2', async (input) => {
    console.log('Node 2 executing with input:', input);
    const inputObj = input as Record<string, unknown>;
    return { ...inputObj, step: 2 };
  }, { label: 'Transform Data' });

  const conditional = createConditionalNode(
    'conditional1',
    async (input: unknown) => {
      const inputObj = input as { step?: number };
      return inputObj?.step === 2;
    },
    { label: 'Check Condition' }
  );

  const aggregator = createAggregatorNode(
    'aggregator1',
    async (inputs) => {
      console.log('Aggregating inputs:', inputs);
      return { aggregated: inputs, count: inputs.length };
    },
    {
      label: 'Aggregate Results',
      inputPorts: [
        { id: 'input1', label: 'Input 1' },
        { id: 'input2', label: 'Input 2' },
      ],
    }
  );

  // Add nodes to DAG
  builder
    .addNode(node1)
    .addNode(node2)
    .addNode(conditional)
    .addNode(aggregator)
    .setEntryNode('node1')
    .connect('node1', 'output', 'node2', 'input')
    .connect('node2', 'output', 'conditional1', 'input')
    .addExitNode('conditional1');

  // Validate
  const validation = builder.validate();
  console.log('DAG Validation:', validation);

  // Get the DAG
  const dag = builder.build();
  console.log('DAG created with', dag.nodes.size, 'nodes and', dag.connections.length, 'connections');

  // Example: Get node connections
  const node2Connections = builder.getNodeConnections('node2');
  console.log('Node 2 connections:', node2Connections);
}

main().then(() => {
  // Exit cleanly when not in watch mode
  if (!process.env.TSX_WATCH) {
    process.exit(0);
  }
});
