import React, { useState, useEffect } from 'react';

interface ExaSearchNodeEditorProps {
  nodeId: string;
  currentLabel?: string;
  currentConfig?: {
    searchType?: 'auto' | 'neural' | 'keyword' | 'fast';
    includeDomains?: string[];
    excludeDomains?: string[];
    includeText?: string[];
    excludeText?: string[];
    category?: string;
    numResults?: number;
    text?: boolean;
    contents?: boolean | { numChars?: number };
    highlights?: boolean;
    summary?: boolean;
  };
  onSave: (
    nodeId: string,
    config: {
      searchType?: 'auto' | 'neural' | 'keyword' | 'fast';
      includeDomains?: string[];
      excludeDomains?: string[];
      includeText?: string[];
      excludeText?: string[];
      category?: string;
      numResults?: number;
      text?: boolean;
      contents?: boolean | { numChars?: number };
      highlights?: boolean;
      summary?: boolean;
    },
    label?: string
  ) => void;
  onClose: () => void;
}

const AVAILABLE_CATEGORIES = [
  'papers',
  'news',
  'twitter',
  'youtube',
  'reddit',
  'github',
  'hackernews',
];

function ExaSearchNodeEditor({
  nodeId,
  currentLabel,
  currentConfig,
  onSave,
  onClose,
}: ExaSearchNodeEditorProps) {
  const [label, setLabel] = useState(currentLabel || '');
  const [searchType, setSearchType] = useState<'auto' | 'neural' | 'keyword' | 'fast'>(
    currentConfig?.searchType || 'auto'
  );
  const [numResults, setNumResults] = useState(currentConfig?.numResults || 10);
  const [category, setCategory] = useState(currentConfig?.category || '');
  const [includeDomains, setIncludeDomains] = useState(
    currentConfig?.includeDomains?.join(', ') || ''
  );
  const [excludeDomains, setExcludeDomains] = useState(
    currentConfig?.excludeDomains?.join(', ') || ''
  );
  const [includeText, setIncludeText] = useState(
    currentConfig?.includeText?.join(', ') || ''
  );
  const [excludeText, setExcludeText] = useState(
    currentConfig?.excludeText?.join(', ') || ''
  );
  const [text, setText] = useState(currentConfig?.text ?? true);
  const [highlights, setHighlights] = useState(currentConfig?.highlights ?? false);
  const [summary, setSummary] = useState(currentConfig?.summary ?? false);
  const [contents, setContents] = useState(currentConfig?.contents ? true : false);
  const [contentsNumChars, setContentsNumChars] = useState(
    typeof currentConfig?.contents === 'object' && currentConfig.contents.numChars
      ? currentConfig.contents.numChars.toString()
      : ''
  );

  // Update state when props change
  useEffect(() => {
    setLabel(currentLabel || '');
    setSearchType(currentConfig?.searchType || 'auto');
    setNumResults(currentConfig?.numResults || 10);
    setCategory(currentConfig?.category || '');
    setIncludeDomains(currentConfig?.includeDomains?.join(', ') || '');
    setExcludeDomains(currentConfig?.excludeDomains?.join(', ') || '');
    setIncludeText(currentConfig?.includeText?.join(', ') || '');
    setExcludeText(currentConfig?.excludeText?.join(', ') || '');
    setText(currentConfig?.text ?? true);
    setHighlights(currentConfig?.highlights ?? false);
    setSummary(currentConfig?.summary ?? false);
    setContents(currentConfig?.contents ? true : false);
    if (typeof currentConfig?.contents === 'object' && currentConfig.contents.numChars) {
      setContentsNumChars(currentConfig.contents.numChars.toString());
    } else {
      setContentsNumChars('');
    }
  }, [currentLabel, currentConfig]);

  const handleSave = () => {
    const config: ExaSearchNodeEditorProps['currentConfig'] = {
      searchType,
      numResults,
      text,
      highlights,
      summary,
    };

    if (category) {
      config.category = category;
    }

    if (includeDomains.trim()) {
      config.includeDomains = includeDomains.split(',').map((d) => d.trim()).filter((d) => d);
    }

    if (excludeDomains.trim()) {
      config.excludeDomains = excludeDomains.split(',').map((d) => d.trim()).filter((d) => d);
    }

    if (includeText.trim()) {
      config.includeText = includeText.split(',').map((t) => t.trim()).filter((t) => t);
    }

    if (excludeText.trim()) {
      config.excludeText = excludeText.split(',').map((t) => t.trim()).filter((t) => t);
    }

    if (contents) {
      if (contentsNumChars.trim()) {
        const numChars = parseInt(contentsNumChars, 10);
        if (!Number.isNaN(numChars)) {
          config.contents = { numChars };
        } else {
          config.contents = true;
        }
      } else {
        config.contents = true;
      }
    }

    onSave(nodeId, config, label || undefined);
    onClose();
  };

  return (
    <>
      <div
        className="exa-search-node-editor-overlay"
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
          className="exa-search-node-editor"
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
            Configure Exa Search Node
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

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              Search Type
            </label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'auto' | 'neural' | 'keyword' | 'fast')}
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
              <option value="auto">Auto</option>
              <option value="neural">Neural</option>
              <option value="keyword">Keyword</option>
              <option value="fast">Fast</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              Number of Results
            </label>
            <input
              type="number"
              value={numResults}
              onChange={(e) => setNumResults(parseInt(e.target.value, 10) || 10)}
              min="1"
              max="100"
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
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              Category (optional)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
              <option value="">None</option>
              {AVAILABLE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              Include Domains (comma-separated, optional)
            </label>
            <input
              type="text"
              value={includeDomains}
              onChange={(e) => setIncludeDomains(e.target.value)}
              placeholder="example.com, another.com"
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
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              Exclude Domains (comma-separated, optional)
            </label>
            <input
              type="text"
              value={excludeDomains}
              onChange={(e) => setExcludeDomains(e.target.value)}
              placeholder="example.com, another.com"
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
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              Include Text (comma-separated phrases, optional)
            </label>
            <input
              type="text"
              value={includeText}
              onChange={(e) => setIncludeText(e.target.value)}
              placeholder="phrase1, phrase2"
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
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
              Exclude Text (comma-separated phrases, optional)
            </label>
            <input
              type="text"
              value={excludeText}
              onChange={(e) => setExcludeText(e.target.value)}
              placeholder="phrase1, phrase2"
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
          </div>

          <div style={{ marginBottom: '16px' }}>
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
                checked={text}
                onChange={(e) => setText(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Include Text Content</span>
            </label>
          </div>

          <div style={{ marginBottom: '16px' }}>
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
                checked={highlights}
                onChange={(e) => setHighlights(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Include Highlights</span>
            </label>
          </div>

          <div style={{ marginBottom: '16px' }}>
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
                checked={summary}
                onChange={(e) => setSummary(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Include Summary</span>
            </label>
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
                checked={contents}
                onChange={(e) => setContents(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Include Full Contents</span>
            </label>
            {contents && (
              <input
                type="number"
                value={contentsNumChars}
                onChange={(e) => setContentsNumChars(e.target.value)}
                placeholder="Number of characters (optional, no limit if empty)"
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '8px',
                  background: '#3a3a3a',
                  border: '1px solid #4a4a4a',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                }}
              />
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

export default ExaSearchNodeEditor;

