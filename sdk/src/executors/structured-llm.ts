import { openai } from '@ai-sdk/openai';
import { generateObject, jsonSchema } from 'ai';

import type { JSONSchema } from '../nodes/impl/structured-llm';

import { interpolateString } from './interpolation';
import type { TransformerExecutor, DAGContext } from './registry';

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
    config: StructuredLLMTransformerNodeExecutorConfig,
    dagContext: DAGContext
  ): Promise<OutputType> {
    // Interpolate input and cache values into prompt
    const prompt = config.prompt
      ? interpolateString(config.prompt, input, dagContext)
      : String(input);

    // Call OpenAI API using generateObject
    if (config.model === 'openai/gpt-5') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }

      // Extract model name (remove provider prefix)
      const modelName = config.model.split('/')[1];

      // Check if schema is an object type - OpenAI requires object type for response_format
      const schema = config.schema as Record<string, unknown>;
      const isObjectSchema = schema.type === 'object';

      let wrappedSchema: Record<string, unknown>;
      let needsUnwrap = false;

      if (!isObjectSchema) {
        // Wrap non-object schema (array, string, number, boolean, etc.) in an object
        // Use 'value' as the property name for non-object types
        wrappedSchema = {
          type: 'object',
          properties: {
            value: schema,
          },
          required: ['value'],
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

      // Unwrap if we wrapped a non-object schema
      if (needsUnwrap) {
        const wrappedResult = result.object as { value: OutputType };
        return wrappedResult.value;
      }

      return result.object as OutputType;
    }

    throw new Error(`Unsupported model: ${config.model}`);
  }
}
