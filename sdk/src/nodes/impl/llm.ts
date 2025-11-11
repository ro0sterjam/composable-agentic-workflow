import { TransformerNode } from '../types';

/**
 * Config type for SimpleLLMTransformerNode
 */
export interface SimpleLLMTransformerNodeConfig {
  model: 'openai/gpt-5';
  system?: string;
  prompt?: string;
}

/**
 * Simple LLM transformer node - transforms input using an LLM
 * @template InputType - The type of input data
 * @template OutputType - The type of output data (typically string)
 */
export class SimpleLLMTransformerNode<
  InputType = string,
  OutputType = string,
> extends TransformerNode<InputType, OutputType, SimpleLLMTransformerNodeConfig> {
  type: 'simple_llm';

  constructor(id: string, config: SimpleLLMTransformerNodeConfig, label?: string) {
    super(id, 'simple_llm', config, label);
    this.type = 'simple_llm';
  }
}
