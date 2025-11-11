import type { NodeType } from '../../types';

import { TerminalNode } from './terminal';

/**
 * Transformer node - base class for all nodes that transform input to output
 * @template InputType - The type of input data this node accepts
 * @template OutputType - The type of output data this node produces
 */
export abstract class TransformerNode<InputType = any, OutputType = any> {
  id: string;
  type: NodeType;
  label?: string;

  constructor(id: string, type: NodeType, label?: string) {
    this.id = id;
    this.type = type;
    this.label = label || id;
  }

  /**
   * Execute the node with the given input
   * @param input - The input data for this node
   * @returns The output data, either synchronously or as a Promise
   */
  abstract execute(input: InputType): Promise<OutputType> | OutputType;

  /**
   * Compose this node with another transformer node sequentially
   * This method enables fluent chaining: node1.pipe(node2).pipe(node3)
   * @param next - The next transformer node to execute after this one
   * @returns A SequentialTransformerNode that composes this node and the next node
   */
  pipe<NewOutputType>(
    next: TransformerNode<OutputType, NewOutputType>
  ): TransformerNode<InputType, NewOutputType> {
    return new SequentialTransformerNode(this, next);
  }

  /**
   * Compose this node with a terminal node
   * The transformer executes first, then the terminal node consumes its output
   * @param terminal - The terminal node to execute after this transformer
   * @returns A SequentialTerminalNode that composes this transformer and the terminal node
   */
  terminate(terminal: TerminalNode<OutputType>): TerminalNode<InputType> {
    return new SequentialTerminalNode(this, terminal);
  }
}

/**
 * Sequential transformer node - composes two transformer nodes sequentially
 * The output of the first node becomes the input of the second node
 *
 * @template InputType - The input type of the first node (and this node)
 * @template IntermediateType - The output type of the first node (and input type of the second node)
 * @template OutputType - The output type of the second node (and this node)
 */
class SequentialTransformerNode<InputType, IntermediateType, OutputType> extends TransformerNode<
  InputType,
  OutputType
> {
  type: NodeType;
  first: TransformerNode<InputType, IntermediateType>;
  second: TransformerNode<IntermediateType, OutputType>;

  constructor(
    first: TransformerNode<InputType, IntermediateType>,
    second: TransformerNode<IntermediateType, OutputType>,
    type: NodeType = 'sequential',
    label?: string
  ) {
    const id = `${first.id}_pipe_${second.id}`;
    super(id, type, label);
    this.type = type;
    this.first = first;
    this.second = second;
  }

  async execute(input: InputType): Promise<OutputType> {
    // Execute first node (execute() may return Promise or value directly)
    const intermediate = await this.first.execute(input);

    // Execute second node with the intermediate result
    const output = await this.second.execute(intermediate);

    return output;
  }
}

/**
 * Sequential terminal node - composes a transformer node with a terminal node
 * The transformer executes first, then the terminal node consumes its output
 *
 * @template InputType - The input type of the transformer node (and this terminal node)
 * @template IntermediateType - The output type of the transformer node (and input type of the terminal node)
 */
class SequentialTerminalNode<InputType, IntermediateType> extends TerminalNode<InputType> {
  type: NodeType;
  transformer: TransformerNode<InputType, IntermediateType>;
  terminal: TerminalNode<IntermediateType>;

  constructor(
    transformer: TransformerNode<InputType, IntermediateType>,
    terminal: TerminalNode<IntermediateType>,
    type: NodeType = 'sequential_terminal',
    label?: string
  ) {
    const id = `${transformer.id}_pipe_${terminal.id}`;
    super(id, type, label);
    this.type = type;
    this.transformer = transformer;
    this.terminal = terminal;
  }

  async execute(input: InputType): Promise<void> {
    // Execute transformer node first
    const intermediate = await this.transformer.execute(input);

    // Execute terminal node with the intermediate result
    await this.terminal.execute(intermediate);
  }
}
