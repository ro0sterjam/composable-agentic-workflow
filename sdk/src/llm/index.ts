import type { JSONSchema7 } from '@ai-sdk/provider';

import { executeOpenAI } from './openai';
import { LLM_MODEL_PROVIDER, LLMProvider, LLMModel, type ModelMessage } from './types';

/**
 * Execute LLM request - delegates to provider-specific implementation
 */
export async function executeLLM(
  messages: ModelMessage[],
  model: LLMModel,
  schema?: JSONSchema7,
  mode: 'auto' | 'json' | 'tool' = 'auto'
): Promise<unknown> {
  // Look up provider for the model
  const provider = LLM_MODEL_PROVIDER[model];
  if (!provider) {
    throw new Error(`Provider not found for model: ${model}`);
  }

  // Delegate to provider-specific implementation
  if (provider === LLMProvider.OpenAI) {
    return executeOpenAI(messages, model, schema, mode);
  }

  throw new Error(`Unsupported LLM provider: ${provider}. Model: ${model}`);
}

// Re-export types and enums
export { LLM_MODEL_PROVIDER, LLMProvider, LLMModel } from './types';
export type { ModelMessage } from './types';
export type { JSONSchema7 } from '@ai-sdk/provider';
