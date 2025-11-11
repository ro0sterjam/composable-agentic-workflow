import type { NodeType } from '../../types';

import { TerminalNode } from './terminal';

/**
 * Transformer node - base class for all nodes that transform input to output
 * @template InputType - The type of input data this node accepts
 * @template OutputType - The type of output data this node produces
 * @template ConfigType - The type of configuration for this node
 */
export abstract class TransformerNode<InputType, OutputType, ConfigType> {
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
   * Compose this node with another transformer node sequentially
   * This method enables fluent chaining: node1.pipe(node2).pipe(node3)
   * @param next - The next transformer node to execute after this one
   * @returns A SequentialTransformerNode that composes this node and the next node
   */
  pipe<NewOutputType, NewConfigType>(
    next: TransformerNode<OutputType, NewOutputType, NewConfigType>
  ): TransformerNode<InputType, NewOutputType, { first: ConfigType; second: NewConfigType }> {
    return new SequentialTransformerNode(this, next);
  }

  /**
   * Compose this node with a terminal node
   * The transformer executes first, then the terminal node consumes its output
   * @param terminal - The terminal node to execute after this transformer
   * @returns A SequentialTerminalNode that composes this transformer and the terminal node
   */
  terminate<NewConfigType>(
    terminal: TerminalNode<OutputType, NewConfigType>
  ): TerminalNode<InputType, { transformer: ConfigType; terminal: NewConfigType }> {
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
 * @template FirstConfigType - The config type of the first transformer node
 * @template SecondConfigType - The config type of the second transformer node
 */
class SequentialTransformerNode<
  InputType,
  IntermediateType,
  OutputType,
  FirstConfigType,
  SecondConfigType,
> extends TransformerNode<
  InputType,
  OutputType,
  { first: FirstConfigType; second: SecondConfigType }
> {
  type: NodeType;
  first: TransformerNode<InputType, IntermediateType, FirstConfigType>;
  second: TransformerNode<IntermediateType, OutputType, SecondConfigType>;

  constructor(
    first: TransformerNode<InputType, IntermediateType, FirstConfigType>,
    second: TransformerNode<IntermediateType, OutputType, SecondConfigType>,
    config?: { first: FirstConfigType; second: SecondConfigType },
    type: NodeType = 'sequential',
    label?: string
  ) {
    const id = `${first.id}_pipe_${second.id}`;
    super(id, type, config, label);
    this.type = type;
    this.first = first;
    this.second = second;
  }
}

/**
 * Sequential terminal node - composes a transformer node with a terminal node
 * The transformer executes first, then the terminal node consumes its output
 *
 * @template InputType - The input type of the transformer node (and this terminal node)
 * @template IntermediateType - The output type of the transformer node (and input type of the terminal node)
 * @template TransformerConfigType - The config type of the transformer node
 * @template TerminalConfigType - The config type of the terminal node
 */
class SequentialTerminalNode<
  InputType,
  IntermediateType,
  TransformerConfigType,
  TerminalConfigType,
> extends TerminalNode<
  InputType,
  { transformer: TransformerConfigType; terminal: TerminalConfigType }
> {
  type: NodeType;
  transformer: TransformerNode<InputType, IntermediateType, TransformerConfigType>;
  terminal: TerminalNode<IntermediateType, TerminalConfigType>;

  constructor(
    transformer: TransformerNode<InputType, IntermediateType, TransformerConfigType>,
    terminal: TerminalNode<IntermediateType, TerminalConfigType>,
    config?: { transformer: TransformerConfigType; terminal: TerminalConfigType },
    type: NodeType = 'sequential_terminal',
    label?: string
  ) {
    const id = `${transformer.id}_pipe_${terminal.id}`;
    super(id, type, config, label);
    this.type = type;
    this.transformer = transformer;
    this.terminal = terminal;
  }
}
