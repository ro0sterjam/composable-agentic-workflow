import React, { useState } from 'react';

export type LogType = 'debug' | 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: LogType;
  message: string;
  nodeId?: string;
}

interface LogPanelProps {
  logs: LogEntry[];
}

function LogPanel({ logs }: LogPanelProps) {
  const logPanelRef = React.useRef<HTMLDivElement>(null);
  const [selectedType, setSelectedType] = useState<LogType | 'all'>('info');

  // Auto-scroll to bottom when new logs are added
  React.useEffect(() => {
    if (logPanelRef.current) {
      logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight;
    }
  }, [logs]);

  // Define log type hierarchy (lower = more verbose, higher = more important)
  // debug < info < success < warn < error
  const getTypeHierarchy = (type: LogType): number => {
    switch (type) {
      case 'debug':
        return 0;
      case 'info':
        return 1;
      case 'success':
        return 2;
      case 'warn':
        return 3;
      case 'error':
        return 4;
      default:
        return 0;
    }
  };

  // Filter logs based on selected type - show selected type and all higher levels
  const filteredLogs = React.useMemo(() => {
    if (selectedType === 'all') {
      return logs;
    }
    const selectedHierarchy = getTypeHierarchy(selectedType);
    return logs.filter((log) => getTypeHierarchy(log.type) >= selectedHierarchy);
  }, [logs, selectedType]);

  const getLogColor = (type: LogType) => {
    switch (type) {
      case 'debug':
        return '#6b7280'; // gray
      case 'info':
        return '#3b82f6'; // blue
      case 'warn':
        return '#f59e0b'; // amber
      case 'error':
        return '#ef4444'; // red
      case 'success':
        return '#10b981'; // green
      default:
        return '#9ca3af';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  return (
    <div className="log-panel">
      <div className="log-panel-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Execution Log</h2>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as LogType | 'all')}
            className="log-type-filter"
            style={{
              background: '#3a3a3a',
              color: '#e5e5e5',
              border: '1px solid #4a4a4a',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Types</option>
            <option value="debug">Debug+ (all)</option>
            <option value="info">Info+ (info, success, warn, error)</option>
            <option value="success">Success+ (success, warn, error)</option>
            <option value="warn">Warn+ (warn, error)</option>
            <option value="error">Error only</option>
          </select>
        </div>
      </div>
      <div className="log-panel-content" ref={logPanelRef}>
        {filteredLogs.length === 0 ? (
          <div className="log-empty">
            {logs.length === 0
              ? 'No logs yet. Run the DAG to see execution logs.'
              : `No ${selectedType === 'all' ? '' : selectedType} logs to display.`}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="log-entry" style={{ borderLeftColor: getLogColor(log.type) }}>
              <div className="log-timestamp">{formatTime(log.timestamp)}</div>
              <div className="log-content">
                <span className="log-type" style={{ color: getLogColor(log.type), fontWeight: 600, fontSize: '10px' }}>
                  [{log.type.toUpperCase()}]
                </span>
                {log.nodeId && (
                  <span className="log-node-id">[{log.nodeId}]</span>
                )}
                <span className="log-message" style={{ color: getLogColor(log.type) }}>{log.message}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default LogPanel;

