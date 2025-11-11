import { describe, it, expect } from 'vitest';

import { ConsoleTerminalNode } from '../nodes/impl/console';
import { LiteralSourceNode } from '../nodes/impl/literal';

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
});
