import React, { useState, useEffect } from 'react';
import { NodeType } from '../types';
import DataNodeEditor from './DataNodeEditor';

interface NodeEditorProps {
  nodeId: string;
  nodeType: NodeType;
  currentLabel?: string;
  currentValue?: string | number | boolean | null | undefined;
  onSave: (config: NodeConfig) => void;
  onClose: () => void;
}

export interface NodeConfig {
  label?: string;
  value?: string | number | boolean | null | undefined;
}

function NodeEditor({
  nodeId,
  nodeType,
  currentLabel,
  currentValue,
  onSave,
  onClose,
}: NodeEditorProps) {
  const [label, setLabel] = useState(currentLabel || '');

  useEffect(() => {
    setLabel(currentLabel || '');
  }, [currentLabel]);

  const handleSave = () => {
    onSave({ label });
    onClose();
  };

  // Special editor for LITERAL nodes
  if (nodeType === NodeType.LITERAL) {
    let currentType: 'string' | 'number' | 'boolean' | 'null' = 'string';
    if (typeof currentValue === 'number') {
      currentType = 'number';
    } else if (typeof currentValue === 'boolean') {
      currentType = 'boolean';
    } else if (currentValue === null) {
      currentType = 'null';
    } else {
      currentType = 'string';
    }

    return (
      <DataNodeEditor
        nodeId={nodeId}
        currentLabel={currentLabel}
        currentValue={currentValue}
        currentType={currentType}
        onSave={(id, value, type, label) => {
          onSave({ label: label || undefined, value });
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  // Generic editor for other node types
  return (
    <>
      <div
        className="node-editor-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="node-editor"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#2a2a2a',
            border: '1px solid #4a4a4a',
            borderRadius: '12px',
            padding: '24px',
            minWidth: '400px',
            maxWidth: '500px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            zIndex: 2001,
          }}
        >
          <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
            Configure {nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace('_', ' ')} Node
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter node label"
              style={{
                width: '100%',
                padding: '10px',
                background: '#3a3a3a',
                border: '1px solid #4a4a4a',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
              }}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#3a3a3a',
                border: '1px solid #4a4a4a',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#4a4a4a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3a3a3a';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3b82f6';
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default NodeEditor;

