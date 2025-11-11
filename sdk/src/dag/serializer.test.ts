import { describe, it, expect } from 'vitest';

import { ConsoleTerminalNode } from '../nodes/impl/console';
import { LiteralSourceNode } from '../nodes/impl/literal';
import { SimpleLLMTransformerNode } from '../nodes/impl/llm';
import { MapTransformerNode } from '../nodes/impl/map';
import { PeekTransformerNode } from '../nodes/impl/peek';

import { serializeStandAloneNode } from './serializer';

describe('serializeStandAloneNode', () => {
  it('should serialize a LiteralSourceNode terminated with ConsoleTerminalNode', () => {
    const source = new LiteralSourceNode('source1', { value: 'Hello, world!' });
    const terminal = new ConsoleTerminalNode('terminal1');
    const standalone = source.terminate(terminal);

    const result = serializeStandAloneNode(standalone);

    // Validate JSON structure
    expect(result).toEqual({
      nodes: [
        {
          id: 'source1',
          type: 'literal',
          label: 'source1',
          config: { value: 'Hello, world!' },
        },
        {
          id: 'terminal1',
          type: 'console',
          label: 'terminal1',
        },
      ],
      edges: [
        {
          from: 'source1',
          to: 'terminal1',
        },
      ],
    });
  });

  it('should serialize nested sequential nodes (source.pipe(llm).terminate(terminal))', () => {
    const source = new LiteralSourceNode('start', { value: 'Hi there' });
    const llm = new SimpleLLMTransformerNode('llm', { model: 'openai/gpt-5' });
    const terminal = new ConsoleTerminalNode('end');
    const standalone = source.pipe(llm).terminate(terminal);

    const result = serializeStandAloneNode(standalone);

    // Validate JSON structure - should flatten nested sequential nodes
    expect(result).toEqual({
      nodes: [
        {
          id: 'start',
          type: 'literal',
          label: 'start',
          config: { value: 'Hi there' },
        },
        {
          id: 'llm',
          type: 'simple_llm',
          label: 'llm',
          config: { model: 'openai/gpt-5' },
        },
        {
          id: 'end',
          type: 'console',
          label: 'end',
        },
      ],
      edges: [
        {
          from: 'start',
          to: 'llm',
        },
        {
          from: 'llm',
          to: 'end',
        },
      ],
    });
  });

  it('should serialize a MapTransformerNode with nested transformer', () => {
    const transformer = new SimpleLLMTransformerNode('llm', { model: 'openai/gpt-5' });
    const mapNode = new MapTransformerNode('map1', transformer, { parallel: true });

    // MapTransformerNode needs to be part of a pipeline to be serialized as StandAloneNode
    // So we'll create a source -> map -> terminal chain
    const source = new LiteralSourceNode('source1', { value: 'item1' });
    const terminal = new ConsoleTerminalNode('terminal1');
    const standalone = source.pipe(mapNode).terminate(terminal);

    const result = serializeStandAloneNode(standalone);

    // Validate entire JSON structure
    expect(result).toEqual({
      nodes: [
        {
          id: 'source1',
          type: 'literal',
          label: 'source1',
          config: { value: 'item1' },
        },
        {
          id: 'llm',
          type: 'simple_llm',
          label: 'llm',
          config: { model: 'openai/gpt-5' },
        },
        {
          id: 'map1',
          type: 'map',
          label: 'map1',
          config: {
            parallel: true,
            transformerId: 'llm',
          },
        },
        {
          id: 'terminal1',
          type: 'console',
          label: 'terminal1',
        },
      ],
      edges: [
        {
          from: 'source1',
          to: 'map1',
        },
        {
          from: 'map1',
          to: 'terminal1',
        },
      ],
    });
  });

  it('should serialize a MapTransformerNode with default parallel=true', () => {
    const transformer = new SimpleLLMTransformerNode('llm', { model: 'openai/gpt-5' });
    const mapNode = new MapTransformerNode('map1', transformer); // No config, should default to parallel: true

    const source = new LiteralSourceNode('source1', { value: 'item1' });
    const terminal = new ConsoleTerminalNode('terminal1');
    const standalone = source.pipe(mapNode).terminate(terminal);

    const result = serializeStandAloneNode(standalone);

    // Validate entire JSON structure
    expect(result).toEqual({
      nodes: [
        {
          id: 'source1',
          type: 'literal',
          label: 'source1',
          config: { value: 'item1' },
        },
        {
          id: 'llm',
          type: 'simple_llm',
          label: 'llm',
          config: { model: 'openai/gpt-5' },
        },
        {
          id: 'map1',
          type: 'map',
          label: 'map1',
          config: {
            parallel: true,
            transformerId: 'llm',
          },
        },
        {
          id: 'terminal1',
          type: 'console',
          label: 'terminal1',
        },
      ],
      edges: [
        {
          from: 'source1',
          to: 'map1',
        },
        {
          from: 'map1',
          to: 'terminal1',
        },
      ],
    });
  });

  it('should serialize a MapTransformerNode with parallel=false', () => {
    const transformer = new SimpleLLMTransformerNode('llm', { model: 'openai/gpt-5' });
    const mapNode = new MapTransformerNode('map1', transformer, { parallel: false });

    const source = new LiteralSourceNode('source1', { value: 'item1' });
    const terminal = new ConsoleTerminalNode('terminal1');
    const standalone = source.pipe(mapNode).terminate(terminal);

    const result = serializeStandAloneNode(standalone);

    // Validate entire JSON structure
    expect(result).toEqual({
      nodes: [
        {
          id: 'source1',
          type: 'literal',
          label: 'source1',
          config: { value: 'item1' },
        },
        {
          id: 'llm',
          type: 'simple_llm',
          label: 'llm',
          config: { model: 'openai/gpt-5' },
        },
        {
          id: 'map1',
          type: 'map',
          label: 'map1',
          config: {
            parallel: false,
            transformerId: 'llm',
          },
        },
        {
          id: 'terminal1',
          type: 'console',
          label: 'terminal1',
        },
      ],
      edges: [
        {
          from: 'source1',
          to: 'map1',
        },
        {
          from: 'map1',
          to: 'terminal1',
        },
      ],
    });
  });

  it('should serialize a MapTransformerNode with a MapTransformerNode as nested transformer', () => {
    // Create an inner map transformer
    const innerTransformer = new SimpleLLMTransformerNode('inner-llm', { model: 'openai/gpt-5' });
    const innerMap = new MapTransformerNode('inner-map', innerTransformer);

    // Create an outer map that uses the inner map as its transformer
    const outerMap = new MapTransformerNode('outer-map', innerMap);

    const source = new LiteralSourceNode('source1', { value: 'item1' });
    const terminal = new ConsoleTerminalNode('terminal1');
    const standalone = source.pipe(outerMap).terminate(terminal);

    const result = serializeStandAloneNode(standalone);

    // Validate entire JSON structure
    expect(result).toEqual({
      nodes: [
        {
          id: 'source1',
          type: 'literal',
          label: 'source1',
          config: { value: 'item1' },
        },
        {
          id: 'inner-llm',
          type: 'simple_llm',
          label: 'inner-llm',
          config: { model: 'openai/gpt-5' },
        },
        {
          id: 'inner-map',
          type: 'map',
          label: 'inner-map',
          config: {
            parallel: true,
            transformerId: 'inner-llm',
          },
        },
        {
          id: 'outer-map',
          type: 'map',
          label: 'outer-map',
          config: {
            parallel: true,
            transformerId: 'inner-map',
          },
        },
        {
          id: 'terminal1',
          type: 'console',
          label: 'terminal1',
        },
      ],
      edges: [
        {
          from: 'source1',
          to: 'outer-map',
        },
        {
          from: 'outer-map',
          to: 'terminal1',
        },
      ],
    });
  });

  it('should reject a MapTransformerNode with a chained transformer (peek -> llm) at runtime', () => {
    // Create a chained transformer: peek -> llm
    const peek = new PeekTransformerNode('peek1', { label: 'Debug' });
    const llm = new SimpleLLMTransformerNode('llm', { model: 'openai/gpt-5' });
    const chainedTransformer = peek.pipe(llm);

    // MapTransformerNode should reject SequentialTransformerNode at runtime
    // Using type assertion to bypass compile-time check and test runtime validation
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new MapTransformerNode('map1', chainedTransformer as any, { parallel: true });
    }).toThrow('MapTransformerNode cannot accept a SequentialTransformerNode');
  });
});
