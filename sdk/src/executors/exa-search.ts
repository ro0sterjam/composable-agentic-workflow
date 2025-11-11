import { getLogger } from '../logger';
import type {
  ExaSearchTransformerNodeConfig,
  ExaSearchResponse,
  ExaSearchResult,
} from '../nodes/impl/exa-search';

import type { TransformerExecutor, DAGContext } from './registry';

/**
 * Exa Search transformer executor - executes Exa search transformer nodes
 */
export class ExaSearchExecutor<InputType = string, OutputType = ExaSearchResult>
  implements TransformerExecutor<InputType, OutputType, ExaSearchTransformerNodeConfig>
{
  async execute(
    input: InputType,
    config: ExaSearchTransformerNodeConfig,
    _dagContext: DAGContext
  ): Promise<OutputType> {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      throw new Error('EXA_API_KEY environment variable is not set');
    }

    // Convert input to query string
    const query = String(input);

    // Build request body
    const requestBody: Record<string, unknown> = {
      query: query,
      type: config.type ?? 'auto', // Default to 'auto'
      numResults: config.numResults ?? 10, // Default to 10
      contents: {
        text: true,
        // text: {
        //   maxCharacters: 40000,
        // },
      },
    };

    // Add optional parameters
    if (config.includeDomains && config.includeDomains.length > 0) {
      requestBody.includeDomains = config.includeDomains;
    }

    if (config.excludeDomains && config.excludeDomains.length > 0) {
      requestBody.excludeDomains = config.excludeDomains;
    }

    if (config.includeText && config.includeText.length > 0) {
      requestBody.includeText = config.includeText;
    }

    if (config.excludeText && config.excludeText.length > 0) {
      requestBody.excludeText = config.excludeText;
    }

    if (config.category) {
      requestBody.category = config.category;
    }

    // Make API request
    const logger = getLogger();
    logger.debug(`[ExaSearchExecutor] Making API request to Exa API`);
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    logger.debug(`[ExaSearchExecutor] Completed API request to Exa API`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Exa API request failed with status ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as ExaSearchResponse;
    return result.results as OutputType;
  }
}
