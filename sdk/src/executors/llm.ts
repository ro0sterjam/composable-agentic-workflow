import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

import type { SimpleLLMTransformerNodeConfig } from '../nodes/impl/llm';

import { interpolateString } from './interpolation';
import type { TransformerExecutor, DAGContext } from './registry';

/**
 * Simple LLM transformer executor - executes LLM transformer nodes
 */
export class SimpleLLMExecutor<InputType = string, OutputType = string>
  implements TransformerExecutor<InputType, OutputType, SimpleLLMTransformerNodeConfig>
{
  async execute(
    input: InputType,
    config: SimpleLLMTransformerNodeConfig,
    dagContext: DAGContext
  ): Promise<OutputType> {
    // Interpolate input and cache values into prompt
    const prompt = config.prompt
      ? interpolateString(config.prompt, input, dagContext)
      : String(input);

    // Call OpenAI API using generateText
    if (config.model === 'openai/gpt-5') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }

      // Extract model name (remove provider prefix)
      const modelName = config.model.split('/')[1];

      // Interpolate system prompt if provided
      const system = config.system
        ? interpolateString(config.system, input, dagContext)
        : undefined;

      const result = await generateText({
        model: openai(modelName),
        system: system,
        prompt: prompt,
      });

      return result.text as OutputType;
    }

    throw new Error(`Unsupported model: ${config.model}`);
  }
}
