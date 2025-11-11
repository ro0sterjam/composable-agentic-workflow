import React from 'react';
import { NodeType } from '../types';

interface SidebarProps {
  onNodeAdd: (nodeType: NodeType) => void;
}

const nodeTypes = [
  { type: NodeType.LITERAL, label: 'Literal', icon: '📦', description: 'Literal value (no input)' },
  { type: NodeType.SIMPLE_LLM, label: 'Simple LLM', icon: '🤖', description: 'Transform input using LLM' },
  { type: NodeType.STRUCTURED_LLM, label: 'Structured LLM', icon: '🎯', description: 'Generate structured output using LLM' },
  { type: NodeType.EXA_SEARCH, label: 'Exa Search', icon: '🔍', description: 'Search the web using Exa API' },
  { type: NodeType.DEDUPE, label: 'Dedupe', icon: '🔀', description: 'Remove duplicates from array' },
  { type: NodeType.CACHE, label: 'Cache', icon: '💾', description: 'Cache input in DAG context' },
  { type: NodeType.EXTRACT, label: 'Extract', icon: '📤', description: 'Extract property from input' },
  { type: NodeType.FILTER, label: 'Filter', icon: '🔍', description: 'Filter array items by expression' },
  { type: NodeType.MAP, label: 'Map', icon: '🗺️', description: 'Apply transformer to array elements' },
  { type: NodeType.FLATMAP, label: 'FlatMap', icon: '📋', description: 'Apply transformer and flatten results' },
  { type: NodeType.AGENT, label: 'Agent', icon: '🧠', description: 'AI agent with tool calling capabilities' },
  { type: NodeType.PEEK, label: 'Peek', icon: '👁️', description: 'Log input and forward unchanged' },
  { type: NodeType.CONSOLE, label: 'Console', icon: '📥', description: 'Logs input to console' },
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
