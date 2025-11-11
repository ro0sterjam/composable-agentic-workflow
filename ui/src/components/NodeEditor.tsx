import React, { useState, useEffect } from 'react';
import { NodeType } from '../types';
import DataNodeEditor from './DataNodeEditor';
import LLMNodeEditor from './LLMNodeEditor';
import StructuredLLMNodeEditor from './StructuredLLMNodeEditor';
import ExaSearchNodeEditor from './ExaSearchNodeEditor';
import DedupeNodeEditor from './DedupeNodeEditor';
import CacheNodeEditor from './CacheNodeEditor';
import ExtractNodeEditor from './ExtractNodeEditor';

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
  currentExaSearchConfig?: {
    type?: 'auto' | 'fast' | 'neural';
    numResults?: number;
    includeDomains?: string[];
    excludeDomains?: string[];
    includeText?: string[];
    excludeText?: string[];
    category?:
      | 'company'
      | 'research paper'
      | 'news'
      | 'pdf'
      | 'github'
      | 'tweet'
      | 'personal site'
      | 'linkedin profile'
      | 'financial report';
  };
  currentDedupeConfig?: {
    byProperty?: string;
    method?: 'first' | 'last' | 'most frequent';
  };
  currentCacheConfig?: {
    property: string;
  };
  currentExtractConfig?: {
    property: string;
  };
  currentMapConfig?: {
    transformerId?: string;
    parallel?: boolean;
  };
  currentFlatmapConfig?: {
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
    transformerLabel?: string;
    parallel?: boolean;
  };
  flatmapConfig?: {
    transformerId?: string;
    transformerLabel?: string;
    parallel?: boolean;
  };
  exaSearchConfig?: {
    type?: 'auto' | 'fast' | 'neural';
    numResults?: number;
    includeDomains?: string[];
    excludeDomains?: string[];
    includeText?: string[];
    excludeText?: string[];
    category?:
      | 'company'
      | 'research paper'
      | 'news'
      | 'pdf'
      | 'github'
      | 'tweet'
      | 'personal site'
      | 'linkedin profile'
      | 'financial report';
  };
  dedupeConfig?: {
    byProperty?: string;
    method?: 'first' | 'last' | 'most frequent';
  };
  cacheConfig?: {
    property: string;
  };
  extractConfig?: {
    property: string;
  };
}

function NodeEditor({
  nodeId,
  nodeType,
  currentLabel,
  currentValue,
  currentLLMConfig,
  currentStructuredLLMConfig,
  currentExaSearchConfig,
  currentDedupeConfig,
  currentCacheConfig,
  currentExtractConfig,
  currentMapConfig,
  currentFlatmapConfig,
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

  // Special editor for EXA_SEARCH nodes
  if (nodeType === NodeType.EXA_SEARCH) {
    return (
      <ExaSearchNodeEditor
        nodeId={nodeId}
        currentLabel={currentLabel}
        currentConfig={currentExaSearchConfig}
        onSave={(label, config) => {
          onSave({ label, exaSearchConfig: config });
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  // Special editor for DEDUPE nodes
  if (nodeType === NodeType.DEDUPE) {
    return (
      <DedupeNodeEditor
        nodeId={nodeId}
        currentLabel={currentLabel}
        currentConfig={currentDedupeConfig}
        onSave={(label, config) => {
          onSave({ label, dedupeConfig: config });
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  // Special editor for CACHE nodes
  if (nodeType === NodeType.CACHE) {
    return (
      <CacheNodeEditor
        nodeId={nodeId}
        currentLabel={currentLabel}
        currentConfig={currentCacheConfig}
        onSave={(label, config) => {
          onSave({ label, cacheConfig: config });
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  // Special editor for EXTRACT nodes
  if (nodeType === NodeType.EXTRACT) {
    return (
      <ExtractNodeEditor
        nodeId={nodeId}
        currentLabel={currentLabel}
        currentConfig={currentExtractConfig}
        onSave={(label, config) => {
          onSave({ label, extractConfig: config });
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  // Special editor for MAP nodes
  if (nodeType === NodeType.MAP) {
    const [parallel, setParallel] = useState(currentMapConfig?.parallel ?? true);
    const [transformerId, setTransformerId] = useState(currentMapConfig?.transformerId || '');

    useEffect(() => {
      setParallel(currentMapConfig?.parallel ?? true);
      setTransformerId(currentMapConfig?.transformerId || '');
    }, [currentMapConfig]);

    const selectedTransformer = availableTransformers.find((t) => t.id === transformerId);

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
              <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
                Transformer Node
              </label>
              {availableTransformers.length > 0 ? (
                <select
                  value={transformerId}
                  onChange={(e) => setTransformerId(e.target.value)}
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
                  <option value="">Select a transformer...</option>
                  {availableTransformers.map((transformer) => (
                    <option key={transformer.id} value={transformer.id}>
                      {transformer.label} ({transformer.type})
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '6px', color: '#6b7280', fontSize: '12px' }}>
                  No transformer nodes available. Add a Simple LLM, Structured LLM, or Peek node to the graph first.
                </div>
              )}
              {selectedTransformer && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#1a1a1a', borderRadius: '6px', fontSize: '12px', color: '#38b2ac' }}>
                  ✓ Selected: {selectedTransformer.label} ({selectedTransformer.type})
                </div>
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
                onClick={() => {
                  const selectedTransformer = availableTransformers.find((t) => t.id === transformerId);
                  onSave({ 
                    label, 
                    mapConfig: { 
                      transformerId, 
                      transformerLabel: selectedTransformer?.label,
                      parallel 
                    } 
                  });
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

  // Special editor for FLATMAP nodes (same as MAP)
  if (nodeType === NodeType.FLATMAP) {
    const [parallel, setParallel] = useState(currentFlatmapConfig?.parallel ?? true);
    const [transformerId, setTransformerId] = useState(currentFlatmapConfig?.transformerId || '');

    useEffect(() => {
      setParallel(currentFlatmapConfig?.parallel ?? true);
      setTransformerId(currentFlatmapConfig?.transformerId || '');
    }, [currentFlatmapConfig]);

    const selectedTransformer = availableTransformers.find((t) => t.id === transformerId);

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
              Configure FlatMap Node
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
              {availableTransformers.length > 0 ? (
                <select
                  value={transformerId}
                  onChange={(e) => setTransformerId(e.target.value)}
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
                  <option value="">Select a transformer...</option>
                  {availableTransformers.map((transformer) => (
                    <option key={transformer.id} value={transformer.id}>
                      {transformer.label} ({transformer.type})
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '6px', color: '#6b7280', fontSize: '12px' }}>
                  No transformer nodes available. Add a Simple LLM, Structured LLM, or Peek node to the graph first.
                </div>
              )}
              {selectedTransformer && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#1a1a1a', borderRadius: '6px', fontSize: '12px', color: '#22c55e' }}>
                  ✓ Selected: {selectedTransformer.label} ({selectedTransformer.type})
                </div>
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
                onClick={() => {
                  const selectedTransformer = availableTransformers.find((t) => t.id === transformerId);
                  onSave({ 
                    label, 
                    flatmapConfig: { 
                      transformerId, 
                      transformerLabel: selectedTransformer?.label,
                      parallel 
                    } 
                  });
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

