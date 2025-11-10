import type { BaseNode, Port } from '../types';
import { NodeType } from '../types';
import { NodeBuilder } from './base-builder';

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
  execute: (input: unknown) => Promise<unknown> | unknown;
}

/**
 * Builder for LLM nodes
 */
export class LLMNodeBuilder extends NodeBuilder<LLMNode> {
  model(modelName: string): this {
    this.node.model = modelName;
    return this;
  }

  structuredOutput(config: StructuredOutputConfig): this {
    this.node.structuredOutput = config;
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

