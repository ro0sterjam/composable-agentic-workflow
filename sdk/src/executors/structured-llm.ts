import { openai } from '@ai-sdk/openai';
import { generateObject, jsonSchema } from 'ai';

import type { JSONSchema } from '../nodes/impl/structured-llm';

import type { TransformerExecutor } from './registry';

/**
 * Internal config type that the executor receives (with JSON Schema)
 */
interface StructuredLLMTransformerNodeExecutorConfig {
  model: 'openai/gpt-5';
  schema: JSONSchema;
  prompt?: string;
}

/**
 * Structured LLM transformer executor - executes structured LLM transformer nodes
 */
export class StructuredLLMExecutor<InputType = string, OutputType = unknown>
  implements TransformerExecutor<InputType, OutputType, StructuredLLMTransformerNodeExecutorConfig>
{
  async execute(
    input: InputType,
    config: StructuredLLMTransformerNodeExecutorConfig
  ): Promise<OutputType> {
    // Interpolate input into prompt
    const prompt = config.prompt?.replace(/\$\{input\}/g, String(input)) || String(input);

    // Call OpenAI API using generateObject
    if (config.model === 'openai/gpt-5') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }

      // Extract model name (remove provider prefix)
      const modelName = config.model.split('/')[1];

      // Check if schema is an array type - OpenAI requires object type for response_format
      const schema = config.schema as Record<string, unknown>;
      const isArraySchema = schema.type === 'array';

      let wrappedSchema: Record<string, unknown>;
      let needsUnwrap = false;

      if (isArraySchema) {
        // Wrap array schema in an object: { items: <array schema> }
        wrappedSchema = {
          type: 'object',
          properties: {
            items: schema,
          },
          required: ['items'],
        };
        needsUnwrap = true;
      } else {
        wrappedSchema = schema;
      }

      // Wrap JSON Schema using jsonSchema helper so generateObject can use it
      const result = await generateObject({
        model: openai(modelName),
        schema: jsonSchema(wrappedSchema),
        prompt: prompt,
      });

      // Unwrap if we wrapped an array schema
      if (needsUnwrap) {
        const wrappedResult = result.object as { items: OutputType };
        return wrappedResult.items;
      }

      return result.object as OutputType;
    }

    throw new Error(`Unsupported model: ${config.model}`);
  }
}
