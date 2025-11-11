import React, { useState, useEffect } from 'react';

// Model options - matching SDK's MODEL_OPTIONS
const MODEL_OPTIONS = [
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast and affordable' },
  { value: 'openai/gpt-4o', label: 'GPT-4o', description: 'Fast and capable' },
  { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo', description: 'High performance' },
  { value: 'openai/gpt-4', label: 'GPT-4', description: 'High quality' },
  { value: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' },
  { value: 'openai/gpt-5', label: 'GPT-5', description: 'Latest model' },
] as const;

type Model = typeof MODEL_OPTIONS[number]['value'];

interface LLMNodeEditorProps {
  nodeId: string;
  currentLabel?: string;
  currentConfig?: {
    model?: string;
    system?: string;
    prompt?: string;
  };
  onSave: (label: string, config: { model: string; system?: string; prompt?: string }) => void;
  onClose: () => void;
}

function LLMNodeEditor({ nodeId, currentLabel, currentConfig, onSave, onClose }: LLMNodeEditorProps) {
  const [label, setLabel] = useState(currentLabel || '');
  const [model, setModel] = useState<string>(currentConfig?.model || 'openai/gpt-4o-mini');
  const [system, setSystem] = useState(currentConfig?.system || '');
  const [prompt, setPrompt] = useState(currentConfig?.prompt || '');

  useEffect(() => {
    setLabel(currentLabel || '');
    setModel(currentConfig?.model || 'openai/gpt-4o-mini');
    setSystem(currentConfig?.system || '');
    setPrompt(currentConfig?.prompt || '');
  }, [currentLabel, currentConfig]);

  const handleSave = () => {
    onSave(label, {
      model,
      ...(system && { system }),
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
            minWidth: '500px',
            maxWidth: '600px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            zIndex: 2001,
          }}
        >
          <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
            Configure Simple LLM Node
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
              onChange={(e) => setModel(e.target.value)}
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
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} {option.description && `- ${option.description}`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              System Prompt (optional, supports ${'{input}'} and ${'{dagContext.cache.???}'})
            </label>
            <textarea
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              placeholder="Enter system prompt"
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              User Prompt (optional, use ${'{input}'} to interpolate input, ${'{dagContext.cache.???}'} for cached values)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter user prompt (e.g., 'Say hello to: ${input}' or 'Search results: ${dagContext.cache.searchResults}')"
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

export default LLMNodeEditor;

