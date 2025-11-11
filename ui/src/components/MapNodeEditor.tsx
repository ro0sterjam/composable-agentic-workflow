import React, { useState, useEffect } from 'react';

interface MapNodeEditorProps {
  nodeId: string;
  currentLabel?: string;
  currentConfig?: {
    transformerId?: string;
    parallel?: boolean;
  };
  availableTransformers: Array<{ id: string; label: string; type: string }>;
  onSave: (
    label: string,
    config: { transformerId?: string; parallel: boolean }
  ) => void;
  onClose: () => void;
}

function MapNodeEditor({
  nodeId,
  currentLabel,
  currentConfig,
  availableTransformers,
  onSave,
  onClose,
}: MapNodeEditorProps) {
  const [label, setLabel] = useState(currentLabel || '');
  const [transformerId, setTransformerId] = useState(currentConfig?.transformerId || '');
  const [parallel, setParallel] = useState(currentConfig?.parallel ?? true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    setLabel(currentLabel || '');
    setTransformerId(currentConfig?.transformerId || '');
    setParallel(currentConfig?.parallel ?? true);
  }, [currentLabel, currentConfig]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    // Try to get the node ID from the drag data
    // ReactFlow uses 'application/reactflow' for node types, but we need the actual node ID
    // We'll use a custom data transfer type for dragging existing nodes
    const draggedNodeId = e.dataTransfer.getData('application/node-id') || 
                          e.dataTransfer.getData('text/plain');
    
    if (draggedNodeId && draggedNodeId !== nodeId) {
      // Check if the dragged node is a transformer (not a source or terminal)
      const draggedNode = availableTransformers.find((t) => t.id === draggedNodeId);
      if (draggedNode) {
        setTransformerId(draggedNodeId);
      }
    }
  };

  const handleSave = () => {
    if (!transformerId) {
      alert('Please select or drag a transformer node into the map');
      return;
    }
    onSave(label, { transformerId, parallel });
    onClose();
  };

  const selectedTransformer = availableTransformers.find((t) => t.id === transformerId);

  return (
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
          Configure Map Node
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
            Transformer Node
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              minHeight: '120px',
              padding: '16px',
              background: isDraggingOver ? '#3a3a3a' : '#1a1a1a',
              border: isDraggingOver
                ? '2px dashed #3b82f6'
                : transformerId
                  ? '2px solid #38b2ac'
                  : '2px dashed #4a4a4a',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
          >
            {transformerId && selectedTransformer ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#38b2ac',
                }}
              >
                <span style={{ fontSize: '24px' }}>✓</span>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                    {selectedTransformer.label}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {selectedTransformer.type}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTransformerId('');
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📥</div>
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                  {isDraggingOver ? 'Drop transformer here' : 'Drag a transformer node here'}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Or select from dropdown below
                </div>
              </div>
            )}
          </div>

          {availableTransformers.length > 0 && (
            <select
              value={transformerId}
              onChange={(e) => setTransformerId(e.target.value)}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '10px',
                background: '#3a3a3a',
                border: '1px solid #4a4a4a',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
              }}
            >
              <option value="">Select a transformer...</option>
              {availableTransformers.map((transformer) => (
                <option key={transformer.id} value={transformer.id}>
                  {transformer.label} ({transformer.type})
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#9ca3af',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={parallel}
              onChange={(e) => setParallel(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Run in parallel</span>
          </label>
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
  );
}

export default MapNodeEditor;

