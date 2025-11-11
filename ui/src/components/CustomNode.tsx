import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeType } from '../types';

interface CustomNodeData {
  label: string;
  nodeType: NodeType;
  id: string;
  value?: string | number | boolean | null | undefined;
  model?: string;
  structuredOutput?: {
    schema: Record<string, unknown>;
    mode?: 'json' | 'json_schema' | 'tool';
  };
  exaConfig?: {
    searchType?: 'auto' | 'neural' | 'keyword' | 'fast';
    includeDomains?: string[];
    excludeDomains?: string[];
    includeText?: string[];
    excludeText?: string[];
    category?: string;
    numResults?: number;
    text?: boolean;
    contents?: boolean | { numChars?: number };
    highlights?: boolean;
    summary?: boolean;
  };
  onDoubleClick?: (nodeId: string) => void;
  executionState?: 'idle' | 'running' | 'completed' | 'failed';
}

const nodeTypeColors: Record<NodeType, { bg: string; border: string; text: string }> = {
  [NodeType.LITERAL]: { bg: '#f3f4f6', border: '#6b7280', text: '#374151' },
  [NodeType.CONSOLE]: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
};

const nodeTypeIcons: Record<NodeType, string> = {
  [NodeType.LITERAL]: '📦',
  [NodeType.CONSOLE]: '📥',
};

function CustomNode({ data, selected }: NodeProps<CustomNodeData>) {
  const nodeType = data.nodeType as NodeType;
  const colors = nodeTypeColors[nodeType] || nodeTypeColors[NodeType.LITERAL];
  const icon = nodeTypeIcons[nodeType] || '⚙️';
  const executionState = data.executionState || 'idle';

  const handleDoubleClick = () => {
    if (data.onDoubleClick) {
      data.onDoubleClick(data.id);
    }
  };

  // Determine border color based on execution state
  let borderColor = selected ? '#10b981' : colors.border;
  if (executionState === 'failed') {
    borderColor = '#ef4444';
  } else if (executionState === 'running') {
    borderColor = '#3b82f6';
  } else if (executionState === 'completed') {
    borderColor = '#10b981';
  }

  // Determine background color based on execution state
  let backgroundColor = colors.bg;
  if (executionState === 'running') {
    backgroundColor = '#dbeafe'; // Light blue
  } else if (executionState === 'failed') {
    backgroundColor = '#fee2e2'; // Light red
  } else if (executionState === 'completed') {
    backgroundColor = '#d1fae5'; // Light green
  }

  return (
    <div
      className="custom-node"
      style={{
        backgroundColor,
        borderColor,
        borderWidth: executionState === 'running' || executionState === 'failed' ? '3px' : '2px',
        cursor: 'pointer',
        boxShadow: executionState === 'running' ? '0 0 10px rgba(59, 130, 246, 0.5)' : undefined,
      }}
      onDoubleClick={handleDoubleClick}
      title="Double-click to configure"
    >
      <div className="node-header">
        <span>{icon}</span>
        <span style={{ color: colors.text }}>{data.label}</span>
        <span className="node-type-badge" style={{ backgroundColor: colors.border, color: 'white' }}>
          {nodeType}
        </span>
      </div>
      
      {nodeType !== NodeType.LITERAL && (
        <>
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
        </>
      )}
      
      {nodeType !== NodeType.CONSOLE && (
        <>
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
        </>
      )}
      
      <div className="node-ports">
        {nodeType === NodeType.LITERAL && (
          <div className="port" style={{ marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
            <span className="port-label">
              Value: {data.value === null ? 'null' : data.value === undefined ? 'undefined' : String(data.value)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomNode;
