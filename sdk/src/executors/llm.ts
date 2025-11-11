import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

import type { SimpleLLMTransformerNodeConfig } from '../nodes/impl/llm';

import type { TransformerExecutor } from './registry';

/**
 * Simple LLM transformer executor - executes LLM transformer nodes
 */
export class SimpleLLMExecutor<InputType = string, OutputType = string>
  implements TransformerExecutor<InputType, OutputType, SimpleLLMTransformerNodeConfig>
{
  async execute(input: InputType, config: SimpleLLMTransformerNodeConfig): Promise<OutputType> {
    // Interpolate input into prompt
    const prompt = config.prompt?.replace(/\$\{input\}/g, String(input)) || String(input);

    // Call OpenAI API using generateText
    if (config.model === 'openai/gpt-5') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }

      // Extract model name (remove provider prefix)
      const modelName = config.model.split('/')[1];

      const result = await generateText({
        model: openai(modelName),
        system: config.system,
        prompt: prompt,
      });

      return result.text as OutputType;
    }

    throw new Error(`Unsupported model: ${config.model}`);
  }
}
