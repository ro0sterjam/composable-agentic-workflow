import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeType } from '../types';

interface CustomNodeData {
  label: string;
  nodeType: NodeType;
  id: string;
  value?: string | number | boolean | null | undefined;
  llmConfig?: {
    model?: string;
    system?: string;
    prompt?: string;
  };
  structuredLLMConfig?: {
    model?: string;
    schema?: string; // JSON Schema as string
    prompt?: string;
  };
  mapConfig?: {
    transformerId?: string;
    transformerLabel?: string; // Label of the transformer node for display
    parallel?: boolean;
  };
  flatmapConfig?: {
    transformerId?: string;
    transformerLabel?: string; // Label of the transformer node for display
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
  filterConfig?: {
    expression: string;
  };
  agentConfig?: {
    model?: string;
    system?: string;
    tools?: Array<{
      name: string;
      description: string;
      inputSchema: string;
      transformerId: string;
      transformerLabel?: string;
    }>;
    maxLoops?: number;
    schema?: string;
  };
  onDoubleClick?: (nodeId: string) => void;
  executionState?: 'idle' | 'running' | 'completed' | 'failed';
  isReferencedByNestingNode?: boolean; // Whether this node is referenced by a map/flatmap/agent node
}

const nodeTypeColors: Record<NodeType, { bg: string; border: string; text: string }> = {
  [NodeType.LITERAL]: { bg: '#f3f4f6', border: '#6b7280', text: '#374151' },
  [NodeType.DATASET]: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  [NodeType.SIMPLE_LLM]: { bg: '#e0e7ff', border: '#6366f1', text: '#312e81' },
  [NodeType.STRUCTURED_LLM]: { bg: '#fce7f3', border: '#ec4899', text: '#831843' },
  [NodeType.MAP]: { bg: '#e6fffa', border: '#38b2ac', text: '#234e52' },
  [NodeType.FLATMAP]: { bg: '#f0fdf4', border: '#22c55e', text: '#14532d' },
  [NodeType.PEEK]: { bg: '#f0f9ff', border: '#0ea5e9', text: '#0c4a6e' },
  [NodeType.CONSOLE]: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  [NodeType.EXA_SEARCH]: { bg: '#fef3f4', border: '#f87171', text: '#991b1b' },
  [NodeType.DEDUPE]: { bg: '#f5f3ff', border: '#a78bfa', text: '#5b21b6' },
  [NodeType.CACHE]: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
  [NodeType.EXTRACT]: { bg: '#fff7ed', border: '#f97316', text: '#9a3412' },
  [NodeType.FILTER]: { bg: '#ecfeff', border: '#06b6d4', text: '#164e63' },
  [NodeType.AGENT]: { bg: '#faf5ff', border: '#c084fc', text: '#6b21a8' },
};

const nodeTypeIcons: Record<NodeType, string> = {
  [NodeType.LITERAL]: '📦',
  [NodeType.DATASET]: '📊',
  [NodeType.SIMPLE_LLM]: '🤖',
  [NodeType.STRUCTURED_LLM]: '🎯',
  [NodeType.MAP]: '🗺️',
  [NodeType.FLATMAP]: '📋',
  [NodeType.PEEK]: '👁️',
  [NodeType.CONSOLE]: '📥',
  [NodeType.EXA_SEARCH]: '🔍',
  [NodeType.DEDUPE]: '🔀',
  [NodeType.CACHE]: '💾',
  [NodeType.EXTRACT]: '📤',
  [NodeType.FILTER]: '🔍',
  [NodeType.AGENT]: '🧠',
};

function CustomNode({ data, selected }: NodeProps<CustomNodeData>) {
  const nodeType = data.nodeType as NodeType;
  const colors = nodeTypeColors[nodeType] || nodeTypeColors[NodeType.LITERAL];
  const icon = nodeTypeIcons[nodeType] || '⚙️';
  const executionState = data.executionState || 'idle';

  const handleDoubleClick = () => {
    if (data.onDoubleClick) {
      data.onDoubleClick(data.id);
    }
  };

  // Determine border color based on execution state
  let borderColor = selected ? '#10b981' : colors.border;
  if (executionState === 'failed') {
    borderColor = '#ef4444';
  } else if (executionState === 'running') {
    borderColor = '#3b82f6';
  } else if (executionState === 'completed') {
    borderColor = '#10b981';
  }

  // Determine background color based on execution state
  let backgroundColor = colors.bg;
  if (executionState === 'running') {
    backgroundColor = '#dbeafe'; // Light blue
  } else if (executionState === 'failed') {
    backgroundColor = '#fee2e2'; // Light red
  } else if (executionState === 'completed') {
    backgroundColor = '#d1fae5'; // Light green
  }


  return (
    <div
      className="custom-node"
      style={{
        backgroundColor,
        borderColor,
        borderWidth: executionState === 'running' || executionState === 'failed' ? '3px' : '2px',
        cursor: 'pointer',
        boxShadow: executionState === 'running' ? '0 0 10px rgba(59, 130, 246, 0.5)' : undefined,
      }}
      onDoubleClick={handleDoubleClick}
      title="Double-click to configure"
    >
      <div className="node-header">
        <span>{icon}</span>
        <span style={{ color: colors.text }}>{data.label}</span>
        <span className="node-type-badge" style={{ backgroundColor: colors.border, color: 'white' }}>
          {nodeType}
        </span>
      </div>
      
      {/* Hide input connector if node is being used as a subgraph transformer */}
      {nodeType !== NodeType.LITERAL && nodeType !== NodeType.DATASET && !data.isReferencedByNestingNode && (
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{ background: colors.border }}
        />
      )}
      
      {nodeType !== NodeType.CONSOLE && (
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{ background: colors.border }}
        />
      )}

      {/* Bottom handle for Map/FlatMap/Agent nodes to connect to their transformer(s) (visual only, not connectable) */}
      {((nodeType === NodeType.MAP && data.mapConfig?.transformerId) ||
        (nodeType === NodeType.FLATMAP && data.flatmapConfig?.transformerId) ||
        (nodeType === NodeType.AGENT && data.agentConfig?.tools && data.agentConfig.tools.length > 0)) && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          isConnectable={false}
          style={{ 
            background: '#8b5cf6',
            border: '2px solid #8b5cf6',
            width: '10px',
            height: '10px',
            cursor: 'default',
          }}
        />
      )}

      {/* Top handle for transformer nodes that can be used by Map/FlatMap (visual only, not connectable) */}
      {/* Only show if the node is actually referenced by a nesting node */}
      {data.isReferencedByNestingNode &&
        (nodeType === NodeType.SIMPLE_LLM ||
          nodeType === NodeType.STRUCTURED_LLM ||
          nodeType === NodeType.EXA_SEARCH ||
          nodeType === NodeType.PEEK ||
          nodeType === NodeType.EXTRACT ||
          nodeType === NodeType.DEDUPE ||
          nodeType === NodeType.CACHE ||
          nodeType === NodeType.FILTER) && (
          <Handle
            type="target"
            position={Position.Top}
            id="top"
            isConnectable={false}
            style={{ 
              background: '#8b5cf6',
              border: '2px solid #8b5cf6',
              width: '10px',
              height: '10px',
              cursor: 'default',
            }}
          />
        )}
      
      <div className="node-ports">
        {nodeType === NodeType.LITERAL && (
          <div className="port" style={{ marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
            <span className="port-label">
              Value: {data.value === null ? 'null' : data.value === undefined ? 'undefined' : String(data.value)}
            </span>
          </div>
        )}
        {nodeType === NodeType.DATASET && (
          <div className="port" style={{ marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
            <span className="port-label">
              {(() => {
                try {
                  const parsed = data.value ? JSON.parse(String(data.value)) : [];
                  const count = Array.isArray(parsed) ? parsed.length : 0;
                  return `Array of ${count} object${count !== 1 ? 's' : ''}`;
                } catch {
                  return 'Invalid JSON';
                }
              })()}
            </span>
          </div>
        )}
        {nodeType === NodeType.SIMPLE_LLM && data.llmConfig && (
          <div style={{ marginTop: '4px', fontSize: '11px', color: colors.text, opacity: 0.8, lineHeight: '1.6', display: 'flex', flexDirection: 'column' }}>
            {data.llmConfig.model && (
              <div style={{ marginBottom: '4px' }}>
                Model: {data.llmConfig.model.split('/')[1] || data.llmConfig.model}
              </div>
            )}
            {data.llmConfig.prompt && (
              <div style={{ marginBottom: '4px', fontSize: '10px', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Prompt: {data.llmConfig.prompt.length > 40 ? `${data.llmConfig.prompt.substring(0, 40)}...` : data.llmConfig.prompt}
              </div>
            )}
            {data.llmConfig.system && (
              <div style={{ fontSize: '10px', opacity: 0.7, fontStyle: 'italic' }}>
                System: {data.llmConfig.system.length > 30 ? `${data.llmConfig.system.substring(0, 30)}...` : data.llmConfig.system}
              </div>
            )}
          </div>
        )}
        {nodeType === NodeType.STRUCTURED_LLM && data.structuredLLMConfig && (
          <div style={{ marginTop: '4px', fontSize: '11px', color: colors.text, opacity: 0.8, lineHeight: '1.6', display: 'flex', flexDirection: 'column' }}>
            {data.structuredLLMConfig.model && (
              <div style={{ marginBottom: '4px' }}>
                Model: {data.structuredLLMConfig.model.split('/')[1] || data.structuredLLMConfig.model}
              </div>
            )}
            {data.structuredLLMConfig.schema && (
              <div style={{ marginBottom: '4px', fontSize: '10px', opacity: 0.7 }}>
                Schema: {(() => {
                  try {
                    const schema = JSON.parse(data.structuredLLMConfig.schema!);
                    if (schema.type === 'array') {
                      return `Array${schema.items ? ` of ${schema.items.type || 'any'}` : ''}`;
                    }
                    return schema.type || 'Object';
                  } catch {
                    return 'Custom';
                  }
                })()}
              </div>
            )}
            {data.structuredLLMConfig.prompt && (
              <div style={{ fontSize: '10px', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Prompt: {data.structuredLLMConfig.prompt.length > 40 ? `${data.structuredLLMConfig.prompt.substring(0, 40)}...` : data.structuredLLMConfig.prompt}
              </div>
            )}
          </div>
        )}
        {nodeType === NodeType.MAP && data.mapConfig && (
          <div style={{ marginTop: '4px', fontSize: '11px', color: colors.text, opacity: 0.8, lineHeight: '1.6', display: 'flex', flexDirection: 'column' }}>
            {data.mapConfig.transformerId ? (
              <>
                <div style={{ marginBottom: '4px' }}>
                  Transformer: {data.mapConfig.transformerLabel || data.mapConfig.transformerId}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>
                  {data.mapConfig.parallel ? '⚡ Parallel' : '➡️ Sequential'}
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.6, fontStyle: 'italic' }}>
                No transformer selected
              </div>
            )}
          </div>
        )}
        {nodeType === NodeType.FLATMAP && data.flatmapConfig && (
          <div style={{ marginTop: '4px', fontSize: '11px', color: colors.text, opacity: 0.8, lineHeight: '1.6', display: 'flex', flexDirection: 'column' }}>
            {data.flatmapConfig.transformerId ? (
              <>
                <div style={{ marginBottom: '4px' }}>
                  Transformer: {data.flatmapConfig.transformerLabel || data.flatmapConfig.transformerId}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>
                  {data.flatmapConfig.parallel ? '⚡ Parallel' : '➡️ Sequential'}
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.6, fontStyle: 'italic' }}>
                No transformer selected
              </div>
            )}
          </div>
        )}
        {nodeType === NodeType.EXA_SEARCH && data.exaSearchConfig && (
          <div style={{ marginTop: '4px', fontSize: '11px', color: colors.text, opacity: 0.8, lineHeight: '1.6', display: 'flex', flexDirection: 'column' }}>
            {data.exaSearchConfig.type && (
              <div style={{ marginBottom: '4px' }}>
                Type: {data.exaSearchConfig.type}
              </div>
            )}
            {data.exaSearchConfig.numResults !== undefined && (
              <div style={{ marginBottom: '4px', fontSize: '10px', opacity: 0.7 }}>
                Results: {data.exaSearchConfig.numResults}
              </div>
            )}
            {data.exaSearchConfig.category && (
              <div style={{ fontSize: '10px', opacity: 0.7 }}>
                Category: {data.exaSearchConfig.category}
              </div>
            )}
            {data.exaSearchConfig.includeDomains && data.exaSearchConfig.includeDomains.length > 0 && (
              <div style={{ fontSize: '10px', opacity: 0.7 }}>
                Include: {data.exaSearchConfig.includeDomains.join(', ')}
              </div>
            )}
          </div>
        )}
        {nodeType === NodeType.DEDUPE && data.dedupeConfig && (
          <div style={{ marginTop: '4px', fontSize: '11px', color: colors.text, opacity: 0.8, lineHeight: '1.6', display: 'flex', flexDirection: 'column' }}>
            {data.dedupeConfig.byProperty && (
              <div style={{ marginBottom: '4px' }}>
                Property: {data.dedupeConfig.byProperty}
              </div>
            )}
            {data.dedupeConfig.method && (
              <div style={{ fontSize: '10px', opacity: 0.7 }}>
                Method: {data.dedupeConfig.method}
              </div>
            )}
            {!data.dedupeConfig.byProperty && (
              <div style={{ fontSize: '10px', opacity: 0.7, fontStyle: 'italic' }}>
                Deduping by value
              </div>
            )}
          </div>
        )}
        {nodeType === NodeType.CACHE && data.cacheConfig && (
          <div style={{ marginTop: '4px', fontSize: '11px', color: colors.text, opacity: 0.8, lineHeight: '1.6', display: 'flex', flexDirection: 'column' }}>
            {data.cacheConfig.property && (
              <div style={{ marginBottom: '4px', fontSize: '10px', opacity: 0.7 }}>
                Property: {data.cacheConfig.property}
              </div>
            )}
          </div>
        )}
        {nodeType === NodeType.EXTRACT && data.extractConfig && (
          <div style={{ marginTop: '4px', fontSize: '11px', color: colors.text, opacity: 0.8, lineHeight: '1.6', display: 'flex', flexDirection: 'column' }}>
            {data.extractConfig.property && (
              <div style={{ marginBottom: '4px', fontSize: '10px', opacity: 0.7 }}>
                Property: {data.extractConfig.property}
              </div>
            )}
          </div>
        )}
        {nodeType === NodeType.FILTER && data.filterConfig && (
          <div style={{ marginTop: '4px', fontSize: '11px', color: colors.text, opacity: 0.8, lineHeight: '1.6', display: 'flex', flexDirection: 'column' }}>
            {data.filterConfig.expression && (
              <div style={{ marginBottom: '4px', fontSize: '10px', opacity: 0.7, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {data.filterConfig.expression.length > 40
                  ? `${data.filterConfig.expression.substring(0, 40)}...`
                  : data.filterConfig.expression}
              </div>
            )}
          </div>
        )}
        {nodeType === NodeType.AGENT && data.agentConfig && (
          <div style={{ marginTop: '4px', fontSize: '11px', color: colors.text, opacity: 0.8, lineHeight: '1.6', display: 'flex', flexDirection: 'column' }}>
            {data.agentConfig.model && (
              <div style={{ marginBottom: '4px' }}>
                Model: {data.agentConfig.model.split('/')[1] || data.agentConfig.model}
              </div>
            )}
            {data.agentConfig.tools && data.agentConfig.tools.length > 0 && (
              <div style={{ marginBottom: '4px', fontSize: '10px', opacity: 0.7 }}>
                Tools: {data.agentConfig.tools.length} tool{data.agentConfig.tools.length !== 1 ? 's' : ''}
              </div>
            )}
            {data.agentConfig.maxLoops && (
              <div style={{ fontSize: '10px', opacity: 0.7 }}>
                Max Loops: {data.agentConfig.maxLoops}
              </div>
            )}
            {data.agentConfig.schema && (
              <div style={{ fontSize: '10px', opacity: 0.7, color: '#10b981' }}>
                ✓ Structured Output
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomNode;
