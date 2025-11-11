/**
 * LLM provider names
 */
export enum LLMProvider {
  OpenAI = 'openai',
}

/**
 * LLM model names
 */
export enum LLMModel {
  GPT_4O = 'gpt-4o',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_4 = 'gpt-4',
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
  GPT_5 = 'gpt-5',
}

/**
 * Mapping of LLM models to their providers
 * Note: TypeScript enums can't have properties, so we use a separate mapping object
 */
export const LLM_MODEL_PROVIDER: Record<LLMModel, LLMProvider> = {
  [LLMModel.GPT_4O]: LLMProvider.OpenAI,
  [LLMModel.GPT_4_TURBO]: LLMProvider.OpenAI,
  [LLMModel.GPT_4]: LLMProvider.OpenAI,
  [LLMModel.GPT_3_5_TURBO]: LLMProvider.OpenAI,
  [LLMModel.GPT_5]: LLMProvider.OpenAI,
};

// Re-export ModelMessage from AI SDK for convenience
export type { ModelMessage } from 'ai';

// Re-export JSONSchema7 from AI SDK provider
export type { JSONSchema7 } from '@ai-sdk/provider';
