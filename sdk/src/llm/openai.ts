import { openai } from '@ai-sdk/openai';
import type { JSONSchema7 } from '@ai-sdk/provider';
import { generateText, generateObject } from 'ai';

import type { LLMModel, ModelMessage } from './types';

/**
 * Execute LLM request using OpenAI provider
 */
export async function executeOpenAI(
  messages: ModelMessage[],
  model: LLMModel,
  schema?: JSONSchema7,
  mode: 'auto' | 'json' | 'tool' = 'auto'
): Promise<unknown> {
  // Get API key from environment
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please set OPENAI_API_KEY environment variable.');
  }

  try {
    if (schema) {
      // Use structured output
      const result = await generateObject({
        model: openai.chat(model),
        messages,
        schema: schema as any, // JSON Schema format (converted internally by SDK)
        mode, // 'auto' is recommended by Vercel AI SDK
      });
      return result.object;
    } else {
      // Regular text generation
      const result = await generateText({
        model: openai.chat(model),
        messages,
      });
      return result.text;
    }
  } catch (error) {
    // Provide more helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('model')) {
        throw new Error(
          `LLM model error: ${error.message}. Please check if model "${String(model)}" is valid and your API key has access to it.`
        );
      }
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        throw new Error(
          `OpenAI API authentication error: ${error.message}. Please check your API key.`
        );
      }
    }
    throw error;
  }
}
