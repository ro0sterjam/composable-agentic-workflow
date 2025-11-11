import React from 'react';
import { NodeType } from '../../../sdk/src/types';

interface SidebarProps {
  onNodeAdd: (nodeType: NodeType) => void;
}

const nodeTypes = [
  { type: NodeType.CONDITIONAL, label: 'Conditional', icon: '❓', description: 'Branch logic' },
  { type: NodeType.LOOP, label: 'Loop', icon: '🔁', description: 'Iterate sub-DAG' },
  { type: NodeType.FAN_OUT, label: 'Fan Out', icon: '🔀', description: 'Duplicate input' },
  { type: NodeType.AGGREGATOR, label: 'Aggregator', icon: '📊', description: 'Combine inputs' },
  { type: NodeType.LITERAL, label: 'Literal', icon: '📦', description: 'Literal value (no input)' },
  { type: NodeType.CONSOLE, label: 'Console', icon: '📥', description: 'Logs input to console' },
  { type: NodeType.LLM, label: 'LLM', icon: '🤖', description: 'LLM execution' },
  { type: NodeType.EXA_SEARCH, label: 'Exa Search', icon: '🔍', description: 'Web search via Exa' },
];

function Sidebar({ onNodeAdd }: SidebarProps) {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="sidebar">
      <h2>Node Palette</h2>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>
        Drag nodes to canvas or click to add at center
      </p>
      <div className="node-palette">
        {nodeTypes.map(({ type, label, icon, description }) => (
          <div
            key={type}
            className="node-type-button"
            draggable
            onDragStart={(e) => onDragStart(e, type)}
            onClick={() => onNodeAdd(type)}
          >
            <span className="node-icon">{icon}</span>
            <div>
              <div style={{ fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                {description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
