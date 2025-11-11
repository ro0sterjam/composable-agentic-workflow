import React from 'react';
import { NodeType } from '../types';

interface NodeTypeMenuProps {
  position: { x: number; y: number };
  onSelect: (nodeType: NodeType) => void;
  onClose: () => void;
  sourceNodeType?: string; // The node type of the source node being connected from
}

const nodeTypes = [
  { type: NodeType.LITERAL, label: 'Literal', icon: '📦' },
  { type: NodeType.SIMPLE_LLM, label: 'Simple LLM', icon: '🤖' },
  { type: NodeType.STRUCTURED_LLM, label: 'Structured LLM', icon: '🎯' },
  { type: NodeType.EXA_SEARCH, label: 'Exa Search', icon: '🔍' },
  { type: NodeType.DEDUPE, label: 'Dedupe', icon: '🔀' },
  { type: NodeType.CACHE, label: 'Cache', icon: '💾' },
  { type: NodeType.EXTRACT, label: 'Extract', icon: '📤' },
  { type: NodeType.FILTER, label: 'Filter', icon: '🔍' },
  { type: NodeType.MAP, label: 'Map', icon: '🗺️' },
  { type: NodeType.AGENT, label: 'Agent', icon: '🧠' },
  { type: NodeType.PEEK, label: 'Peek', icon: '👁️' },
  { type: NodeType.CONSOLE, label: 'Console', icon: '📥' },
];

/**
 * Determine the category of a node type (source, transformer, or terminal)
 */
function getNodeTypeCategory(nodeType: string): 'source' | 'transformer' | 'terminal' {
  // Sources: produce output, no input
  const sources = ['literal'];
  
  // Terminals: take input, produce no output
  const terminals = ['console'];
  
  // Transformers: take input, produce output (everything else)
  if (sources.includes(nodeType)) return 'source';
  if (terminals.includes(nodeType)) return 'terminal';
  return 'transformer';
}

function NodeTypeMenu({ position, onSelect, onClose, sourceNodeType }: NodeTypeMenuProps) {
  // Filter node types based on source node type
  const filteredNodeTypes = React.useMemo(() => {
    if (!sourceNodeType) {
      // If no source node type, show all (shouldn't happen, but be safe)
      return nodeTypes;
    }

    const sourceCategory = getNodeTypeCategory(sourceNodeType);
    
    // Terminal nodes cannot be sources (they don't produce output)
    // So if dragging from a terminal, show nothing (menu shouldn't appear anyway)
    if (sourceCategory === 'terminal') {
      return [];
    }

    // Source and transformer nodes can connect to transformers and terminals
    // But NOT to sources (sources don't accept input)
    return nodeTypes.filter(({ type }) => {
      const targetCategory = getNodeTypeCategory(type);
      return targetCategory !== 'source'; // Filter out sources
    });
  }, [sourceNodeType]);

  // Don't show menu if there are no valid options
  if (filteredNodeTypes.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className="node-type-menu-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
        }}
      />
      <div
        className="node-type-menu"
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 1001,
          background: '#2a2a2a',
          border: '1px solid #4a4a4a',
          borderRadius: '8px',
          padding: '8px',
          minWidth: '200px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', padding: '4px' }}>
          Create new node:
        </div>
        {filteredNodeTypes.map(({ type, label, icon }) => (
          <div
            key={type}
            className="node-type-menu-item"
            onClick={() => {
              onSelect(type);
              onClose();
            }}
            style={{
              padding: '10px 12px',
              cursor: 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'white',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#3a3a3a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ fontSize: '18px' }}>{icon}</span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default NodeTypeMenu;

