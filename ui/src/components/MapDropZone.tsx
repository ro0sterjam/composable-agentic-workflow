import React, { useState } from 'react';

interface MapDropZoneProps {
  mapNodeId: string;
  mapConfig?: {
    transformerId?: string;
    parallel?: boolean;
  };
}

function MapDropZone({ mapNodeId, mapConfig }: MapDropZoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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

    const draggedNodeId = e.dataTransfer.getData('application/node-id');
    if (draggedNodeId && draggedNodeId !== mapNodeId) {
      // Trigger a custom event to notify App.tsx to update the map config
      const event = new CustomEvent('mapTransformerDrop', {
        detail: { mapNodeId, transformerNodeId: draggedNodeId },
      });
      window.dispatchEvent(event);
    }
  };

  return (
    <div
      className="port"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        marginTop: '8px',
        padding: '8px',
        minHeight: '60px',
        border: isDraggingOver
          ? '2px dashed #3b82f6'
          : mapConfig?.transformerId
            ? '2px solid #38b2ac'
            : '2px dashed #9ca3af',
        borderRadius: '6px',
        background: isDraggingOver ? '#1e3a5f' : mapConfig?.transformerId ? '#e6fffa' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        cursor: 'default',
      }}
    >
      {mapConfig?.transformerId ? (
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#234e52' }}>
          <div style={{ fontWeight: 500, marginBottom: '2px' }}>✓ Transformer</div>
          <div style={{ fontSize: '10px', color: '#6b7280' }}>{mapConfig.transformerId}</div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af' }}>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>📥</div>
          <div>Drag transformer here</div>
        </div>
      )}
    </div>
  );
}

export default MapDropZone;
