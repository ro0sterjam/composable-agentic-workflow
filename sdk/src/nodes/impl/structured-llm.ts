import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { TransformerNode } from '../types';

import type { Model } from './models';

/**
 * JSON Schema type (simplified - matches what zod-to-json-schema produces)
 */
export type JSONSchema = Record<string, unknown>;

/**
 * Config type for StructuredLLMTransformerNode
 * The schema is provided as a Zod schema and will be converted to JSON Schema internally
 */
export interface StructuredLLMTransformerNodeConfig<OutputType> {
  model: Model;
  schema: z.ZodType<OutputType>; // Zod schema that defines the output structure
  prompt?: string; // User prompt, where ${input} will be interpolated
}

/**
 * Structured LLM transformer node - transforms input using an LLM with structured output
 * @template InputType - The type of input data
 * @template OutputType - The type of output data (must match the schema structure)
 */
export class StructuredLLMTransformerNode<
  InputType = string,
  OutputType = unknown,
> extends TransformerNode<
  InputType,
  OutputType,
  Omit<StructuredLLMTransformerNodeConfig<OutputType>, 'schema'> & {
    schema: JSONSchema; // JSON Schema converted from Zod schema
  }
> {
  type: 'structured_llm';

  /**
   * Creates a new StructuredLLMTransformerNode
   * @param id - Unique identifier for the node
   * @param config - Configuration with model, Zod schema, and optional prompt
   * @param label - Optional label for the node
   */
  constructor(id: string, config: StructuredLLMTransformerNodeConfig<OutputType>, label?: string) {
    // Convert Zod schema to JSON Schema
    const jsonSchema = zodToJsonSchema(config.schema) as JSONSchema;

    super(
      id,
      'structured_llm',
      {
        model: config.model,
        schema: jsonSchema,
        ...(config.prompt && { prompt: config.prompt }),
      },
      label
    );
    this.type = 'structured_llm';
  }
}
