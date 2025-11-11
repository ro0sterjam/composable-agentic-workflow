import { executeExaSearchNode } from '../exa-executor';
import type { Port } from '../types';

import { NodeBuilder } from './base-builder';
import { TransformerNode } from './types';

/**
 * Exa Search category types
 */
export type ExaSearchCategory =
  | 'company'
  | 'research paper'
  | 'news'
  | 'pdf'
  | 'github'
  | 'tweet'
  | 'personal site'
  | 'linkedin profile'
  | 'financial report';

/**
 * Exa Search configuration
 */
export interface ExaSearchConfig {
  searchType?: 'auto' | 'neural' | 'keyword' | 'fast';
  includeDomains?: string[];
  excludeDomains?: string[];
  includeText?: string[];
  excludeText?: string[];
  category?: ExaSearchCategory;
  numResults?: number;
  text?: boolean; // Include text content in results
  contents?: boolean | { numChars?: number }; // Include full contents
  highlights?: boolean; // Include highlights
  summary?: boolean; // Include summary
}

/**
 * Exa Search node - performs web search using Exa API
 * @template InputType - The type of input data
 * @template OutputType - The type of output data
 */
export class ExaSearchNode<InputType, OutputType> extends TransformerNode<InputType, OutputType> {
  type: 'exa_search';
  inputPorts: Port[];
  outputPorts: Port[];
  searchConfig: ExaSearchConfig;
  metadata?: Record<string, unknown>;

  constructor(
    id: string,
    searchConfig: ExaSearchConfig,
    inputPorts: Port[] = [{ id: 'input', label: 'Input' }],
    outputPorts: Port[] = [{ id: 'output', label: 'Output' }],
    label?: string
  ) {
    super(id, 'exa_search', label);
    this.type = 'exa_search';
    this.inputPorts = inputPorts;
    this.outputPorts = outputPorts;
    this.searchConfig = searchConfig;
  }

  // Execute function will be set by ExaSearchNodeBuilder
  // Provide a default implementation that throws an error
  async execute(input: InputType): Promise<OutputType> {
    throw new Error(
      'Execute function not initialized. This should be set by ExaSearchNodeBuilder.'
    );
  }
}

/**
 * Builder for Exa Search nodes
 */
export class ExaSearchNodeBuilder<InputType, OutputType> extends NodeBuilder<
  ExaSearchNode<InputType, OutputType>
> {
  constructor(
    dag: import('../dag-builder').DAGBuilder,
    node: ExaSearchNode<InputType, OutputType>
  ) {
    super(dag, node);
    // Define execute function that calls the executor
    node.execute = async (input: InputType) => {
      return executeExaSearchNode(input, node.searchConfig) as OutputType;
    };
  }

  searchType(type: 'auto' | 'neural' | 'keyword' | 'fast'): this {
    this.node.searchConfig.searchType = type;
    this.updateExecute();
    return this;
  }

  includeDomains(domains: string[]): this {
    this.node.searchConfig.includeDomains = domains;
    this.updateExecute();
    return this;
  }

  excludeDomains(domains: string[]): this {
    this.node.searchConfig.excludeDomains = domains;
    this.updateExecute();
    return this;
  }

  includeText(text: string[]): this {
    this.node.searchConfig.includeText = text;
    this.updateExecute();
    return this;
  }

  excludeText(text: string[]): this {
    this.node.searchConfig.excludeText = text;
    this.updateExecute();
    return this;
  }

  category(category: ExaSearchCategory): this {
    this.node.searchConfig.category = category;
    this.updateExecute();
    return this;
  }

  numResults(num: number): this {
    this.node.searchConfig.numResults = num;
    this.updateExecute();
    return this;
  }

  text(include: boolean): this {
    this.node.searchConfig.text = include;
    this.updateExecute();
    return this;
  }

  contents(include: boolean | { numChars?: number }): this {
    this.node.searchConfig.contents = include;
    this.updateExecute();
    return this;
  }

  highlights(include: boolean): this {
    this.node.searchConfig.highlights = include;
    this.updateExecute();
    return this;
  }

  summary(include: boolean): this {
    this.node.searchConfig.summary = include;
    this.updateExecute();
    return this;
  }

  private updateExecute(): void {
    this.node.execute = async (input: InputType) => {
      return executeExaSearchNode(input, this.node.searchConfig) as OutputType;
    };
  }

  config(config: Partial<ExaSearchConfig>): this {
    this.node.searchConfig = { ...this.node.searchConfig, ...config };
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
