import { DAGBuilder } from './dag-builder';
import { defaultNodeRegistry } from './nodes/registry';
import { DAG, DAGData, Node, DEFAULT_NODE_TYPES } from './types';

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
      metadata:
        ('metadata' in node
          ? (node as { metadata?: Record<string, unknown> }).metadata
          : undefined) || {},
    };

    // Serialize node-specific fields
    if (node.type === DEFAULT_NODE_TYPES.LITERAL) {
      serializable.value = (node as import('./nodes/literal').LiteralSourceNode<any>).value;
    } else if (node.type === DEFAULT_NODE_TYPES.LLM) {
      const llmNode = node as
        | import('./nodes/llm').LLMTransformerNode<any>
        | import('./nodes/llm').LLMWithStructuredTransformerNode<any, any>;
      serializable.model = llmNode.model;
      if ('schema' in llmNode) {
        serializable.schema = (llmNode as { schema: unknown }).schema;
        serializable.mode = (llmNode as { mode?: 'auto' | 'json' | 'tool' }).mode;
      }
      const nodeMetadata =
        'metadata' in node ? (node as { metadata?: Record<string, unknown> }).metadata : undefined;
      serializable.executeRef = nodeMetadata?.executeRef;
    } else if (node.type === DEFAULT_NODE_TYPES.CONSOLE) {
      // Console sink node - no additional serialization needed
      const nodeMetadata =
        'metadata' in node ? (node as { metadata?: Record<string, unknown> }).metadata : undefined;
      serializable.executeRef = nodeMetadata?.executeRef;
    } else if (node.type === DEFAULT_NODE_TYPES.EXA_SEARCH) {
      serializable.inputPorts = node.inputPorts;
      serializable.outputPorts = node.outputPorts;
      serializable.config = (
        node as import('./nodes/exa-search').ExaSearchNode<any, any>
      ).searchConfig;
      const nodeMetadata =
        'metadata' in node ? (node as { metadata?: Record<string, unknown> }).metadata : undefined;
      serializable.executeRef = nodeMetadata?.executeRef;
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
 * Uses the node registry to dynamically construct nodes
 */
export function deserializeDAG(data: DAGData, nodeRegistry = defaultNodeRegistry): DAG {
  const builder = new DAGBuilder(data.id);

  // Reconstruct nodes from serialized data using the registry
  for (const [id, nodeData] of Object.entries(data.nodes)) {
    const serialized = nodeData as any;

    // Use registry to create node instance
    const node = nodeRegistry.create(serialized.type, serialized);

    if (!node) {
      throw new Error(
        `Unknown node type: ${serialized.type}. Make sure it's registered in the node registry.`
      );
    }

    // Set metadata if present and node supports it
    if (serialized.metadata && 'metadata' in node) {
      (node as { metadata?: Record<string, unknown> }).metadata = serialized.metadata;
    }

    builder.addNode(node as Node);
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
