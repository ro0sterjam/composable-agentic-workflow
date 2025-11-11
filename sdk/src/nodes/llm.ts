import { NodeType } from '../types';
import type { Port, BaseNode } from '../types';
import type { DAGConfig } from '../dag-config';
import type { ExecutionNode } from './execution';
import { executeLLMNode } from '../llm-executor';

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
export class LLMNode implements ExecutionNode {
  id: string;
  type: NodeType.LLM;
  label?: string;
  metadata?: Record<string, unknown>;
  inputPorts: Port[];
  outputPorts: Port[];
  model: string; // e.g., 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'
  structuredOutput?: StructuredOutputConfig;

  constructor(
    id: string,
    model: string = 'openai/gpt-4o',
    structuredOutput?: StructuredOutputConfig,
    inputPorts: Port[] = [{ id: 'input', label: 'Input' }],
    outputPorts: Port[] = [{ id: 'output', label: 'Output' }],
    label?: string
  ) {
    this.id = id;
    this.type = NodeType.LLM;
    this.inputPorts = inputPorts;
    this.outputPorts = outputPorts;
    this.model = model;
    this.structuredOutput = structuredOutput;
    this.label = label || id;
  }

  async execute(input: unknown, config?: unknown): Promise<unknown> {
    return executeLLMNode(input, this.model, this.structuredOutput, config as DAGConfig | undefined);
  }
}

// Export type alias for backward compatibility with existing code
export type LLMNodeType = LLMNode;
