import { DEFAULT_NODE_TYPES } from '../types';

import { ConsoleTerminalNode } from './console';
import { LiteralSourceNode } from './literal';
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

defaultNodeRegistry.register(DEFAULT_NODE_TYPES.CONSOLE, (data: any) => {
  return new ConsoleTerminalNode(data.id, data.label || data.id);
});
