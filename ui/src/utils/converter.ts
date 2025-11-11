import type { Node, Edge } from 'reactflow';

import type { SerializedDAG, SerializedNode, SerializedEdge } from '../types';

/**
 * Convert ReactFlow nodes and edges to SerializedDAG format
 */
export function convertToSerializedDAG(nodes: Node[], edges: Edge[]): SerializedDAG {
  const serializedNodes: SerializedNode[] = nodes.map((node) => {
    const nodeType = node.data.nodeType as string;
    const config: Record<string, unknown> = {};

    // Extract config based on node type
    if (nodeType === 'literal') {
      config.value = node.data.value ?? '';
    } else if (nodeType === 'simple_llm') {
      if (node.data.llmConfig) {
        config.model = node.data.llmConfig.model || 'openai/gpt-5';
        if (node.data.llmConfig.system) {
          config.system = node.data.llmConfig.system;
        }
        if (node.data.llmConfig.prompt) {
          config.prompt = node.data.llmConfig.prompt;
        }
      } else {
        config.model = 'openai/gpt-5';
      }
    } else if (nodeType === 'structured_llm') {
      if (node.data.structuredLLMConfig) {
        config.model = node.data.structuredLLMConfig.model || 'openai/gpt-5';
        // Parse the schema string to JSON Schema object
        try {
          config.schema = JSON.parse(node.data.structuredLLMConfig.schema || '{}');
        } catch {
          // If parsing fails, use empty object
          config.schema = {};
        }
        if (node.data.structuredLLMConfig.prompt) {
          config.prompt = node.data.structuredLLMConfig.prompt;
        }
      } else {
        config.model = 'openai/gpt-5';
        config.schema = {};
      }
    } else if (nodeType === 'map') {
      if (node.data.mapConfig) {
        config.parallel = node.data.mapConfig.parallel ?? true;
        if (node.data.mapConfig.transformerId) {
          config.transformerId = node.data.mapConfig.transformerId;
        }
      } else {
        config.parallel = true;
      }
    } else if (nodeType === 'flatmap') {
      if (node.data.flatmapConfig) {
        config.parallel = node.data.flatmapConfig.parallel ?? true;
        if (node.data.flatmapConfig.transformerId) {
          config.transformerId = node.data.flatmapConfig.transformerId;
        }
      } else {
        config.parallel = true;
      }
    }

  return {
      id: node.id,
      type: nodeType,
      label: node.data.label || node.id,
      ...(Object.keys(config).length > 0 && { config }),
  };
  });

  const serializedEdges: SerializedEdge[] = edges.map((edge) => ({
    from: edge.source,
    to: edge.target,
  }));

  return {
    nodes: serializedNodes,
    edges: serializedEdges,
  };
}
