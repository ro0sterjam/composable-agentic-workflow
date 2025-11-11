import type { BaseNode, Port } from '../types';

/**
 * Execution node - takes input, produces output
 * This is a behavioral interface that execution nodes should implement
 */
export interface ExecutionNode extends BaseNode {
  inputPorts: Port[];
  outputPorts: Port[];
  execute: (input: unknown, config?: unknown) => Promise<unknown> | unknown;
}
