import { describe, it, expect, beforeEach } from 'vitest';

import { executeDAGFromNode } from '../dag/executor';
import type { ExecutorRegistry, TransformerExecutor, DAGContext } from './registry';
import { ExecutorRegistry as ExecutorRegistryClass } from './registry';
import { MapTransformerExecutor } from './map';
import type { MapTransformerNodeConfig } from '../nodes/impl/map';

/**
 * Mock transformer executor that tracks execution order and timing
 */
class MockTransformerExecutor implements TransformerExecutor<string, string, Record<string, unknown>> {
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
  ): Promise<string> {
    const executionId = ++this.executionCounter;
    this.executionOrder.push(executionId);
    this.concurrentExecutions++;
    this.maxConcurrent = Math.max(this.maxConcurrent, this.concurrentExecutions);

    // Simulate async work
    await new Promise((resolve) => setTimeout(resolve, this.delay));

    this.concurrentExecutions--;

    return `transformed-${input}`;
  }

  reset(): void {
    this.executionOrder = [];
    this.concurrentExecutions = 0;
    this.maxConcurrent = 0;
    this.executionCounter = 0;
  }
}

describe('MapTransformerExecutor', () => {
  let executorRegistry: ExecutorRegistry;
  let mockTransformer: MockTransformerExecutor;

  beforeEach(() => {
    executorRegistry = new ExecutorRegistryClass();
    mockTransformer = new MockTransformerExecutor(50); // 50ms delay per item
    executorRegistry.registerTransformer('mock_transformer', mockTransformer);
  });

  it('should execute transformations in parallel when parallel=true', async () => {
    const mapExecutor = new MapTransformerExecutor<string, string>();
    const config: MapTransformerNodeConfig = {
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
    const result = await mapExecutor.execute(input, config, dagContext);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify all items were processed
    expect(result).toEqual([
      'transformed-item1',
      'transformed-item2',
      'transformed-item3',
      'transformed-item4',
      'transformed-item5',
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
    const mapExecutor = new MapTransformerExecutor<string, string>();
    const config: MapTransformerNodeConfig = {
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
    const result = await mapExecutor.execute(input, config, dagContext);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify all items were processed
    expect(result).toEqual(['transformed-item1', 'transformed-item2', 'transformed-item3']);

    // Verify sequential execution: should take longer (3 * 50ms = ~150ms minimum)
    expect(duration).toBeGreaterThan(100);

    // Verify that executions were sequential (max concurrent should be 1)
    expect(mockTransformer.maxConcurrent).toBe(1);
  });

  it('should default to parallel=true when parallel is not specified', async () => {
    const mapExecutor = new MapTransformerExecutor<string, string>();
    const config: MapTransformerNodeConfig = {
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
    const result = await mapExecutor.execute(input, config, dagContext);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify all items were processed
    expect(result).toEqual(['transformed-item1', 'transformed-item2', 'transformed-item3']);

    // Verify parallel execution (should be fast)
    expect(duration).toBeLessThan(150);
    expect(mockTransformer.maxConcurrent).toBeGreaterThan(1);
  });
});

