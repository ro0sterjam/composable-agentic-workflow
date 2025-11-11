import type { JSONSchema7 } from '@ai-sdk/provider';

import { executeLLM, LLMModel, type ModelMessage } from '../llm';

import { TransformerNode } from './types';

// Re-export types for convenience
export { LLMProvider, LLMModel, LLM_MODEL_PROVIDER, type ModelMessage } from '../llm';
export type { JSONSchema7 } from '@ai-sdk/provider';

/**
 * LLM transformer node - sends input to an LLM and outputs a string response
 * @template InputType - The type of input data
 */
export class LLMTransformerNode<InputType> extends TransformerNode<InputType, string> {
  model: LLMModel;
  metadata?: Record<string, unknown>;

  type: 'llm';

  constructor(id: string, model: LLMModel = LLMModel.GPT_4O, label?: string) {
    super(id, 'llm', label);
    this.type = 'llm';
    this.model = model;
  }

  async execute(input: InputType): Promise<string> {
    // Convert input to messages array
    // If input is already an array of messages, use it directly
    // Otherwise, convert to a user message
    const messages: ModelMessage[] =
      Array.isArray(input) && input.every((msg) => typeof msg === 'object' && 'role' in msg)
        ? (input as ModelMessage[])
        : [{ role: 'user', content: typeof input === 'string' ? input : JSON.stringify(input) }];

    return (await executeLLM(messages, this.model, undefined)) as string;
  }
}

/**
 * LLM transformer node with structured output - sends input to an LLM and outputs structured data
 * @template InputType - The type of input data
 * @template OutputType - The type of output data (dictated by schema)
 */
export class LLMWithStructuredTransformerNode<InputType, OutputType> extends TransformerNode<
  InputType,
  OutputType
> {
  model: LLMModel;
  schema: JSONSchema7;
  mode: 'auto' | 'json' | 'tool';
  metadata?: Record<string, unknown>;

  type: 'llm';

  constructor(
    id: string,
    model: LLMModel = LLMModel.GPT_4O,
    schema: JSONSchema7,
    mode: 'auto' | 'json' | 'tool' = 'auto',
    label?: string
  ) {
    super(id, 'llm', label);
    this.type = 'llm';
    this.model = model;
    this.schema = schema;
    this.mode = mode;
  }

  async execute(input: InputType): Promise<OutputType> {
    // Convert input to messages array
    // If input is already an array of messages, use it directly
    // Otherwise, convert to a user message
    const messages: ModelMessage[] =
      Array.isArray(input) && input.every((msg) => typeof msg === 'object' && 'role' in msg)
        ? (input as ModelMessage[])
        : [{ role: 'user', content: typeof input === 'string' ? input : JSON.stringify(input) }];

    return (await executeLLM(messages, this.model, this.schema, this.mode)) as OutputType;
  }
}

// Export type alias for backward compatibility
export type LLMNode<InputType = any, OutputType = any> =
  | LLMTransformerNode<InputType>
  | LLMWithStructuredTransformerNode<InputType, OutputType>;
