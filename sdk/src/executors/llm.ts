import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

import { getLogger } from '../logger';
import type { SimpleLLMTransformerNodeConfig } from '../nodes/impl/llm';
import type { OpenAIModel } from '../nodes/impl/models';

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

    // Check if it's an OpenAI model
    if (config.model.startsWith('openai/')) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }

      // Extract model name (remove provider prefix)
      const modelName = config.model.split('/')[1] as OpenAIModel extends `openai/${infer M}`
        ? M
        : string;

      // Interpolate system prompt if provided
      const system = config.system
        ? interpolateString(config.system, input, dagContext)
        : undefined;

      const logger = getLogger();
      logger.debug(`[SimpleLLMExecutor] Executing LLM for input: ${input}`);
      const result = await generateText({
        model: openai(modelName),
        system: system,
        prompt: prompt,
      });
      logger.debug(`[SimpleLLMExecutor] LLM executed for input: ${input}`);
      return result.text as OutputType;
    }

    throw new Error(`Unsupported model: ${config.model}`);
  }
}
