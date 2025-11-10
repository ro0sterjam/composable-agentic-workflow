import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeType } from '../../../sdk/src/types';

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
  onDoubleClick?: (nodeId: string) => void;
  executionState?: 'idle' | 'running' | 'completed' | 'failed';
}

const nodeTypeColors: Record<NodeType, { bg: string; border: string; text: string }> = {
  [NodeType.CONDITIONAL]: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  [NodeType.LOOP]: { bg: '#e9d5ff', border: '#a855f7', text: '#6b21a8' },
  [NodeType.FAN_OUT]: { bg: '#fce7f3', border: '#ec4899', text: '#9f1239' },
  [NodeType.AGGREGATOR]: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  [NodeType.LITERAL]: { bg: '#f3f4f6', border: '#6b7280', text: '#374151' },
  [NodeType.CONSOLE]: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  [NodeType.LLM]: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
};

const nodeTypeIcons: Record<NodeType, string> = {
  [NodeType.CONDITIONAL]: '❓',
  [NodeType.LOOP]: '🔁',
  [NodeType.FAN_OUT]: '🔀',
  [NodeType.AGGREGATOR]: '📊',
  [NodeType.LITERAL]: '📦',
  [NodeType.CONSOLE]: '📥',
  [NodeType.LLM]: '🤖',
};

function CustomNode({ data, selected }: NodeProps<CustomNodeData>) {
  const nodeType = data.nodeType as NodeType;
  const colors = nodeTypeColors[nodeType] || nodeTypeColors[NodeType.CONDITIONAL];
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
        {nodeType === NodeType.LLM && (
          <div className="port" style={{ marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
            <span className="port-label">Model: {data.model || 'openai/gpt-5'}</span>
            {data.structuredOutput && (
              <span className="port-label" style={{ display: 'block', marginTop: '2px' }}>
                Structured: {data.structuredOutput.mode || 'json'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomNode;
