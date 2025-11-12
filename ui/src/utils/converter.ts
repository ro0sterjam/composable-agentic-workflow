import type { Node, Edge } from 'reactflow';

import type { SerializedDAG, SerializedNode, SerializedEdge } from '../types';

/**
 * Convert ReactFlow nodes and edges to SerializedDAG format
 */
export function convertToSerializedDAG(nodes: Node[], edges: Edge[]): SerializedDAG {
  // Build a set of all node IDs that are referenced (by transformerId in map/flatmap/agent)
  const referencedNodeIds = new Set<string>();
  
  // Find all referenced nodes from map/flatmap/agent configs
  for (const node of nodes) {
    const nodeType = node.data.nodeType as string;
    if (nodeType === 'map' && node.data.mapConfig?.transformerId) {
      referencedNodeIds.add(node.data.mapConfig.transformerId);
    } else if (nodeType === 'flatmap' && node.data.flatmapConfig?.transformerId) {
      referencedNodeIds.add(node.data.flatmapConfig.transformerId);
    } else if (nodeType === 'agent' && node.data.agentConfig?.tools) {
      for (const tool of node.data.agentConfig.tools) {
        if (tool.transformerId) {
          referencedNodeIds.add(tool.transformerId);
        }
      }
    }
  }
  
  // Build a map of node ID to node for quick lookup
  const nodeMap = new Map<string, Node>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }
  
  // Ensure all referenced nodes are included (they should already be, but verify)
  const allNodeIds = new Set(nodes.map(n => n.id));
  for (const referencedId of referencedNodeIds) {
    if (!allNodeIds.has(referencedId)) {
      console.warn(`Warning: Referenced node ${referencedId} not found in nodes array`);
    }
  }

  const serializedNodes: SerializedNode[] = nodes.map((node) => {
    const nodeType = node.data.nodeType as string;
    const config: Record<string, unknown> = {};

    // Extract config based on node type
    if (nodeType === 'literal') {
      config.value = node.data.value ?? '';
    } else if (nodeType === 'simple_llm') {
      if (node.data.llmConfig) {
        config.model = node.data.llmConfig.model || 'openai/gpt-4o-mini';
        if (node.data.llmConfig.system) {
          config.system = node.data.llmConfig.system;
        }
        if (node.data.llmConfig.prompt) {
          config.prompt = node.data.llmConfig.prompt;
        }
      } else {
        config.model = 'openai/gpt-4o-mini';
      }
    } else if (nodeType === 'structured_llm') {
      if (node.data.structuredLLMConfig) {
        config.model = node.data.structuredLLMConfig.model || 'openai/gpt-4o-mini';
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
        config.model = 'openai/gpt-4o-mini';
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
    } else if (nodeType === 'exa_search') {
      if (node.data.exaSearchConfig) {
        config.type = node.data.exaSearchConfig.type || 'auto';
        config.numResults = node.data.exaSearchConfig.numResults || 10;
        if (node.data.exaSearchConfig.category) {
          config.category = node.data.exaSearchConfig.category;
        }
        if (node.data.exaSearchConfig.includeDomains && node.data.exaSearchConfig.includeDomains.length > 0) {
          config.includeDomains = node.data.exaSearchConfig.includeDomains;
        }
        if (node.data.exaSearchConfig.excludeDomains && node.data.exaSearchConfig.excludeDomains.length > 0) {
          config.excludeDomains = node.data.exaSearchConfig.excludeDomains;
        }
        if (node.data.exaSearchConfig.includeText && node.data.exaSearchConfig.includeText.length > 0) {
          config.includeText = node.data.exaSearchConfig.includeText;
        }
        if (node.data.exaSearchConfig.excludeText && node.data.exaSearchConfig.excludeText.length > 0) {
          config.excludeText = node.data.exaSearchConfig.excludeText;
        }
      } else {
        config.type = 'auto';
        config.numResults = 10;
      }
    } else if (nodeType === 'dedupe') {
      if (node.data.dedupeConfig) {
        config.method = node.data.dedupeConfig.method || 'first';
        if (node.data.dedupeConfig.byProperty) {
          config.byProperty = node.data.dedupeConfig.byProperty;
        }
      } else {
        config.method = 'first';
      }
    } else if (nodeType === 'cache') {
      if (node.data.cacheConfig?.property) {
        config.property = node.data.cacheConfig.property;
      } else {
        throw new Error(`Cache node ${node.id} requires a property path`);
      }
    } else if (nodeType === 'extract') {
      if (node.data.extractConfig?.property) {
        config.property = node.data.extractConfig.property;
      } else {
        throw new Error(`Extract node ${node.id} requires a property path`);
      }
    } else if (nodeType === 'filter') {
      if (node.data.filterConfig?.expression) {
        config.expression = node.data.filterConfig.expression;
      } else {
        throw new Error(`Filter node ${node.id} requires an expression`);
      }
    } else if (nodeType === 'agent') {
      if (node.data.agentConfig) {
        config.model = node.data.agentConfig.model || 'openai/gpt-4o-mini';
        if (node.data.agentConfig.system) {
          config.system = node.data.agentConfig.system;
        }
        if (node.data.agentConfig.tools && node.data.agentConfig.tools.length > 0) {
          config.tools = node.data.agentConfig.tools.map((tool: {
            name: string;
            description: string;
            inputSchema: string;
            transformerId: string;
          }) => {
            // Parse the inputSchema string to JSON Schema object
            let inputSchema: Record<string, unknown>;
            try {
              inputSchema = JSON.parse(tool.inputSchema);
            } catch {
              // If parsing fails, use default string schema
              inputSchema = { type: 'string' };
            }
            return {
              name: tool.name,
              description: tool.description,
              inputSchema,
              transformerId: tool.transformerId,
            };
          });
        } else {
          throw new Error(`Agent node ${node.id} requires at least one tool`);
        }
        if (node.data.agentConfig.maxLoops !== undefined) {
          config.maxLoops = node.data.agentConfig.maxLoops;
        }
        if (node.data.agentConfig.schema) {
          // Parse the schema string to JSON Schema object
          try {
            config.schema = JSON.parse(node.data.agentConfig.schema);
          } catch {
            // If parsing fails, use default object schema
            config.schema = { type: 'object', properties: {} };
          }
        }
      } else {
        throw new Error(`Agent node ${node.id} requires configuration`);
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

/**
 * Simple layout algorithm to position nodes
 */
function layoutNodes(nodeCount: number, startX = 250, startY = 250, spacingX = 300, spacingY = 200): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const nodesPerRow = Math.ceil(Math.sqrt(nodeCount));
  
  for (let i = 0; i < nodeCount; i++) {
    const row = Math.floor(i / nodesPerRow);
    const col = i % nodesPerRow;
    positions.push({
      x: startX + col * spacingX,
      y: startY + row * spacingY,
    });
  }
  
  return positions;
}

/**
 * Convert SerializedDAG format to ReactFlow nodes and edges
 */
export function convertFromSerializedDAG(
  serializedDAG: SerializedDAG,
  updateNodeCounter?: (maxId: number) => void
): { nodes: Node[]; edges: Edge[] } {
  const { nodes: serializedNodes, edges: serializedEdges } = serializedDAG;
  
  // Calculate positions for nodes
  const positions = layoutNodes(serializedNodes.length);
  
  // Track max node ID to update counter
  let maxNodeId = 0;
  
  // Convert serialized nodes to ReactFlow nodes
  const nodes: Node[] = serializedNodes.map((serializedNode, index) => {
    // Extract numeric part from node ID to track max
    const idMatch = serializedNode.id.match(/\d+/);
    if (idMatch) {
      const idNum = parseInt(idMatch[0], 10);
      if (idNum > maxNodeId) {
        maxNodeId = idNum;
      }
    }
    
    const nodeType = serializedNode.type;
    const config = serializedNode.config as Record<string, unknown> | undefined;
    const position = positions[index] || { x: 250 + index * 300, y: 250 };
    
    // Build node data based on type
    const nodeData: Record<string, unknown> = {
      label: serializedNode.label || serializedNode.id,
      nodeType,
      id: serializedNode.id,
    };
    
    // Convert config based on node type
    if (nodeType === 'literal') {
      nodeData.value = config?.value ?? '';
    } else if (nodeType === 'simple_llm') {
      const llmConfig: Record<string, unknown> = {
        model: config?.model || 'openai/gpt-4o-mini',
      };
      if (config?.system) {
        llmConfig.system = String(config.system);
      }
      if (config?.prompt) {
        llmConfig.prompt = String(config.prompt);
      }
      nodeData.llmConfig = llmConfig;
    } else if (nodeType === 'structured_llm') {
      const structuredLLMConfig: Record<string, unknown> = {
        model: config?.model || 'openai/gpt-4o-mini',
        schema: JSON.stringify(config?.schema || {}, null, 2),
      };
      if (config?.prompt) {
        structuredLLMConfig.prompt = String(config.prompt);
      }
      nodeData.structuredLLMConfig = structuredLLMConfig;
    } else if (nodeType === 'map') {
      const mapConfig: Record<string, unknown> = {
        parallel: config?.parallel ?? true,
      };
      if (config?.transformerId) {
        mapConfig.transformerId = String(config.transformerId);
      }
      nodeData.mapConfig = mapConfig;
    } else if (nodeType === 'flatmap') {
      const flatmapConfig: Record<string, unknown> = {
        parallel: config?.parallel ?? true,
      };
      if (config?.transformerId) {
        flatmapConfig.transformerId = String(config.transformerId);
      }
      nodeData.flatmapConfig = flatmapConfig;
    } else if (nodeType === 'exa_search') {
      const exaSearchConfig: Record<string, unknown> = {
        type: (config?.type as string) || 'auto',
        numResults: (config?.numResults as number) || 10,
      };
      if (config?.category) {
        exaSearchConfig.category = config.category as string;
      }
      if (config?.includeDomains) {
        exaSearchConfig.includeDomains = config.includeDomains as string[];
      }
      if (config?.excludeDomains) {
        exaSearchConfig.excludeDomains = config.excludeDomains as string[];
      }
      if (config?.includeText) {
        exaSearchConfig.includeText = config.includeText as string[];
      }
      if (config?.excludeText) {
        exaSearchConfig.excludeText = config.excludeText as string[];
      }
      nodeData.exaSearchConfig = exaSearchConfig;
    } else if (nodeType === 'dedupe') {
      const dedupeConfig: Record<string, unknown> = {
        method: (config?.method as string) || 'first',
      };
      if (config?.byProperty) {
        dedupeConfig.byProperty = String(config.byProperty);
      }
      nodeData.dedupeConfig = dedupeConfig;
    } else if (nodeType === 'cache') {
      nodeData.cacheConfig = {
        property: String(config?.property || ''),
      };
    } else if (nodeType === 'extract') {
      nodeData.extractConfig = {
        property: String(config?.property || ''),
      };
    } else if (nodeType === 'filter') {
      nodeData.filterConfig = {
        expression: String(config?.expression || ''),
      };
    } else if (nodeType === 'agent') {
      const tools = (config?.tools as Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
        transformerId: string;
      }>) || [];
      
      const agentConfig: Record<string, unknown> = {
        model: config?.model || 'openai/gpt-4o-mini',
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: JSON.stringify(tool.inputSchema, null, 2),
          transformerId: tool.transformerId,
        })),
      };
      if (config?.system) {
        agentConfig.system = String(config.system);
      }
      if (config?.maxLoops !== undefined) {
        agentConfig.maxLoops = Number(config.maxLoops);
      }
      if (config?.schema) {
        agentConfig.schema = JSON.stringify(config.schema, null, 2);
      }
      nodeData.agentConfig = agentConfig;
    }
    
    return {
      id: serializedNode.id,
      type: 'custom',
      position,
      data: nodeData,
    };
  });
  
  // Convert serialized edges to ReactFlow edges
  const edges: Edge[] = serializedEdges.map((serializedEdge, index) => ({
    id: `edge-${index}`,
    source: serializedEdge.from,
    target: serializedEdge.to,
    type: 'smoothstep',
  }));
  
  // Update node counter if callback provided
  if (updateNodeCounter && maxNodeId > 0) {
    updateNodeCounter(maxNodeId);
  }
  
  return { nodes, edges };
}
