import React, { useState, useEffect } from 'react';

interface ExtractNodeEditorProps {
  nodeId: string;
  currentLabel?: string;
  currentConfig?: {
    property: string;
  };
  onSave: (label: string, config: { property: string }) => void;
  onClose: () => void;
}

function ExtractNodeEditor({
  nodeId,
  currentLabel,
  currentConfig,
  onSave,
  onClose,
}: ExtractNodeEditorProps) {
  const [label, setLabel] = useState(currentLabel || '');
  const [property, setProperty] = useState(currentConfig?.property || '');

  useEffect(() => {
    setLabel(currentLabel || '');
    setProperty(currentConfig?.property || '');
  }, [currentLabel, currentConfig]);

  const handleSave = () => {
    if (!property.trim()) {
      alert('Property path is required');
      return;
    }

    onSave(label, { property: property.trim() });
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
            Configure Extract Node
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
              Property Path <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={property}
              onChange={(e) => setProperty(e.target.value)}
              placeholder="e.g., url or results.items"
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
              The property path to extract from the input. Use dot notation (e.g., "user.id" or "data.results") for nested properties.
              <br />
              <br />
              If the property doesn't exist, the node will output <code style={{ background: '#1a1a1a', padding: '2px 4px', borderRadius: '3px' }}>undefined</code>.
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

export default ExtractNodeEditor;

