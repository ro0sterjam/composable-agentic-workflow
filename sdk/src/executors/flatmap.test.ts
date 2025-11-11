import { describe, it, expect, beforeEach } from 'vitest';

import type { ExecutorRegistry, TransformerExecutor, DAGContext } from './registry';
import { ExecutorRegistry as ExecutorRegistryClass } from './registry';
import { FlatMapTransformerExecutor } from './flatmap';
import type { FlatMapTransformerNodeConfig } from '../nodes/impl/flatmap';

/**
 * Mock transformer executor that outputs arrays and tracks execution order and timing
 */
class MockArrayTransformerExecutor
  implements TransformerExecutor<string, string[], Record<string, unknown>>
{
  public executionOrder: number[] = [];
  public concurrentExecutions: number = 0;
  public maxConcurrent: number = 0;
  private delay: number;
  private executionCounter: number = 0;

  constructor(delay: number = 50) {
    this.delay = delay;
  }

  async execute(
    input: string,
    config: Record<string, unknown>,
    dagContext: DAGContext
  ): Promise<string[]> {
    const executionId = ++this.executionCounter;
    this.executionOrder.push(executionId);
    this.concurrentExecutions++;
    this.maxConcurrent = Math.max(this.maxConcurrent, this.concurrentExecutions);

    // Simulate async work
    await new Promise((resolve) => setTimeout(resolve, this.delay));

    this.concurrentExecutions--;

    // Return an array with multiple items
    return [`transformed-${input}-1`, `transformed-${input}-2`];
  }

  reset(): void {
    this.executionOrder = [];
    this.concurrentExecutions = 0;
    this.maxConcurrent = 0;
    this.executionCounter = 0;
  }
}

describe('FlatMapTransformerExecutor', () => {
  let executorRegistry: ExecutorRegistry;
  let mockTransformer: MockArrayTransformerExecutor;

  beforeEach(() => {
    executorRegistry = new ExecutorRegistryClass();
    mockTransformer = new MockArrayTransformerExecutor(50); // 50ms delay per item
    executorRegistry.registerTransformer('mock_transformer', mockTransformer);
  });

  it('should execute transformations in parallel when parallel=true', async () => {
    const flatmapExecutor = new FlatMapTransformerExecutor<string, string>();
    const config: FlatMapTransformerNodeConfig = {
      parallel: true,
      transformerId: 'transformer1',
    };

    const dag = {
      nodes: [
        {
          id: 'transformer1',
          type: 'mock_transformer',
          label: 'transformer1',
        },
      ],
      edges: [],
    };

    const dagContext: DAGContext = {
      dag,
      executorRegistry,
      cache: {},
    };

    const input = ['item1', 'item2', 'item3', 'item4', 'item5'];
    mockTransformer.reset();

    const startTime = Date.now();
    const result = await flatmapExecutor.execute(input, config, dagContext);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify all items were processed and flattened
    // Each input produces 2 outputs, so 5 inputs = 10 outputs
    expect(result).toEqual([
      'transformed-item1-1',
      'transformed-item1-2',
      'transformed-item2-1',
      'transformed-item2-2',
      'transformed-item3-1',
      'transformed-item3-2',
      'transformed-item4-1',
      'transformed-item4-2',
      'transformed-item5-1',
      'transformed-item5-2',
    ]);

    // Verify parallel execution: should have multiple concurrent executions
    // With 5 items and 50ms delay each, sequential would take ~250ms
    // Parallel should take ~50-100ms (all start at once, finish around the same time)
    expect(duration).toBeLessThan(150); // Should be much faster than sequential

    // Verify that multiple executions happened concurrently
    expect(mockTransformer.maxConcurrent).toBeGreaterThan(1);
    // With 5 items, we should see at least 2 concurrent executions
    expect(mockTransformer.maxConcurrent).toBeGreaterThanOrEqual(2);
  });

  it('should execute transformations sequentially when parallel=false', async () => {
    const flatmapExecutor = new FlatMapTransformerExecutor<string, string>();
    const config: FlatMapTransformerNodeConfig = {
      parallel: false,
      transformerId: 'transformer1',
    };

    const dag = {
      nodes: [
        {
          id: 'transformer1',
          type: 'mock_transformer',
          label: 'transformer1',
        },
      ],
      edges: [],
    };

    const dagContext: DAGContext = {
      dag,
      executorRegistry,
      cache: {},
    };

    const input = ['item1', 'item2', 'item3'];
    mockTransformer.reset();

    const startTime = Date.now();
    const result = await flatmapExecutor.execute(input, config, dagContext);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify all items were processed and flattened
    expect(result).toEqual([
      'transformed-item1-1',
      'transformed-item1-2',
      'transformed-item2-1',
      'transformed-item2-2',
      'transformed-item3-1',
      'transformed-item3-2',
    ]);

    // Verify sequential execution: should take longer (3 * 50ms = ~150ms minimum)
    expect(duration).toBeGreaterThan(100);

    // Verify that executions were sequential (max concurrent should be 1)
    expect(mockTransformer.maxConcurrent).toBe(1);
  });

  it('should default to parallel=true when parallel is not specified', async () => {
    const flatmapExecutor = new FlatMapTransformerExecutor<string, string>();
    const config: FlatMapTransformerNodeConfig = {
      transformerId: 'transformer1',
      // parallel not specified, should default to true
    };

    const dag = {
      nodes: [
        {
          id: 'transformer1',
          type: 'mock_transformer',
          label: 'transformer1',
        },
      ],
      edges: [],
    };

    const dagContext: DAGContext = {
      dag,
      executorRegistry,
      cache: {},
    };

    const input = ['item1', 'item2', 'item3'];
    mockTransformer.reset();

    const startTime = Date.now();
    const result = await flatmapExecutor.execute(input, config, dagContext);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify all items were processed and flattened
    expect(result).toEqual([
      'transformed-item1-1',
      'transformed-item1-2',
      'transformed-item2-1',
      'transformed-item2-2',
      'transformed-item3-1',
      'transformed-item3-2',
    ]);

    // Verify parallel execution (should be fast)
    expect(duration).toBeLessThan(150);
    expect(mockTransformer.maxConcurrent).toBeGreaterThan(1);
  });

  it('should flatten arrays correctly when executing in parallel', async () => {
    const flatmapExecutor = new FlatMapTransformerExecutor<string, string>();
    const config: FlatMapTransformerNodeConfig = {
      parallel: true,
      transformerId: 'transformer1',
    };

    const dag = {
      nodes: [
        {
          id: 'transformer1',
          type: 'mock_transformer',
          label: 'transformer1',
        },
      ],
      edges: [],
    };

    const dagContext: DAGContext = {
      dag,
      executorRegistry,
      cache: {},
    };

    const input = ['a', 'b'];
    mockTransformer.reset();

    const result = await flatmapExecutor.execute(input, config, dagContext);

    // Verify that arrays are flattened (not nested)
    expect(result).toEqual(['transformed-a-1', 'transformed-a-2', 'transformed-b-1', 'transformed-b-2']);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(4); // 2 inputs * 2 outputs each = 4 total
  });
});

