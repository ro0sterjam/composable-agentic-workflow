import type { NodeType } from '../../types';

import { StandAloneNode } from './standalone';
import type { TerminalNode } from './terminal';
import type { TransformerNode } from './transformer';

/**
 * Source node - outputs a value (no input)
 * This is an abstract class that source nodes should extend
 * Implementation: LiteralSourceNode (type: 'literal')
 * @template OutputType - The type of output data
 */
export abstract class SourceNode<OutputType> {
  id: string;
  type: NodeType;
  label?: string;

  constructor(id: string, type: NodeType, label?: string) {
    this.id = id;
    this.type = type;
    this.label = label || id;
  }

  /**
   * Execute the source node (no input required)
   * @returns The output data, either synchronously or as a Promise
   */
  abstract execute(): Promise<OutputType> | OutputType;

  /**
   * Compose this source node with a transformer node
   * The source node executes first (no input), then the transformer processes its output
   * @param transformer - The transformer node to execute after this source
   * @returns A SequentialSourceNode that composes this source and the transformer
   */
  pipe<NewOutputType>(
    transformer: TransformerNode<OutputType, NewOutputType>
  ): SourceNode<NewOutputType> {
    return new SequentialSourceNode(this, transformer);
  }

  /**
   * Compose this source node with a terminal node
   * The source node executes first (no input), then the terminal node consumes its output
   * @param terminal - The terminal node to execute after this source
   * @returns A SequentialSourceTerminalNode that composes this source and the terminal
   */
  terminate(terminal: TerminalNode<OutputType>): StandAloneNode {
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
class SequentialSourceNode<IntermediateType, OutputType> extends SourceNode<OutputType> {
  type: NodeType;
  source: SourceNode<IntermediateType>;
  transformer: TransformerNode<IntermediateType, OutputType>;

  constructor(
    source: SourceNode<IntermediateType>,
    transformer: TransformerNode<IntermediateType, OutputType>,
    type: NodeType = 'sequential_source',
    label?: string
  ) {
    const id = `${source.id}_pipe_${transformer.id}`;
    super(id, type, label);
    this.type = type;
    this.source = source;
    this.transformer = transformer;
  }

  async execute(): Promise<OutputType> {
    // Execute source node (no input needed)
    const intermediate = await this.source.execute();

    // Execute transformer with the intermediate result
    return await this.transformer.execute(intermediate);
  }
}

/**
 * Sequential source-terminal node - composes a source node with a terminal node
 * The source node executes first (no input), then the terminal node consumes its output
 * This creates a standalone node that takes no input and produces no output
 *
 * @template OutputType - The output type of the source node (and input type of the terminal)
 */
class SequentialSourceTerminalNode<OutputType> extends StandAloneNode {
  type: NodeType;
  source: SourceNode<OutputType>;
  terminal: TerminalNode<OutputType>;

  constructor(
    source: SourceNode<OutputType>,
    terminal: TerminalNode<OutputType>,
    type: NodeType = 'sequential_source_terminal',
    label?: string
  ) {
    const id = `${source.id}_terminate_${terminal.id}`;
    super(id, type, label);
    this.type = type;
    this.source = source;
    this.terminal = terminal;
  }

  async execute(): Promise<void> {
    // Execute source node (no input needed)
    const output = await this.source.execute();

    // Execute terminal node with the output
    await this.terminal.execute(output);
  }
}
