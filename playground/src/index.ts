import dotenv from 'dotenv';
import { z } from 'zod';

import { CacheExecutor } from '../../sdk/src/executors/cache';
import { ConsoleTerminalExecutor } from '../../sdk/src/executors/console';
import { DedupeExecutor } from '../../sdk/src/executors/dedupe';
import { ExaSearchExecutor } from '../../sdk/src/executors/exa-search';
import { ExtractExecutor } from '../../sdk/src/executors/extract';
import { FilterExecutor } from '../../sdk/src/executors/filter';
import { FlatMapTransformerExecutor } from '../../sdk/src/executors/flatmap';
import { LiteralSourceExecutor } from '../../sdk/src/executors/literal';
import { SimpleLLMExecutor } from '../../sdk/src/executors/llm';
import { MapTransformerExecutor } from '../../sdk/src/executors/map';
import { PeekTransformerExecutor } from '../../sdk/src/executors/peek';
import { StructuredLLMExecutor } from '../../sdk/src/executors/structured-llm';
import {
  LiteralSourceNode,
  ConsoleTerminalNode,
  serializeStandAloneNode,
  executeDAG,
  defaultExecutorRegistry,
  StructuredLLMTransformerNode,
  MapTransformerNode,
  FlatMapTransformerNode,
  PeekTransformerNode,
  ExaSearchTransformerNode,
  DedupeTransformerNode,
  CacheTransformerNode,
  ExtractTransformerNode,
  FilterTransformerNode,
} from '../../sdk/src/index';

// Load environment variables
dotenv.config();

/**
 * Truncate output if it's too long
 */
function truncateOutput(output: unknown, maxLength: number = 500): unknown {
  if (output === undefined || output === null) {
    return output;
  }

  try {
    const stringified = JSON.stringify(output, null, 2);
    if (stringified.length <= maxLength) {
      return output;
    }
    // Truncate and add indicator
    const truncated = stringified.substring(0, maxLength);
    return `${truncated}... (truncated, ${stringified.length} chars total)`;
  } catch {
    // If stringification fails, convert to string and truncate
    const stringRep = String(output);
    if (stringRep.length <= maxLength) {
      return output;
    }
    return `${stringRep.substring(0, maxLength)}... (truncated, ${stringRep.length} chars total)`;
  }
}

/**
 * Playground for testing the DAG SDK
 */

async function main() {
  console.log('Playground starting...\n');

  // Register executors
  defaultExecutorRegistry.registerSource('literal', new LiteralSourceExecutor());
  defaultExecutorRegistry.registerTerminal('console', new ConsoleTerminalExecutor());
  defaultExecutorRegistry.registerTransformer('simple_llm', new SimpleLLMExecutor());
  defaultExecutorRegistry.registerTransformer('structured_llm', new StructuredLLMExecutor());
  defaultExecutorRegistry.registerTransformer('exa_search', new ExaSearchExecutor());
  defaultExecutorRegistry.registerTransformer('dedupe', new DedupeExecutor());
  defaultExecutorRegistry.registerTransformer('cache', new CacheExecutor());
  defaultExecutorRegistry.registerTransformer('extract', new ExtractExecutor());
  defaultExecutorRegistry.registerTransformer('filter', new FilterExecutor());
  defaultExecutorRegistry.registerTransformer('peek', new PeekTransformerExecutor());
  defaultExecutorRegistry.registerTransformer('map', new MapTransformerExecutor());
  defaultExecutorRegistry.registerTransformer('flatmap', new FlatMapTransformerExecutor());

  // Create a simple DAG: literal source -> LLM transformer -> console terminal
  const standalone = new LiteralSourceNode('start', { value: 'Best movies of 2025' })
    .pipe(new CacheTransformerNode('cacheQuery', { property: 'query' }))
    .pipe(
      new StructuredLLMTransformerNode('generateVariants', {
        model: 'openai/gpt-4o-mini',
        prompt: 'Generate 5 variants of the following query: ${input}',
        schema: z.array(z.string()),
      })
    )
    .pipe(new FlatMapTransformerNode('search', new ExaSearchTransformerNode('exa_search')))
    .pipe(new DedupeTransformerNode('dedupe', { byProperty: 'url' }))
    .pipe(
      new MapTransformerNode(
        'mapText',
        new ExtractTransformerNode('extract', { property: 'text' }).pipe(
          new StructuredLLMTransformerNode('summary', {
            model: 'openai/gpt-4o-mini',
            schema: z.string(),
            prompt:
              'From the original query: "${dagContext.cache.query}", answer the query based on the following text: \n\n```\n${input}\n```\n\n. If the text doesn\'t help answer the query, return "No answer found".',
          })
        )
      )
    )
    .pipe(new FilterTransformerNode('filter', { expression: 'input !== "No answer found"' }))
    .terminate(new ConsoleTerminalNode('end'));

  console.log('DAG created:', standalone.id);

  // Serialize the DAG
  console.log('\n--- Serializing DAG ---');
  const serializedDAG = serializeStandAloneNode(standalone);
  console.log('Serialized DAG:', JSON.stringify(serializedDAG, null, 2));

  // Execute the serialized DAG
  console.log('\n--- Executing Serialized DAG ---');
  const result = await executeDAG(serializedDAG, {
    onNodeComplete: (nodeId, nodeResult) => {
      if (nodeResult.error) {
        console.error(`Node ${nodeId} failed:`, nodeResult.error.message);
      } else {
        const truncatedOutput = truncateOutput(nodeResult.output);
        console.log(`Node ${nodeId} completed with output:`, truncatedOutput);
      }
    },
  });

  console.log('\n--- Execution Result ---');
  console.log('Success:', result.success);
  console.log(
    'Results:',
    Array.from(result.results.entries()).map(([id, r]) => ({
      nodeId: id,
      output: truncateOutput(r.output),
      error: r.error?.message,
    }))
  );
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
