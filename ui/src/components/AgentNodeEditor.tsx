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

interface Tool {
  name: string;
  description: string;
  inputSchema: string; // JSON Schema as string
  transformerId: string;
  transformerLabel?: string;
}

interface AgentNodeEditorProps {
  nodeId: string;
  currentLabel?: string;
  currentConfig?: {
    model?: string;
    system?: string;
    tools?: Tool[];
    maxLoops?: number;
  };
  availableTransformers?: Array<{ id: string; label: string; type: string }>;
  onSave: (
    label: string,
    config: { model: string; system?: string; tools: Tool[]; maxLoops?: number }
  ) => void;
  onClose: () => void;
}

function AgentNodeEditor({
  nodeId,
  currentLabel,
  currentConfig,
  availableTransformers = [],
  onSave,
  onClose,
}: AgentNodeEditorProps) {
  const [label, setLabel] = useState(currentLabel || '');
  const [model, setModel] = useState<string>(
    currentConfig?.model || 'openai/gpt-4o-mini'
  );
  const [system, setSystem] = useState(currentConfig?.system || '');
  const [tools, setTools] = useState<Tool[]>(
    currentConfig?.tools || [
      { name: '', description: '', inputSchema: JSON.stringify({ type: 'string' }, null, 2), transformerId: '' },
    ]
  );
  const [maxLoops, setMaxLoops] = useState<string>(
    currentConfig?.maxLoops?.toString() || ''
  );
  const [schemaErrors, setSchemaErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    setLabel(currentLabel || '');
    setModel(currentConfig?.model || 'openai/gpt-4o-mini');
    setSystem(currentConfig?.system || '');
    setTools(
      currentConfig?.tools || [
        { name: '', description: '', inputSchema: JSON.stringify({ type: 'string' }, null, 2), transformerId: '' },
      ]
    );
    setMaxLoops(currentConfig?.maxLoops?.toString() || '');
  }, [currentLabel, currentConfig]);

  const validateSchema = (schemaStr: string, index: number): boolean => {
    try {
      const parsed = JSON.parse(schemaStr);
      if (typeof parsed !== 'object' || parsed === null) {
        setSchemaErrors((prev) => ({ ...prev, [index]: 'Schema must be a valid JSON object' }));
        return false;
      }
      setSchemaErrors((prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      }));
      return true;
    } catch (e) {
      setSchemaErrors((prev) => ({
        ...prev,
        [index]: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
      }));
      return false;
    }
  };

  const handleToolChange = (index: number, field: keyof Tool, value: string) => {
    const newTools = [...tools];
    newTools[index] = { ...newTools[index], [field]: value };
    if (field === 'inputSchema') {
      validateSchema(value, index);
    }
    setTools(newTools);
  };

  const handleAddTool = () => {
    setTools([
      ...tools,
      { name: '', description: '', inputSchema: JSON.stringify({ type: 'string' }, null, 2), transformerId: '' },
    ]);
  };

  const handleRemoveTool = (index: number) => {
    setTools(tools.filter((_, i) => i !== index));
    setSchemaErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      // Shift errors for indices after the removed one
      const newErrors: Record<number, string> = {};
      Object.keys(next).forEach((key) => {
        const idx = parseInt(key);
        if (idx < index) {
          newErrors[idx] = next[idx];
        } else if (idx > index) {
          newErrors[idx - 1] = next[idx];
        }
      });
      return newErrors;
    });
  };

  const handleSave = () => {
    // Validate all tools
    let isValid = true;
    tools.forEach((tool, index) => {
      if (!tool.name.trim()) {
        isValid = false;
        setSchemaErrors((prev) => ({ ...prev, [index]: 'Tool name is required' }));
      }
      if (!tool.description.trim()) {
        isValid = false;
        setSchemaErrors((prev) => ({ ...prev, [index]: 'Tool description is required' }));
      }
      if (!tool.transformerId) {
        isValid = false;
        setSchemaErrors((prev) => ({ ...prev, [index]: 'Transformer is required' }));
      }
      if (!validateSchema(tool.inputSchema, index)) {
        isValid = false;
      }
    });

    if (!isValid || Object.keys(schemaErrors).length > 0) {
      return;
    }

    // Map transformer IDs to include labels
    const toolsWithLabels = tools.map((tool) => {
      const transformer = availableTransformers.find((t) => t.id === tool.transformerId);
      return {
        ...tool,
        transformerLabel: transformer?.label,
      };
    });

    onSave(label, {
      model,
      ...(system && { system }),
      tools: toolsWithLabels,
      ...(maxLoops && { maxLoops: parseInt(maxLoops) }),
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
            minWidth: '700px',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            zIndex: 2001,
          }}
        >
          <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
            Configure Agent Node
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
              System Prompt (optional)
            </label>
            <textarea
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              placeholder="Enter system prompt for the agent"
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '14px', fontWeight: 500 }}>
                Tools
              </label>
              <button
                onClick={handleAddTool}
                style={{
                  padding: '6px 12px',
                  background: '#3b82f6',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#3b82f6';
                }}
              >
                + Add Tool
              </button>
            </div>

            {tools.map((tool, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: '#1a1a1a',
                  borderRadius: '8px',
                  border: '1px solid #4a4a4a',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>Tool {index + 1}</h3>
                  {tools.length > 1 && (
                    <button
                      onClick={() => handleRemoveTool(index)}
                      style={{
                        padding: '4px 8px',
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#dc2626';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ef4444';
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', color: '#9ca3af', marginBottom: '6px', fontSize: '13px' }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={tool.name}
                    onChange={(e) => handleToolChange(index, 'name', e.target.value)}
                    placeholder="tool_name"
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#3a3a3a',
                      border: '1px solid #4a4a4a',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', color: '#9ca3af', marginBottom: '6px', fontSize: '13px' }}>
                    Description *
                  </label>
                  <textarea
                    value={tool.description}
                    onChange={(e) => handleToolChange(index, 'description', e.target.value)}
                    placeholder="What does this tool do?"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#3a3a3a',
                      border: '1px solid #4a4a4a',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '13px',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', color: '#9ca3af', marginBottom: '6px', fontSize: '13px' }}>
                    Input Schema (JSON Schema) *
                  </label>
                  <textarea
                    value={tool.inputSchema}
                    onChange={(e) => handleToolChange(index, 'inputSchema', e.target.value)}
                    placeholder='{"type": "string"}'
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#3a3a3a',
                      border: schemaErrors[index] ? '1px solid #ef4444' : '1px solid #4a4a4a',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '13px',
                      resize: 'vertical',
                      fontFamily: 'monospace',
                    }}
                  />
                  {schemaErrors[index] && (
                    <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                      {schemaErrors[index]}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', color: '#9ca3af', marginBottom: '6px', fontSize: '13px' }}>
                    Transformer Node *
                  </label>
                  {availableTransformers.length > 0 ? (
                    <select
                      value={tool.transformerId}
                      onChange={(e) => handleToolChange(index, 'transformerId', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#3a3a3a',
                        border: '1px solid #4a4a4a',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '13px',
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
                    <div style={{ padding: '10px', background: '#2a2a2a', borderRadius: '6px', color: '#6b7280', fontSize: '12px' }}>
                      No transformer nodes available. Add transformer nodes to the graph first.
                    </div>
                  )}
                  {tool.transformerId && (
                    <div style={{ marginTop: '6px', padding: '6px', background: '#1a1a1a', borderRadius: '4px', fontSize: '11px', color: '#38b2ac' }}>
                      ✓ Selected: {availableTransformers.find((t) => t.id === tool.transformerId)?.label}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              Max Loops (optional, leave empty for no limit)
            </label>
            <input
              type="number"
              value={maxLoops}
              onChange={(e) => setMaxLoops(e.target.value)}
              placeholder="e.g., 10"
              min="1"
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
            <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '4px' }}>
              Maximum number of tool call loops. Leave empty for unlimited.
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
              disabled={Object.keys(schemaErrors).length > 0}
              style={{
                padding: '10px 20px',
                background: Object.keys(schemaErrors).length > 0 ? '#4a4a4a' : '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: Object.keys(schemaErrors).length > 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: Object.keys(schemaErrors).length > 0 ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (Object.keys(schemaErrors).length === 0) {
                  e.currentTarget.style.background = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (Object.keys(schemaErrors).length === 0) {
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

export default AgentNodeEditor;

