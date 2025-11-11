import React from 'react';
import { NodeType } from '../types';

interface NodeTypeMenuProps {
  position: { x: number; y: number };
  onSelect: (nodeType: NodeType) => void;
  onClose: () => void;
}

const nodeTypes = [
  { type: NodeType.LITERAL, label: 'Literal', icon: '📦' },
  { type: NodeType.CONSOLE, label: 'Console', icon: '📥' },
];

function NodeTypeMenu({ position, onSelect, onClose }: NodeTypeMenuProps) {
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
        {nodeTypes.map(({ type, label, icon }) => (
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

