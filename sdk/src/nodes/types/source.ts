import type { NodeType } from '../../types';

import { StandAloneNode } from './standalone';
import type { TerminalNode } from './terminal';
import type { TransformerNode } from './transformer';

/**
 * Source node - outputs a value (no input)
 * This is an abstract class that source nodes should extend
 * Implementation: LiteralSourceNode (type: 'literal')
 * @template OutputType - The type of output data
 * @template ConfigType - The type of configuration for this node
 */
export abstract class SourceNode<OutputType, ConfigType = unknown> {
  id: string;
  type: NodeType;
  label?: string;
  config?: ConfigType;

  constructor(id: string, type: NodeType, config?: ConfigType, label?: string) {
    this.id = id;
    this.type = type;
    this.config = config;
    this.label = label || id;
  }

  /**
   * Compose this source node with a transformer node
   * The source node executes first (no input), then the transformer processes its output
   * @param transformer - The transformer node to execute after this source
   * @returns A SequentialSourceNode that composes this source and the transformer
   */
  pipe<NewOutputType, NewConfigType = unknown>(
    transformer: TransformerNode<OutputType, NewOutputType, NewConfigType>
  ): SourceNode<NewOutputType, unknown> {
    return new SequentialSourceNode(this, transformer);
  }

  /**
   * Compose this source node with a terminal node
   * The source node executes first (no input), then the terminal node consumes its output
   * @param terminal - The terminal node to execute after this source
   * @returns A SequentialSourceTerminalNode that composes this source and the terminal
   */
  terminate<NewConfigType = unknown>(
    terminal: TerminalNode<OutputType, NewConfigType>
  ): StandAloneNode<unknown> {
    return new SequentialSourceTerminalNode(this, terminal);
  }
}

/**
 * Sequential source node - composes a source node with a transformer node
 * The source node executes first (no input), then the transformer processes its output
 * This creates a new source-like node that outputs the transformer's result
 *
 * @template IntermediateType - The output type of the source node (and input type of the transformer)
 * @template OutputType - The output type of the transformer node (and this node)
 */
class SequentialSourceNode<IntermediateType, OutputType> extends SourceNode<
  OutputType,
  unknown
> {
  type: NodeType;
  source: SourceNode<IntermediateType, unknown>;
  transformer: TransformerNode<IntermediateType, OutputType, unknown>;

  constructor(
    source: SourceNode<IntermediateType, unknown>,
    transformer: TransformerNode<IntermediateType, OutputType, unknown>,
    type: NodeType = 'sequential_source',
    label?: string
  ) {
    const id = `${source.id}_pipe_${transformer.id}`;
    super(id, type, undefined, label);
    this.type = type;
    this.source = source;
    this.transformer = transformer;
  }
}

/**
 * Sequential source-terminal node - composes a source node with a terminal node
 * The source node executes first (no input), then the terminal node consumes its output
 * This creates a standalone node that takes no input and produces no output
 *
 * @template OutputType - The output type of the source node (and input type of the terminal)
 */
class SequentialSourceTerminalNode<OutputType> extends StandAloneNode<unknown> {
  type: NodeType;
  source: SourceNode<OutputType, unknown>;
  terminal: TerminalNode<OutputType, unknown>;

  constructor(
    source: SourceNode<OutputType, unknown>,
    terminal: TerminalNode<OutputType, unknown>,
    type: NodeType = 'sequential_source_terminal',
    label?: string
  ) {
    const id = `${source.id}_terminate_${terminal.id}`;
    super(id, type, undefined, label);
    this.type = type;
    this.source = source;
    this.terminal = terminal;
  }
}
