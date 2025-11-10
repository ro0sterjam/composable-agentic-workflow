import { DAG, DAGData, Node, NodeType } from './types';
import { DAGBuilder } from './dag-builder';

/**
 * Serialize a DAG to JSON (without functions)
 */
export function serializeDAG(dag: DAG): DAGData {
  const nodes: Record<string, any> = {};
  
  for (const [id, node] of dag.nodes.entries()) {
    const serializable: any = {
      id: node.id,
      type: node.type,
      label: node.label,
      metadata: node.metadata || {},
    };

    switch (node.type) {
      case NodeType.CONDITIONAL:
        serializable.inputPorts = node.inputPorts;
        serializable.trueOutputPort = node.trueOutputPort;
        serializable.falseOutputPort = node.falseOutputPort;
        serializable.conditionRef = node.metadata?.conditionRef;
        break;
      case NodeType.LOOP:
        serializable.inputPorts = node.inputPorts;
        serializable.outputPorts = node.outputPorts;
        serializable.maxIterations = node.maxIterations;
        serializable.subDag = serializeDAG(node.subDag);
        serializable.loopConditionRef = node.metadata?.loopConditionRef;
        break;
      case NodeType.FAN_OUT:
        serializable.inputPorts = node.inputPorts;
        serializable.outputBranches = node.outputBranches.map(branch => ({
          port: branch.port,
          subDag: branch.subDag ? serializeDAG(branch.subDag) : undefined,
        }));
        break;
      case NodeType.AGGREGATOR:
        serializable.inputPorts = node.inputPorts;
        serializable.outputPorts = node.outputPorts;
        serializable.aggregateRef = node.metadata?.aggregateRef;
        break;
      case NodeType.LITERAL:
        serializable.outputPorts = node.outputPorts;
        serializable.value = node.value;
        break;
      case NodeType.LLM:
        serializable.inputPorts = node.inputPorts;
        serializable.outputPorts = node.outputPorts;
        serializable.model = node.model;
        serializable.structuredOutput = node.structuredOutput;
        serializable.executeRef = node.metadata?.executeRef;
        break;
      case NodeType.CONSOLE:
        serializable.inputPorts = node.inputPorts;
        serializable.executeRef = node.metadata?.executeRef;
        break;
    }

    nodes[id] = serializable;
  }

  return {
    id: dag.id,
    nodes,
    connections: dag.connections,
    entryNodeId: dag.entryNodeId,
    exitNodeIds: dag.exitNodeIds,
  };
}

/**
 * Deserialize JSON to DAG structure
 * Note: Functions need to be provided separately via a registry
 */
export function deserializeDAG(data: DAGData, functionRegistry?: Map<string, Function>): DAG {
  const builder = new DAGBuilder(data.id);
  
  // Reconstruct nodes from serialized data
  for (const [id, nodeData] of Object.entries(data.nodes)) {
    const serialized = nodeData as any;
    
    switch (serialized.type) {
      case NodeType.LITERAL: {
        const node: any = {
          id: serialized.id,
          type: NodeType.LITERAL,
          label: serialized.label || serialized.id,
          outputPorts: serialized.outputPorts || [{ id: 'output', label: 'Output' }],
          value: serialized.value,
          metadata: serialized.metadata || {},
        };
        builder.addNode(node);
        break;
      }
      
      case NodeType.LLM: {
        const node: any = {
          id: serialized.id,
          type: NodeType.LLM,
          label: serialized.label || serialized.id,
          inputPorts: serialized.inputPorts || [{ id: 'input', label: 'Input' }],
          outputPorts: serialized.outputPorts || [{ id: 'output', label: 'Output' }],
          model: serialized.model || 'openai/gpt-4o',
          structuredOutput: serialized.structuredOutput,
          // Execute function will be handled by the executor
          execute: async () => { throw new Error('LLM execution handled by executor'); },
          metadata: serialized.metadata || {},
        };
        builder.addNode(node);
        break;
      }
      
      case NodeType.CONSOLE: {
        const node: any = {
          id: serialized.id,
          type: NodeType.CONSOLE,
          label: serialized.label || serialized.id,
          inputPorts: serialized.inputPorts || [{ id: 'input', label: 'Input' }],
          // Execute function will be handled by the executor
          execute: (input: unknown) => {
            console.log('ConsoleSink:', input);
          },
          metadata: serialized.metadata || {},
        };
        builder.addNode(node);
        break;
      }
      
      case NodeType.CONDITIONAL: {
        const node: any = {
          id: serialized.id,
          type: NodeType.CONDITIONAL,
          label: serialized.label || serialized.id,
          inputPorts: serialized.inputPorts || [{ id: 'input', label: 'Input' }],
          trueOutputPort: serialized.trueOutputPort || { id: 'true', label: 'True' },
          falseOutputPort: serialized.falseOutputPort || { id: 'false', label: 'False' },
          // Condition function - use a default that always returns true
          condition: async () => true,
          metadata: serialized.metadata || {},
        };
        builder.addNode(node);
        break;
      }
      
      case NodeType.AGGREGATOR: {
        const node: any = {
          id: serialized.id,
          type: NodeType.AGGREGATOR,
          label: serialized.label || serialized.id,
          inputPorts: serialized.inputPorts || [],
          outputPorts: serialized.outputPorts || [{ id: 'output', label: 'Output' }],
          // Aggregate function - default to returning the first input
          aggregate: async (inputs: unknown[]) => inputs[0],
          metadata: serialized.metadata || {},
        };
        builder.addNode(node);
        break;
      }
      
      case NodeType.LOOP: {
        const subDag = serialized.subDag ? deserializeDAG(serialized.subDag, functionRegistry) : undefined;
        const node: any = {
          id: serialized.id,
          type: NodeType.LOOP,
          label: serialized.label || serialized.id,
          inputPorts: serialized.inputPorts || [{ id: 'input', label: 'Input' }],
          outputPorts: serialized.outputPorts || [{ id: 'output', label: 'Output' }],
          maxIterations: serialized.maxIterations || 10,
          subDag: subDag || {
            id: `${serialized.id}-sub`,
            nodes: new Map(),
            connections: [],
          },
          // Loop condition function - default to always false (no loop)
          loopCondition: async () => false,
          metadata: serialized.metadata || {},
        };
        builder.addNode(node);
        break;
      }
      
      case NodeType.FAN_OUT: {
        const outputBranches = (serialized.outputBranches || []).map((branch: any) => ({
          port: branch.port,
          subDag: branch.subDag ? deserializeDAG(branch.subDag, functionRegistry) : undefined,
        }));
        const node: any = {
          id: serialized.id,
          type: NodeType.FAN_OUT,
          label: serialized.label || serialized.id,
          inputPorts: serialized.inputPorts || [{ id: 'input', label: 'Input' }],
          outputBranches,
          metadata: serialized.metadata || {},
        };
        builder.addNode(node);
        break;
      }
    }
  }

  // Reconstruct connections
  for (const conn of data.connections) {
    builder.connect(conn.fromNodeId, conn.fromPortId, conn.toNodeId, conn.toPortId, conn.id);
  }

  if (data.entryNodeId) {
    builder.setEntryNode(data.entryNodeId);
  }

  if (data.exitNodeIds) {
    for (const exitId of data.exitNodeIds) {
      builder.addExitNode(exitId);
    }
  }

  return builder.build();
}

