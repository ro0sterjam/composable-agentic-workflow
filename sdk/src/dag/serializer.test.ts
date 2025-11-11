import { describe, it, expect } from 'vitest';

import { ConsoleTerminalNode } from '../nodes/impl/console';
import { LiteralSourceNode } from '../nodes/impl/literal';
import { SimpleLLMTransformerNode } from '../nodes/impl/llm';

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
});
