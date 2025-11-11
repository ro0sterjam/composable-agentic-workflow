import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { TransformerNode } from '../types';

import type { Model } from './models';
import type { JSONSchema } from './structured-llm';

/**
 * Recursively extract the first non-sequential transformer node ID from a transformer node.
 * If the transformer is a SequentialTransformerNode, recursively traverse to find the actual first transformer.
 * @param transformer - The transformer node (may be a SequentialTransformerNode)
 * @returns The ID of the first non-sequential transformer node in the chain
 */
function getFirstTransformerId(transformer: TransformerNode<any, any, any>): string {
  if (transformer.type === 'sequential') {
    const seqNode = transformer as any;
    if (seqNode.first) {
      // Recursively get the first transformer ID from the first node
      return getFirstTransformerId(seqNode.first);
    } else {
      throw new Error(
        'SequentialTransformerNode must have a first node to extract transformerId from.'
      );
    }
  } else {
    // This is a regular transformer node, return its ID
    return transformer.id;
  }
}

/**
 * Tool configuration for Agent node (input to constructor)
 */
export interface AgentToolConfigInput {
  name: string;
  description: string;
  inputSchema: z.ZodType<unknown>; // Zod schema for tool input
  transformer: TransformerNode<unknown, unknown, unknown>; // Transformer node that implements the tool
}

/**
 * Tool configuration in serialized config (with transformerId)
 */
export interface AgentToolConfig {
  name: string;
  description: string;
  inputSchema: JSONSchema; // JSON Schema converted from Zod schema
  transformerId: string; // Node ID that implements the tool (added by constructor)
}

/**
 * Config type for AgentTransformerNode (input to constructor)
 */
export interface AgentTransformerNodeConfigInput {
  model: Model;
  system?: string; // System prompt
  tools: AgentToolConfigInput[]; // Array of tools available to the agent
  maxLoops?: number; // Maximum number of tool call loops (if not set, no limit)
}

/**
 * Config type for AgentTransformerNode (serialized)
 */
export interface AgentTransformerNodeConfig {
  model: Model;
  system?: string; // System prompt
  tools: AgentToolConfig[]; // Array of tools with transformerId
  maxLoops?: number; // Maximum number of tool call loops (if not set, no limit)
}

/**
 * Agent transformer node - executes an AI agent that can call tools
 * @template InputType - The type of input data
 * @template OutputType - The type of output data (typically string)
 */
export class AgentTransformerNode<InputType = string, OutputType = string> extends TransformerNode<
  InputType,
  OutputType,
  AgentTransformerNodeConfig
> {
  type: 'agent';
  tools: AgentToolConfigInput[]; // Store the original tool configs with transformer nodes

  /**
   * Creates a new AgentTransformerNode
   * @param id - Unique identifier for the node
   * @param config - Configuration with model, system prompt, and tools (with transformer nodes). If a SequentialTransformerNode (or nested SequentialTransformerNodes) is provided in a tool, the transformerId will be recursively extracted from the first non-sequential transformer node.
   * @param label - Optional label for the node
   */
  constructor(id: string, config: AgentTransformerNodeConfigInput, label?: string) {
    // Convert Zod schemas to JSON Schema and extract transformerId from transformer nodes
    const toolsWithJsonSchema: AgentToolConfig[] = config.tools.map((tool) => {
      // Recursively extract the first non-sequential transformer ID
      const transformerId = getFirstTransformerId(tool.transformer);

      return {
        name: tool.name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.inputSchema) as JSONSchema,
        transformerId, // Extract ID from first non-sequential transformer node in the chain
      };
    });

    super(
      id,
      'agent',
      {
        model: config.model,
        ...(config.system && { system: config.system }),
        tools: toolsWithJsonSchema,
        ...(config.maxLoops !== undefined && { maxLoops: config.maxLoops }),
      },
      label
    );
    this.type = 'agent';
    this.tools = config.tools; // Store original configs for serialization
  }
}
