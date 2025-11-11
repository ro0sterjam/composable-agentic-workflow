/**
 * Supported OpenAI models
 */
export type OpenAIModel =
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini'
  | 'openai/gpt-4-turbo'
  | 'openai/gpt-4'
  | 'openai/gpt-3.5-turbo'
  | 'openai/gpt-5';

/**
 * All supported models (currently only OpenAI)
 */
export type Model = OpenAIModel;

/**
 * Default model options for UI
 */
export const MODEL_OPTIONS: Array<{ value: Model; label: string; description?: string }> = [
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast and affordable' },
  { value: 'openai/gpt-4o', label: 'GPT-4o', description: 'Fast and capable' },
  { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo', description: 'High performance' },
  { value: 'openai/gpt-4', label: 'GPT-4', description: 'High quality' },
  { value: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' },
  { value: 'openai/gpt-5', label: 'GPT-5', description: 'Latest model' },
];

