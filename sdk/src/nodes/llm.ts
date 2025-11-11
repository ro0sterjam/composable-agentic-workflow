import type { BaseNode, Port } from '../types';
import { NodeType } from '../types';
import { NodeBuilder } from './base-builder';
import { executeLLMNode } from '../llm-executor';
import type { DAGConfig } from '../dag-config';

/**
 * Structured output configuration
 */
export interface StructuredOutputConfig {
  schema: Record<string, unknown>; // JSON Schema
  mode?: 'json' | 'json_schema' | 'tool';
}

/**
 * LLM node - sends input to an LLM and outputs the response
 */
export interface LLMNode extends BaseNode {
  type: NodeType.LLM;
  inputPorts: Port[];
  outputPorts: Port[];
  model: string; // e.g., 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'
  structuredOutput?: StructuredOutputConfig;
  execute: (input: unknown, config?: DAGConfig) => Promise<unknown> | unknown;
}

/**
 * Builder for LLM nodes
 */
export class LLMNodeBuilder extends NodeBuilder<LLMNode> {
  constructor(dag: import('../fluent-builder').FluentDAGBuilder, node: LLMNode) {
    super(dag, node);
    // Define execute function that calls the executor
    // Note: config will be provided by the DAGExecutor at runtime
    this.updateExecute();
  }

  private updateExecute(): void {
    this.node.execute = async (input: unknown, config?: DAGConfig) => {
      return executeLLMNode(input, this.node.model, this.node.structuredOutput, config);
    };
  }

  model(modelName: string): this {
    this.node.model = modelName;
    this.updateExecute();
    return this;
  }

  structuredOutput(config: StructuredOutputConfig): this {
    this.node.structuredOutput = config;
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

