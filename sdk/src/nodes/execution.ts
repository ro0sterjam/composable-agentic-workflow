import type { TransformerNode, Port } from '../types';

/**
 * Execution node - takes input, produces output
 * This is a behavioral interface that execution nodes should implement
 * Note: execute is now defined in TransformerNode, so this interface just adds port definitions
 * @template InputType - The type of input data this node accepts
 * @template OutputType - The type of output data this node produces
 */
export interface ExecutionNode<InputType, OutputType> extends TransformerNode<InputType, OutputType> {
  inputPorts: Port[];
  outputPorts: Port[];
}
