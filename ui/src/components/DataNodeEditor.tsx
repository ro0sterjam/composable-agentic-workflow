import React, { useState, useEffect, useRef } from 'react';
import { NodeType } from '../types';

interface DataNodeEditorProps {
  nodeId: string;
  currentLabel?: string;
  currentValue: string | number | boolean | null | undefined;
  currentType: 'string' | 'number' | 'boolean' | 'null';
  onSave: (nodeId: string, value: string, type: 'string', label?: string) => void;
  onClose: () => void;
}

function DataNodeEditor({ nodeId, currentLabel, currentValue, currentType, onSave, onClose }: DataNodeEditorProps) {
  const [label, setLabel] = useState(currentLabel || '');
  // Always convert current value to string
  const [stringValue, setStringValue] = useState(
    String(currentValue !== undefined && currentValue !== null ? currentValue : '')
  );

  // Update state when props change (e.g., modal reopened)
  useEffect(() => {
    setLabel(currentLabel || '');
    // Always convert to string
    setStringValue(String(currentValue !== undefined && currentValue !== null ? currentValue : ''));
  }, [currentLabel, currentValue]);

  const handleSave = () => {
    // Always save as string
    onSave(nodeId, stringValue, 'string', label || undefined);
    onClose();
  };

  return (
    <>
      <div
        className="data-node-editor-overlay"
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
          className="data-node-editor"
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
            Edit Data Node
          </h2>

          <div style={{ marginBottom: '16px' }}>
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              Value
            </label>
            <input
              type="text"
              value={stringValue}
              onChange={(e) => setStringValue(e.target.value)}
              placeholder="Enter string value"
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

export default DataNodeEditor;

