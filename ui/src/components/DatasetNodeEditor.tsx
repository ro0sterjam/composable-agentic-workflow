import React, { useState, useEffect } from 'react';

interface DatasetNodeEditorProps {
  nodeId: string;
  currentLabel?: string;
  currentValue?: string;
  onSave: (nodeId: string, value: string, label?: string) => void;
  onClose: () => void;
}

function DatasetNodeEditor({ nodeId, currentLabel, currentValue, onSave, onClose }: DatasetNodeEditorProps) {
  const [label, setLabel] = useState(currentLabel || '');
  const [jsonValue, setJsonValue] = useState(
    currentValue || '[]'
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Update state when props change
  useEffect(() => {
    setLabel(currentLabel || '');
    setJsonValue(currentValue || '[]');
  }, [currentLabel, currentValue]);

  // Validate JSON on change
  useEffect(() => {
    if (!jsonValue.trim()) {
      setJsonError(null);
      return;
    }

    try {
      const parsed = JSON.parse(jsonValue);
      if (!Array.isArray(parsed)) {
        setJsonError('Value must be a JSON array');
        return;
      }
      
      // Check if all elements are objects
      for (const item of parsed) {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          setJsonError('Array must contain only objects');
          return;
        }
      }
      
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }, [jsonValue]);

  const handleSave = () => {
    if (jsonError) {
      return; // Don't save if there's an error
    }

    // Ensure it's valid JSON array before saving
    try {
      const parsed = JSON.parse(jsonValue || '[]');
      if (!Array.isArray(parsed)) {
        return;
      }
      // Re-stringify to normalize formatting
      const normalized = JSON.stringify(parsed);
      onSave(nodeId, normalized, label || undefined);
      onClose();
    } catch {
      // Shouldn't happen due to validation, but just in case
      return;
    }
  };

  return (
    <>
      <div
        className="dataset-node-editor-overlay"
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
          className="dataset-node-editor"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#2a2a2a',
            border: '1px solid #4a4a4a',
            borderRadius: '12px',
            padding: '24px',
            minWidth: '500px',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            zIndex: 2001,
          }}
        >
          <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
            Edit Dataset Node
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
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              JSON Array of Objects
            </label>
            <textarea
              value={jsonValue}
              onChange={(e) => setJsonValue(e.target.value)}
              placeholder='[{"key": "value"}, {"key": "value"}]'
              rows={12}
              style={{
                width: '100%',
                padding: '10px',
                background: '#3a3a3a',
                border: jsonError ? '1px solid #ef4444' : '1px solid #4a4a4a',
                borderRadius: '6px',
                color: 'white',
                fontSize: '13px',
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
            />
            {jsonError && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
                {jsonError}
              </div>
            )}
            {!jsonError && jsonValue.trim() && (
              <div style={{ color: '#10b981', fontSize: '12px', marginTop: '8px' }}>
                ✓ Valid JSON array
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
              disabled={!!jsonError}
              style={{
                padding: '10px 20px',
                background: jsonError ? '#4a4a4a' : '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: jsonError ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: jsonError ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!jsonError) {
                  e.currentTarget.style.background = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!jsonError) {
                  e.currentTarget.style.background = '#3b82f6';
                }
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

export default DatasetNodeEditor;

