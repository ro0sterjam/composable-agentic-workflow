import React, { useState, useEffect } from 'react';

interface StructuredLLMNodeEditorProps {
  nodeId: string;
  currentLabel?: string;
  currentConfig?: {
    model?: 'openai/gpt-5';
    schema?: string; // JSON Schema as string
    prompt?: string;
  };
  onSave: (
    label: string,
    config: { model: 'openai/gpt-5'; schema: string; prompt?: string }
  ) => void;
  onClose: () => void;
}

function StructuredLLMNodeEditor({
  nodeId,
  currentLabel,
  currentConfig,
  onSave,
  onClose,
}: StructuredLLMNodeEditorProps) {
  const [label, setLabel] = useState(currentLabel || '');
  const [model, setModel] = useState<'openai/gpt-5'>(
    (currentConfig?.model as 'openai/gpt-5') || 'openai/gpt-5'
  );
  const [schema, setSchema] = useState(
    currentConfig?.schema || JSON.stringify({ type: 'object', properties: {} }, null, 2)
  );
  const [prompt, setPrompt] = useState(currentConfig?.prompt || '');
  const [schemaError, setSchemaError] = useState<string | null>(null);

  useEffect(() => {
    setLabel(currentLabel || '');
    setModel((currentConfig?.model as 'openai/gpt-5') || 'openai/gpt-5');
    setSchema(
      currentConfig?.schema || JSON.stringify({ type: 'object', properties: {} }, null, 2)
    );
    setPrompt(currentConfig?.prompt || '');
  }, [currentLabel, currentConfig]);

  const validateSchema = (schemaStr: string): boolean => {
    try {
      const parsed = JSON.parse(schemaStr);
      if (typeof parsed !== 'object' || parsed === null) {
        setSchemaError('Schema must be a valid JSON object');
        return false;
      }
      setSchemaError(null);
      return true;
    } catch (e) {
      setSchemaError(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  };

  const handleSave = () => {
    if (!validateSchema(schema)) {
      return;
    }

    onSave(label, {
      model,
      schema,
      ...(prompt && { prompt }),
    });
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
            minWidth: '600px',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            zIndex: 2001,
          }}
        >
          <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
            Configure Structured LLM Node
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
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as 'openai/gpt-5')}
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
              <option value="openai/gpt-5">OpenAI GPT-5</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              JSON Schema (defines output structure)
            </label>
            <textarea
              value={schema}
              onChange={(e) => {
                setSchema(e.target.value);
                validateSchema(e.target.value);
              }}
              placeholder='{"type": "object", "properties": {...}}'
              rows={12}
              style={{
                width: '100%',
                padding: '10px',
                background: '#3a3a3a',
                border: schemaError ? '1px solid #ef4444' : '1px solid #4a4a4a',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'monospace',
              }}
            />
            {schemaError && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {schemaError}
              </div>
            )}
            <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '4px' }}>
              Enter a valid JSON Schema. Example:{' '}
              <code style={{ color: '#60a5fa' }}>
                {`{"type": "object", "properties": {"name": {"type": "string"}}}`}
              </code>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              User Prompt (optional, use ${'{input}'} to interpolate input)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter user prompt (e.g., 'Generate data for: ${input}')"
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                background: '#3a3a3a',
                border: '1px solid #4a4a4a',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
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
              disabled={!!schemaError}
              style={{
                padding: '10px 20px',
                background: schemaError ? '#4a4a4a' : '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: schemaError ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: schemaError ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!schemaError) {
                  e.currentTarget.style.background = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!schemaError) {
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

export default StructuredLLMNodeEditor;

