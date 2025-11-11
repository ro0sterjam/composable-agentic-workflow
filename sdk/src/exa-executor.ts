import type { ExaSearchConfig } from './nodes/exa-search';
import type { DAGConfig } from './dag-config';

/**
 * Execute Exa Search node
 */
export async function executeExaSearchNode(
  query: unknown,
  config: ExaSearchConfig,
  dagConfig?: DAGConfig
): Promise<unknown> {
  // Get API key from config or environment
  const getApiKey = (): string | undefined => {
    if (dagConfig?.secrets?.exaApiKey) {
      return dagConfig.secrets.exaApiKey;
    }
    // Only access process.env in Node.js environment
    const isBrowser = typeof (globalThis as { window?: unknown }).window !== 'undefined';
    if (!isBrowser && typeof process !== 'undefined' && process.env) {
      return process.env.EXA_API_KEY;
    }
    return undefined;
  };

  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('Exa API key not found. Please provide it in DAG config or set EXA_API_KEY environment variable.');
  }

  // Convert query to string
  const queryString = typeof query === 'string' ? query : JSON.stringify(query);

  // Get timeout from config (default 30 seconds for search)
  const timeout = dagConfig?.runtime?.timeout || 30000;

  // Log execution start
  const startTime = Date.now();
  console.log(`[Exa Executor] Starting search with query: "${queryString}", timeout: ${timeout}ms`);

  try {
    // Build request body
    const requestBody: Record<string, unknown> = {
      query: queryString,
      text: config.text ?? true, // Default to including text
    };

    if (config.searchType) {
      requestBody.searchType = config.searchType;
    }
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
    if (config.numResults !== undefined) {
      requestBody.numResults = config.numResults;
    }
    if (config.contents !== undefined) {
      requestBody.contents = config.contents;
    }
    if (config.highlights !== undefined) {
      requestBody.highlights = config.highlights;
    }
    if (config.summary !== undefined) {
      requestBody.summary = config.summary;
    }

    // Create timeout promise
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        const elapsed = Date.now() - startTime;
        reject(new Error(`Exa search timed out after ${elapsed}ms (timeout: ${timeout}ms)`));
      }, timeout);
    });

    // Create execution promise
    const executePromise = (async () => {
      const apiStartTime = Date.now();
      console.log(`[Exa Executor] Making API call to Exa Search API`);
      
      try {
        const response = await fetch('https://api.exa.ai/search', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Exa API error (${response.status}): ${errorText}`);
        }

        const result = await response.json() as {
          requestId?: string;
          results?: Array<unknown>;
          [key: string]: unknown;
        };
        const apiDuration = Date.now() - apiStartTime;
        const resultCount = Array.isArray(result.results) ? result.results.length : 0;
        console.log(`[Exa Executor] Search completed in ${apiDuration}ms, found ${resultCount} results`);
        
        return result;
      } catch (apiError) {
        const apiDuration = Date.now() - apiStartTime;
        console.error(`[Exa Executor] API call failed after ${apiDuration}ms:`, apiError);
        if (apiError instanceof Error) {
          throw new Error(`Exa API error after ${apiDuration}ms: ${apiError.message}`);
        }
        throw apiError;
      }
    })();

    // Race between execution and timeout
    try {
      const result = await Promise.race([executePromise, timeoutPromise]);
      // Clear timeout if execution completes successfully
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const totalDuration = Date.now() - startTime;
      console.log(`[Exa Executor] Total execution time: ${totalDuration}ms`);
      return result;
    } catch (error) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      throw error;
    }
  } catch (error) {
    console.error('Exa search error:', error);
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw error;
      }
      if (error.message.includes('API key')) {
        throw new Error(`Exa API authentication error: ${error.message}. Please check your API key in the Config Panel or EXA_API_KEY environment variable.`);
      }
    }
    throw error;
  }
}

