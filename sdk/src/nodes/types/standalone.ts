import type { NodeType } from '../../types';

/**
 * Standalone node - takes no input and produces no output (pure side effect)
 * This is an abstract class that standalone nodes should extend
 */
export abstract class StandAloneNode {
  id: string;
  type: NodeType;
  label?: string;

  constructor(id: string, type: NodeType, label?: string) {
    this.id = id;
    this.type = type;
    this.label = label || id;
  }

  /**
   * Execute the standalone node (no input, no output)
   * @returns void (standalone nodes don't produce output)
   */
  abstract execute(): Promise<void> | void;
}

