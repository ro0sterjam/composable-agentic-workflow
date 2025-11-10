import React, { useState, useEffect } from 'react';

interface LLMNodeEditorProps {
  nodeId: string;
  currentLabel?: string;
  currentModel: string;
  currentStructuredOutput?: {
    schema: Record<string, unknown>;
    mode?: 'json' | 'json_schema' | 'tool';
  };
  onSave: (
    nodeId: string,
    model: string,
    structuredOutput?: {
      schema: Record<string, unknown>;
      mode?: 'json' | 'json_schema' | 'tool';
    },
    label?: string
  ) => void;
  onClose: () => void;
}

const AVAILABLE_MODELS = ['openai/gpt-4o', 'openai/gpt-4-turbo', 'openai/gpt-4', 'openai/gpt-3.5-turbo', 'openai/gpt-5'];

function LLMNodeEditor({
  nodeId,
  currentLabel,
  currentModel,
  currentStructuredOutput,
  onSave,
  onClose,
}: LLMNodeEditorProps) {
  const [label, setLabel] = useState(currentLabel || '');
  const [model, setModel] = useState(currentModel || 'openai/gpt-4o');
  const [useStructuredOutput, setUseStructuredOutput] = useState(!!currentStructuredOutput);
  const [structuredMode, setStructuredMode] = useState<'json' | 'json_schema' | 'tool'>(
    currentStructuredOutput?.mode || 'json'
  );
  const [schemaJson, setSchemaJson] = useState(
    currentStructuredOutput?.schema ? JSON.stringify(currentStructuredOutput.schema, null, 2) : '{}'
  );
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Update state when props change (e.g., modal reopened)
  useEffect(() => {
    setLabel(currentLabel || '');
    setModel(currentModel || 'openai/gpt-4o');
    setUseStructuredOutput(!!currentStructuredOutput);
    setStructuredMode(currentStructuredOutput?.mode || 'json');
    setSchemaJson(
      currentStructuredOutput?.schema ? JSON.stringify(currentStructuredOutput.schema, null, 2) : '{}'
    );
  }, [currentLabel, currentModel, currentStructuredOutput]);

  useEffect(() => {
    if (useStructuredOutput) {
      try {
        JSON.parse(schemaJson);
        setSchemaError(null);
      } catch (e) {
        setSchemaError('Invalid JSON schema');
      }
    }
  }, [schemaJson, useStructuredOutput]);

  const handleSave = () => {
    let structuredOutput: { schema: Record<string, unknown>; mode?: 'json' | 'json_schema' | 'tool' } | undefined;

    if (useStructuredOutput) {
      try {
        const parsedSchema = JSON.parse(schemaJson);
        structuredOutput = {
          schema: parsedSchema,
          mode: structuredMode,
        };
      } catch (e) {
        alert('Invalid JSON schema. Please fix the schema before saving.');
        return;
      }
    }

    onSave(nodeId, model, structuredOutput, label || undefined);
    onClose();
  };

  return (
    <>
      <div
        className="llm-node-editor-overlay"
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
          className="llm-node-editor"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#2a2a2a',
            border: '1px solid #4a4a4a',
            borderRadius: '12px',
            padding: '24px',
            minWidth: '500px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            zIndex: 2001,
          }}
        >
          <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
            Configure LLM Node
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
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
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
              {AVAILABLE_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#9ca3af',
                marginBottom: '8px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={useStructuredOutput}
                onChange={(e) => setUseStructuredOutput(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Use Structured Output</span>
            </label>
          </div>

          {useStructuredOutput && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
                  Output Mode
                </label>
                <select
                  value={structuredMode}
                  onChange={(e) => setStructuredMode(e.target.value as 'json' | 'json_schema' | 'tool')}
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
                  <option value="json">JSON</option>
                  <option value="json_schema">JSON Schema</option>
                  <option value="tool">Tool</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
                  JSON Schema
                </label>
                <textarea
                  value={schemaJson}
                  onChange={(e) => setSchemaJson(e.target.value)}
                  placeholder='{"type": "object", "properties": {...}}'
                  style={{
                    width: '100%',
                    minHeight: '200px',
                    padding: '10px',
                    background: '#3a3a3a',
                    border: schemaError ? '1px solid #ef4444' : '1px solid #4a4a4a',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    resize: 'vertical',
                  }}
                />
                {schemaError && (
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{schemaError}</div>
                )}
                <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '4px' }}>
                  Enter a valid JSON Schema for structured output
                </div>
              </div>
            </>
          )}

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
              disabled={!!schemaError && useStructuredOutput}
              style={{
                padding: '10px 20px',
                background: schemaError && useStructuredOutput ? '#4a4a4a' : '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: schemaError && useStructuredOutput ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: schemaError && useStructuredOutput ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!schemaError || !useStructuredOutput) {
                  e.currentTarget.style.background = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!schemaError || !useStructuredOutput) {
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

export default LLMNodeEditor;

