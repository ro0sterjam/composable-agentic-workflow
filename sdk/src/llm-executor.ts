import { openai } from '@ai-sdk/openai';
import { generateText, generateObject } from 'ai';
import type { StructuredOutputConfig } from './nodes/llm';
import type { DAGConfig } from './dag-config';

/**
 * Execute LLM node with Vercel AI SDK
 */
export async function executeLLMNode(
  input: unknown,
  model: string,
  structuredOutput?: StructuredOutputConfig,
  config?: DAGConfig
): Promise<unknown> {
  // Get API key from config or environment (only in Node.js)
  const getApiKey = (): string | undefined => {
    if (config?.secrets?.openaiApiKey) {
      return config.secrets.openaiApiKey;
    }
    // Only access process.env in Node.js environment
    // Check if we're in a browser by checking for window object
    const isBrowser = typeof (globalThis as { window?: unknown }).window !== 'undefined';
    if (!isBrowser && typeof process !== 'undefined' && process.env) {
      return process.env.OPENAI_API_KEY;
    }
    return undefined;
  };

  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please provide it in DAG config (via Config Panel) or set OPENAI_API_KEY environment variable.');
  }

  // Create OpenAI provider with API key
  // @ai-sdk/openai reads from OPENAI_API_KEY env var by default
  // For browser compatibility, we need to handle this differently
  const isBrowser = typeof (globalThis as { window?: unknown }).window !== 'undefined';
  
  // In Node.js, set process.env if not already set
  let originalEnvKey: string | undefined;
  if (!isBrowser && typeof process !== 'undefined' && process.env) {
    originalEnvKey = process.env.OPENAI_API_KEY;
    if (!process.env.OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = apiKey;
    }
  } else if (isBrowser) {
    // In browser, we need to use a different approach
    // The @ai-sdk/openai library expects process.env.OPENAI_API_KEY
    // We'll create a global process object if it doesn't exist
    if (typeof (globalThis as any).process === 'undefined') {
      (globalThis as any).process = { env: {} };
    }
    (globalThis as any).process.env.OPENAI_API_KEY = apiKey;
  }

  // Convert input to string prompt if needed
  const prompt = typeof input === 'string' ? input : JSON.stringify(input);

  // Get timeout from config (default 60 seconds for GPT-5 which can be slower)
  // Simple calls should complete in 1-5 seconds, but we allow more time for complex requests
  const timeout = config?.runtime?.timeout || 60000;

  // For Vercel AI Gateway models (e.g., "openai/gpt-5"), we need to strip the prefix
  // because openai.chat() expects just the model name (e.g., "gpt-5")
  // The Vercel AI SDK will route through AI Gateway automatically when configured
  // However, if the model doesn't have a prefix, use it as-is (for direct OpenAI API calls)
  const modelName = model.startsWith('openai/') ? model.substring(7) : model;

  // Log execution start (for debugging)
  const startTime = Date.now();
  console.log(`[LLM Executor] Starting execution with model: ${modelName}, timeout: ${timeout}ms`);

  try {
    // Create OpenAI instance - it will read from process.env.OPENAI_API_KEY
    const openaiProvider = openai;
    
    // Create a promise that will timeout
    const executePromise = (async () => {
      const apiStartTime = Date.now();
      console.log(`[LLM Executor] Making API call with model: ${modelName}, prompt length: ${prompt.length} chars`);
      try {
        if (structuredOutput) {
          // Map json_schema to json (Vercel AI SDK doesn't support json_schema mode)
          const mode = structuredOutput.mode === 'json_schema' ? 'json' : (structuredOutput.mode || 'json');
          // Use structured output
          const result = await generateObject({
            model: openaiProvider.chat(modelName),
            prompt,
            schema: structuredOutput.schema as any, // Vercel AI SDK accepts JSON Schema or Zod schema
            mode: mode as 'json' | 'tool' | 'auto',
          });
          const apiDuration = Date.now() - apiStartTime;
          console.log(`[LLM Executor] Structured output received in ${apiDuration}ms`);
          return result.object;
        } else {
          // Regular text generation
          const result = await generateText({
            model: openaiProvider.chat(modelName),
            prompt,
          });
          const apiDuration = Date.now() - apiStartTime;
          console.log(`[LLM Executor] Text generation completed in ${apiDuration}ms, response length: ${result.text.length} chars`);
          return result.text;
        }
      } catch (apiError) {
        const apiDuration = Date.now() - apiStartTime;
        console.error(`[LLM Executor] API call failed after ${apiDuration}ms:`, apiError);
        // Re-throw with more context
        if (apiError instanceof Error) {
          throw new Error(`LLM API error after ${apiDuration}ms: ${apiError.message}`);
        }
        throw apiError;
      }
    })();

    // Add timeout with cleanup
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        const elapsed = Date.now() - startTime;
        reject(new Error(`LLM execution timed out after ${elapsed}ms (timeout: ${timeout}ms). Model: ${modelName}. This might indicate network issues, API Gateway latency, or the model taking longer than expected.`));
      }, timeout);
    });

    // Race between execution and timeout
    try {
      const result = await Promise.race([executePromise, timeoutPromise]);
      // Clear timeout if execution completes successfully
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const totalDuration = Date.now() - startTime;
      console.log(`[LLM Executor] Total execution time: ${totalDuration}ms`);
      return result;
    } catch (error) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      throw error;
    }
  } catch (error) {
    console.error('LLM execution error:', error);
    // Provide more helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw error;
      }
      if (error.message.includes('model')) {
        throw new Error(`LLM model error: ${error.message}. Please check if model "${model}" is valid and your API key has access to it.`);
      }
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        throw new Error(`OpenAI API authentication error: ${error.message}. Please check your API key in the Config Panel.`);
      }
    }
    throw error;
  } finally {
    // Clean up: restore original env key in Node.js
    if (!isBrowser && typeof process !== 'undefined' && process.env) {
      if (originalEnvKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = originalEnvKey;
      }
    }
  }
}

