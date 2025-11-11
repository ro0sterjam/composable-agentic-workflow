import type { JSONSchema7 } from '@ai-sdk/provider';

import { executeExaSearchNode } from '../exa-executor';
import { DEFAULT_NODE_TYPES } from '../types';

import { ConsoleTerminalNode } from './console';
import { ExaSearchNode } from './exa-search';
import { LiteralSourceNode } from './literal';
import { LLMTransformerNode, LLMWithStructuredTransformerNode, LLMModel } from './llm';
import type { TransformerNode, SourceNode, TerminalNode, StandAloneNode } from './types';

/**
 * Union type for all node types
 */
type BaseNode = TransformerNode<any, any> | SourceNode<any> | TerminalNode<any> | StandAloneNode;

/**
 * Node constructor function type
 */
export type NodeConstructor = new (...args: any[]) => BaseNode;

/**
 * Node factory function type
 */
export type NodeFactory = (data: any) => BaseNode;

/**
 * Node type registry - maps node type strings to their constructor/factory functions
 */
export class NodeRegistry {
  private registry: Map<string, NodeFactory> = new Map();

  /**
   * Register a node type with its factory function
   */
  register(type: string, factory: NodeFactory): void {
    this.registry.set(type, factory);
  }

  /**
   * Create a node instance from serialized data
   */
  create(type: string, data: any): BaseNode | null {
    const factory = this.registry.get(type);
    if (!factory) {
      return null;
    }
    return factory(data);
  }

  /**
   * Check if a node type is registered
   */
  has(type: string): boolean {
    return this.registry.has(type);
  }

  /**
   * Get all registered node types
   */
  getTypes(): string[] {
    return Array.from(this.registry.keys());
  }
}

/**
 * Default node registry with built-in node types
 */
export const defaultNodeRegistry = new NodeRegistry();

// Register default node types
defaultNodeRegistry.register(DEFAULT_NODE_TYPES.LITERAL, (data: any) => {
  return new LiteralSourceNode(data.id, data.value, data.label || data.id);
});

defaultNodeRegistry.register(DEFAULT_NODE_TYPES.LLM, (data: any) => {
  if (data.schema) {
    return new LLMWithStructuredTransformerNode(
      data.id,
      data.model || LLMModel.GPT_4O,
      data.schema as JSONSchema7,
      data.mode || 'auto',
      data.label || data.id
    );
  } else {
    return new LLMTransformerNode(data.id, data.model || LLMModel.GPT_4O, data.label || data.id);
  }
});

defaultNodeRegistry.register(DEFAULT_NODE_TYPES.CONSOLE, (data: any) => {
  return new ConsoleTerminalNode(data.id, data.label || data.id);
});

defaultNodeRegistry.register(DEFAULT_NODE_TYPES.EXA_SEARCH, (data: any) => {
  const node = new ExaSearchNode(
    data.id,
    data.config || {
      searchType: 'auto',
      text: true,
      numResults: 10,
    },
    data.inputPorts || [{ id: 'input', label: 'Input' }],
    data.outputPorts || [{ id: 'output', label: 'Output' }],
    data.label || data.id
  );
  // Set execute function that calls executeExaSearchNode
  node.execute = async (input: any) => {
    return executeExaSearchNode(input, node.searchConfig);
  };
  return node;
});
