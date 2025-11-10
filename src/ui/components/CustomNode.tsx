import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeType } from '../../types/node';

interface CustomNodeData {
  label: string;
  nodeType: NodeType;
  id: string;
}

const nodeTypeColors: Record<NodeType, { bg: string; border: string; text: string }> = {
  [NodeType.EXECUTION]: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  [NodeType.CONDITIONAL]: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  [NodeType.LOOP]: { bg: '#e9d5ff', border: '#a855f7', text: '#6b21a8' },
  [NodeType.FAN_OUT]: { bg: '#fce7f3', border: '#ec4899', text: '#9f1239' },
  [NodeType.AGGREGATOR]: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
};

const nodeTypeIcons: Record<NodeType, string> = {
  [NodeType.EXECUTION]: '⚙️',
  [NodeType.CONDITIONAL]: '❓',
  [NodeType.LOOP]: '🔁',
  [NodeType.FAN_OUT]: '🔀',
  [NodeType.AGGREGATOR]: '📊',
};

function CustomNode({ data, selected }: NodeProps<CustomNodeData>) {
  const nodeType = data.nodeType as NodeType;
  const colors = nodeTypeColors[nodeType] || nodeTypeColors[NodeType.EXECUTION];
  const icon = nodeTypeIcons[nodeType] || '⚙️';

  return (
    <div
      className="custom-node"
      style={{
        backgroundColor: colors.bg,
        borderColor: selected ? '#10b981' : colors.border,
      }}
    >
      <div className="node-header">
        <span>{icon}</span>
        <span style={{ color: colors.text }}>{data.label}</span>
        <span className="node-type-badge" style={{ backgroundColor: colors.border, color: 'white' }}>
          {nodeType}
        </span>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ background: colors.border }}
      />
      
      <div className="node-ports">
        <div className="port">
          <div className="port-handle input" />
          <span className="port-label">Input</span>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: colors.border }}
      />
      
      <div className="node-ports">
        <div className="port">
          <span className="port-label">Output</span>
          <div className="port-handle output" />
        </div>
      </div>
    </div>
  );
}

export default CustomNode;

