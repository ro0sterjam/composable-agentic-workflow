import React, { useState, useEffect } from 'react';
import type { DAGConfig } from '@sdk/dag-config';

interface ConfigPanelProps {
  config: DAGConfig;
  onConfigChange: (config: DAGConfig) => void;
  onClose: () => void;
}

function ConfigPanel({ config, onConfigChange, onClose }: ConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState<DAGConfig>(() => ({
    runtime: config.runtime || { timeout: 30000, maxRetries: 0 },
    environment: config.environment || { name: 'development' },
    ...config,
    // Remove secrets from UI config
    secrets: undefined,
  }));

  useEffect(() => {
    setLocalConfig({
      runtime: config.runtime || { timeout: 30000, maxRetries: 0 },
      environment: config.environment || { name: 'development' },
      ...config,
      // Remove secrets from UI config
      secrets: undefined,
    });
  }, [config]);

  const handleSave = () => {
    // Ensure secrets are not saved
    const configToSave = {
      ...localConfig,
      secrets: undefined,
    };
    onConfigChange(configToSave);
    onClose();
  };

  const handleRuntimeChange = (key: string, value: unknown) => {
    setLocalConfig((prev) => ({
      ...prev,
      runtime: {
        ...prev.runtime,
        [key]: value,
      },
    }));
  };

  return (
    <div 
      className="config-panel-overlay" 
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}
    >
      <div 
        className="config-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', zIndex: 1001 }}
      >
        <div className="config-panel-header">
          <h2>DAG Configuration</h2>
          <button type="button" className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="config-panel-content">
          <div className="config-section">
            <h3>Note</h3>
            <p className="config-help">
              API keys and secrets are configured via environment variables (e.g., .env file) 
              when executing DAGs server-side. They are not stored in the UI configuration.
            </p>
          </div>

          <div className="config-section">
            <h3>Runtime Settings</h3>
            
            <div className="config-field">
              <label>
                Timeout (ms)
                <input
                  type="number"
                  value={localConfig.runtime?.timeout || 30000}
                  onChange={(e) => handleRuntimeChange('timeout', parseInt(e.target.value, 10))}
                  min="1000"
                  step="1000"
                />
              </label>
            </div>

            <div className="config-field">
              <label>
                Max Retries
                <input
                  type="number"
                  value={localConfig.runtime?.maxRetries || 0}
                  onChange={(e) => handleRuntimeChange('maxRetries', parseInt(e.target.value, 10))}
                  min="0"
                  max="10"
                />
              </label>
            </div>
          </div>

          <div className="config-section">
            <h3>Environment</h3>
            <div className="config-field">
              <label>
                Environment Name
                <select
                  value={localConfig.environment?.name || 'development'}
                  onChange={(e) => {
                    setLocalConfig((prev) => ({
                      ...prev,
                      environment: {
                        ...prev.environment,
                        name: e.target.value,
                      },
                    }));
                  }}
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="config-panel-footer">
          <button type="button" className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="save-button" onClick={handleSave}>
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfigPanel;

