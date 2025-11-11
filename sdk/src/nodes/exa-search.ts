import type { BaseNode, Port } from '../types';
import { NodeType } from '../types';
import { NodeBuilder } from './base-builder';
import { executeExaSearchNode } from '../exa-executor';
import type { DAGConfig } from '../dag-config';

/**
 * Exa Search configuration
 */
export interface ExaSearchConfig {
  searchType?: 'auto' | 'neural' | 'keyword' | 'fast';
  includeDomains?: string[];
  excludeDomains?: string[];
  includeText?: string[];
  excludeText?: string[];
  category?: string;
  numResults?: number;
  text?: boolean; // Include text content in results
  contents?: boolean | { numChars?: number }; // Include full contents
  highlights?: boolean; // Include highlights
  summary?: boolean; // Include summary
}

/**
 * Exa Search node - performs web search using Exa API
 */
export interface ExaSearchNode extends BaseNode {
  type: NodeType.EXA_SEARCH;
  inputPorts: Port[];
  outputPorts: Port[];
  config: ExaSearchConfig;
  execute: (input: unknown, dagConfig?: DAGConfig) => Promise<unknown> | unknown;
}

/**
 * Builder for Exa Search nodes
 */
export class ExaSearchNodeBuilder extends NodeBuilder<ExaSearchNode> {
  constructor(dag: import('../fluent-builder').FluentDAGBuilder, node: ExaSearchNode) {
    super(dag, node);
    // Define execute function that calls the executor
    // Note: config will be provided by the DAGExecutor at runtime
    node.execute = async (input: unknown, dagConfig?: DAGConfig) => {
      return executeExaSearchNode(input, node.config, dagConfig);
    };
  }

  searchType(type: 'auto' | 'neural' | 'keyword' | 'fast'): this {
    this.node.config.searchType = type;
    this.updateExecute();
    return this;
  }

  includeDomains(domains: string[]): this {
    this.node.config.includeDomains = domains;
    this.updateExecute();
    return this;
  }

  excludeDomains(domains: string[]): this {
    this.node.config.excludeDomains = domains;
    this.updateExecute();
    return this;
  }

  includeText(text: string[]): this {
    this.node.config.includeText = text;
    this.updateExecute();
    return this;
  }

  excludeText(text: string[]): this {
    this.node.config.excludeText = text;
    this.updateExecute();
    return this;
  }

  category(category: string): this {
    this.node.config.category = category;
    this.updateExecute();
    return this;
  }

  numResults(num: number): this {
    this.node.config.numResults = num;
    this.updateExecute();
    return this;
  }

  text(include: boolean): this {
    this.node.config.text = include;
    this.updateExecute();
    return this;
  }

  contents(include: boolean | { numChars?: number }): this {
    this.node.config.contents = include;
    this.updateExecute();
    return this;
  }

  highlights(include: boolean): this {
    this.node.config.highlights = include;
    this.updateExecute();
    return this;
  }

  summary(include: boolean): this {
    this.node.config.summary = include;
    this.updateExecute();
    return this;
  }

  private updateExecute(): void {
    this.node.execute = async (input: unknown, dagConfig?: DAGConfig) => {
      return executeExaSearchNode(input, this.node.config, dagConfig);
    };
  }

  config(config: Partial<ExaSearchConfig>): this {
    this.node.config = { ...this.node.config, ...config };
    this.updateExecute();
    return this;
  }

  inputPorts(ports: Port[]): this {
    this.node.inputPorts = ports;
    return this;
  }

  outputPorts(ports: Port[]): this {
    this.node.outputPorts = ports;
    return this;
  }
}

