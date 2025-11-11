import React, { useState, useEffect } from 'react';

type DedupeMethod = 'first' | 'last' | 'most frequent';

interface DedupeNodeEditorProps {
  nodeId: string;
  currentLabel?: string;
  currentConfig?: {
    byProperty?: string;
    method?: DedupeMethod;
  };
  onSave: (label: string, config: { byProperty?: string; method?: DedupeMethod }) => void;
  onClose: () => void;
}

function DedupeNodeEditor({
  nodeId,
  currentLabel,
  currentConfig,
  onSave,
  onClose,
}: DedupeNodeEditorProps) {
  const [label, setLabel] = useState(currentLabel || '');
  const [byProperty, setByProperty] = useState(currentConfig?.byProperty || '');
  const [method, setMethod] = useState<DedupeMethod>(currentConfig?.method || 'first');

  useEffect(() => {
    setLabel(currentLabel || '');
    setByProperty(currentConfig?.byProperty || '');
    setMethod(currentConfig?.method || 'first');
  }, [currentLabel, currentConfig]);

  const handleSave = () => {
    const config: { byProperty?: string; method?: DedupeMethod } = {
      method: method || 'first',
    };

    if (byProperty.trim()) {
      config.byProperty = byProperty.trim();
    }

    onSave(label, config);
    onClose();
  };

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
            minWidth: '500px',
            maxWidth: '600px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            zIndex: 2001,
          }}
        >
          <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
            Configure Dedupe Node
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              By Property (optional, use dot notation for nested properties)
            </label>
            <input
              type="text"
              value={byProperty}
              onChange={(e) => setByProperty(e.target.value)}
              placeholder="e.g., id or user.id"
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
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>
              Leave empty to dedupe by value. Use dot notation (e.g., "user.id") for nested properties.
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as DedupeMethod)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#3a3a3a',
                border: '1px solid #4a4a4a',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
              }}
            >
              <option value="first">First (keep first occurrence)</option>
              <option value="last">Last (keep last occurrence)</option>
              <option value="most frequent">Most Frequent (keep most common item)</option>
            </select>
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>
              When duplicates are found, which item to keep.
            </div>
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

export default DedupeNodeEditor;

