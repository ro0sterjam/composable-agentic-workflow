import { SourceNode } from '../types';

/**
 * Config type for DatasetSourceNode
 */
export interface DatasetSourceNodeConfig {
  value: unknown[]; // Array of objects
}

/**
 * Dataset source node - implementation of Source (outputs an array of objects)
 */
export class DatasetSourceNode extends SourceNode<unknown[], DatasetSourceNodeConfig> {
  type: 'dataset';

  constructor(id: string, config: DatasetSourceNodeConfig, label?: string) {
    super(id, 'dataset', config, label);
    this.type = 'dataset';
  }
}
