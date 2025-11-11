import React, { useState, useEffect } from 'react';
import { NodeType } from '../types';
import DataNodeEditor from './DataNodeEditor';
import LLMNodeEditor from './LLMNodeEditor';
import StructuredLLMNodeEditor from './StructuredLLMNodeEditor';

interface NodeEditorProps {
  nodeId: string;
  nodeType: NodeType;
  currentLabel?: string;
  currentValue?: string | number | boolean | null | undefined;
  currentLLMConfig?: {
    model?: 'openai/gpt-5';
    system?: string;
    prompt?: string;
  };
  currentStructuredLLMConfig?: {
    model?: 'openai/gpt-5';
    schema?: string;
    prompt?: string;
  };
  currentMapConfig?: {
    transformerId?: string;
    parallel?: boolean;
  };
  availableTransformers?: Array<{ id: string; label: string; type: string }>;
  onSave: (config: NodeConfig) => void;
  onClose: () => void;
}

export interface NodeConfig {
  label?: string;
  value?: string | number | boolean | null | undefined;
  llmConfig?: {
    model?: 'openai/gpt-5';
    system?: string;
    prompt?: string;
  };
  structuredLLMConfig?: {
    model?: 'openai/gpt-5';
    schema?: string;
    prompt?: string;
  };
  mapConfig?: {
    transformerId?: string;
    parallel?: boolean;
  };
}

function NodeEditor({
  nodeId,
  nodeType,
  currentLabel,
  currentValue,
  currentLLMConfig,
  currentStructuredLLMConfig,
  currentMapConfig,
  availableTransformers = [],
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

  // Special editor for SIMPLE_LLM nodes
  if (nodeType === NodeType.SIMPLE_LLM) {
    return (
      <LLMNodeEditor
        nodeId={nodeId}
        currentLabel={currentLabel}
        currentConfig={currentLLMConfig}
        onSave={(label, config) => {
          onSave({ label, llmConfig: config });
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  // Special editor for STRUCTURED_LLM nodes
  if (nodeType === NodeType.STRUCTURED_LLM) {
    return (
      <StructuredLLMNodeEditor
        nodeId={nodeId}
        currentLabel={currentLabel}
        currentConfig={currentStructuredLLMConfig}
        onSave={(label, config) => {
          onSave({ label, structuredLLMConfig: config });
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  // Special editor for MAP nodes - just label and parallel toggle
  if (nodeType === NodeType.MAP) {
    const [parallel, setParallel] = useState(currentMapConfig?.parallel ?? true);

    useEffect(() => {
      setParallel(currentMapConfig?.parallel ?? true);
    }, [currentMapConfig]);

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

            <div style={{ marginBottom: '20px', padding: '12px', background: '#1a1a1a', borderRadius: '6px' }}>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>
                Transformer Configuration
              </div>
              <div style={{ color: '#6b7280', fontSize: '11px' }}>
                Drag a transformer node (Simple LLM, Structured LLM, or Peek) directly onto this map node in the graph
                to configure it.
              </div>
              {currentMapConfig?.transformerId && (
                <div style={{ marginTop: '8px', color: '#38b2ac', fontSize: '12px' }}>
                  ✓ Configured: {currentMapConfig.transformerId}
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
                onClick={() => {
                  onSave({ label, mapConfig: { ...currentMapConfig, parallel } });
                  onClose();
                }}
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

