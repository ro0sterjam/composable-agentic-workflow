import React, { useState, useEffect, useRef } from 'react';
import { NodeType } from '../types';

interface DataNodeEditorProps {
  nodeId: string;
  currentLabel?: string;
  currentValue: string | number | boolean | null | undefined;
  currentType: 'string' | 'number' | 'boolean' | 'null';
  onSave: (nodeId: string, value: string | number | boolean | null | undefined, type: 'string' | 'number' | 'boolean' | 'null', label?: string) => void;
  onClose: () => void;
}

function DataNodeEditor({ nodeId, currentLabel, currentValue, currentType, onSave, onClose }: DataNodeEditorProps) {
  const [label, setLabel] = useState(currentLabel || '');
  const [valueType, setValueType] = useState<'string' | 'number' | 'boolean' | 'null'>(currentType);
  const [stringValue, setStringValue] = useState(
    currentType === 'string' ? String(currentValue !== undefined && currentValue !== null ? currentValue : '') : ''
  );
  const [numberValue, setNumberValue] = useState(
    currentType === 'number' ? (typeof currentValue === 'number' ? currentValue : 0) : 0
  );
  const [booleanValue, setBooleanValue] = useState(
    currentType === 'boolean' ? (typeof currentValue === 'boolean' ? currentValue : false) : false
  );
  const previousValueTypeRef = useRef(valueType);

  // Update state when props change (e.g., modal reopened)
  useEffect(() => {
    setLabel(currentLabel || '');
    setValueType(currentType);
    
    if (currentType === 'string') {
      setStringValue(String(currentValue !== undefined && currentValue !== null ? currentValue : ''));
    } else if (currentType === 'number') {
      setNumberValue(typeof currentValue === 'number' ? currentValue : 0);
    } else if (currentType === 'boolean') {
      setBooleanValue(typeof currentValue === 'boolean' ? currentValue : false);
    }
    previousValueTypeRef.current = currentType;
  }, [currentLabel, currentValue, currentType]);

  useEffect(() => {
    // Only reset values when user manually changes type (not on initial mount or prop update)
    if (previousValueTypeRef.current !== valueType && previousValueTypeRef.current !== undefined) {
      if (valueType === 'string') {
        setStringValue('');
      } else if (valueType === 'number') {
        setNumberValue(0);
      } else if (valueType === 'boolean') {
        setBooleanValue(false);
      }
    }
    previousValueTypeRef.current = valueType;
  }, [valueType]);

  const handleSave = () => {
    let finalValue: string | number | boolean | null | undefined;
    
    switch (valueType) {
      case 'string':
        finalValue = stringValue;
        break;
      case 'number':
        finalValue = numberValue;
        break;
      case 'boolean':
        finalValue = booleanValue;
        break;
      case 'null':
        finalValue = null;
        break;
    }
    
    onSave(nodeId, finalValue, valueType, label || undefined);
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

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              Value Type
            </label>
            <select
              value={valueType}
              onChange={(e) => setValueType(e.target.value as 'string' | 'number' | 'boolean' | 'null')}
              style={{
                width: '100%',
                padding: '10px',
                background: '#3a3a3a',
                border: '1px solid #4a4a4a',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="null">Null</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              Value
            </label>
            {valueType === 'string' && (
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
            )}
            {valueType === 'number' && (
              <input
                type="number"
                value={numberValue}
                onChange={(e) => setNumberValue(parseFloat(e.target.value) || 0)}
                placeholder="Enter number value"
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
            )}
            {valueType === 'boolean' && (
              <select
                value={String(booleanValue)}
                onChange={(e) => setBooleanValue(e.target.value === 'true')}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#3a3a3a',
                  border: '1px solid #4a4a4a',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
                autoFocus
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            )}
            {valueType === 'null' && (
              <div
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#3a3a3a',
                  border: '1px solid #4a4a4a',
                  borderRadius: '6px',
                  color: '#9ca3af',
                  fontSize: '14px',
                }}
              >
                null
              </div>
            )}
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

