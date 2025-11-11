import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeType } from '../types';
import MapDropZone from './MapDropZone';

interface CustomNodeData {
  label: string;
  nodeType: NodeType;
  id: string;
  value?: string | number | boolean | null | undefined;
  llmConfig?: {
    model?: 'openai/gpt-5';
    system?: string;
    prompt?: string;
  };
  structuredLLMConfig?: {
    model?: 'openai/gpt-5';
    schema?: string; // JSON Schema as string
    prompt?: string;
  };
  mapConfig?: {
    transformerId?: string;
    parallel?: boolean;
  };
  onDoubleClick?: (nodeId: string) => void;
  executionState?: 'idle' | 'running' | 'completed' | 'failed';
}

const nodeTypeColors: Record<NodeType, { bg: string; border: string; text: string }> = {
  [NodeType.LITERAL]: { bg: '#f3f4f6', border: '#6b7280', text: '#374151' },
  [NodeType.SIMPLE_LLM]: { bg: '#e0e7ff', border: '#6366f1', text: '#312e81' },
  [NodeType.STRUCTURED_LLM]: { bg: '#fce7f3', border: '#ec4899', text: '#831843' },
  [NodeType.MAP]: { bg: '#e6fffa', border: '#38b2ac', text: '#234e52' },
  [NodeType.PEEK]: { bg: '#f0f9ff', border: '#0ea5e9', text: '#0c4a6e' },
  [NodeType.CONSOLE]: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
};

const nodeTypeIcons: Record<NodeType, string> = {
  [NodeType.LITERAL]: '📦',
  [NodeType.SIMPLE_LLM]: '🤖',
  [NodeType.STRUCTURED_LLM]: '🎯',
  [NodeType.MAP]: '🗺️',
  [NodeType.PEEK]: '👁️',
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

  // Make transformer nodes draggable (for dragging into map nodes)
  const transformerTypes: NodeType[] = [
    NodeType.SIMPLE_LLM,
    NodeType.STRUCTURED_LLM,
    NodeType.PEEK,
  ];
  const isTransformer = transformerTypes.includes(nodeType);

  const handleDragStart = (e: React.DragEvent) => {
    // Only handle drag if it's from the drag handle or its children
    // This allows normal ReactFlow dragging for the node, but special drag for the gear icon
    if (isTransformer) {
      const target = e.target as HTMLElement;
      const dragHandle = target.closest('.transformer-drag-handle');
      if (dragHandle) {
        // Store the node ID for the drop handler
        e.dataTransfer.setData('application/node-id', data.id);
        e.dataTransfer.effectAllowed = 'copy';
        // Stop propagation to prevent ReactFlow from dragging the node when dragging the gear icon
        e.stopPropagation();
      }
    }
  };

  return (
    <div
      className="custom-node"
      style={{
        backgroundColor,
        borderColor,
        borderWidth: executionState === 'running' || executionState === 'failed' ? '3px' : '2px',
        cursor: isTransformer ? 'grab' : 'pointer',
        boxShadow: executionState === 'running' ? '0 0 10px rgba(59, 130, 246, 0.5)' : undefined,
      }}
      onDoubleClick={handleDoubleClick}
      title={isTransformer ? 'Use gear icon to drag to map node or double-click to configure' : 'Double-click to configure'}
    >
      <div className="node-header">
        <span>{icon}</span>
        <span style={{ color: colors.text }}>{data.label}</span>
        <span className="node-type-badge" style={{ backgroundColor: colors.border, color: 'white' }}>
          {nodeType}
        </span>
        {isTransformer && (
          <span
            className="transformer-drag-handle"
            draggable
            onDragStart={handleDragStart}
            style={{
              marginLeft: 'auto',
              cursor: 'grab',
              fontSize: '14px',
              padding: '2px 4px',
              borderRadius: '4px',
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6',
              userSelect: 'none',
            }}
            title="Drag to map node to configure"
          >
            ⚙️
          </span>
        )}
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
        {nodeType === NodeType.MAP && <MapDropZone mapNodeId={data.id} mapConfig={data.mapConfig} />}
      </div>
    </div>
  );
}

export default CustomNode;
