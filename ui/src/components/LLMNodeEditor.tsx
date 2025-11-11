import React, { useState, useEffect } from 'react';

interface LLMNodeEditorProps {
  nodeId: string;
  currentLabel?: string;
  currentConfig?: {
    model?: 'openai/gpt-5';
    system?: string;
    prompt?: string;
  };
  onSave: (label: string, config: { model: 'openai/gpt-5'; system?: string; prompt?: string }) => void;
  onClose: () => void;
}

function LLMNodeEditor({ nodeId, currentLabel, currentConfig, onSave, onClose }: LLMNodeEditorProps) {
  const [label, setLabel] = useState(currentLabel || '');
  const [model, setModel] = useState<'openai/gpt-5'>((currentConfig?.model as 'openai/gpt-5') || 'openai/gpt-5');
  const [system, setSystem] = useState(currentConfig?.system || '');
  const [prompt, setPrompt] = useState(currentConfig?.prompt || '');

  useEffect(() => {
    setLabel(currentLabel || '');
    setModel((currentConfig?.model as 'openai/gpt-5') || 'openai/gpt-5');
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
              System Prompt (optional)
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
              User Prompt (optional, use ${'{input}'} to interpolate input)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter user prompt (e.g., 'Say hello to: ${input}')"
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

