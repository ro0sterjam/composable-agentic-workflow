import React from 'react';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning' | 'console';
  message: string;
  nodeId?: string;
}

interface LogPanelProps {
  logs: LogEntry[];
}

function LogPanel({ logs }: LogPanelProps) {
  const logPanelRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  React.useEffect(() => {
    if (logPanelRef.current) {
      logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'console':
        return '#3b82f6';
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
        <h2>Execution Log</h2>
      </div>
      <div className="log-panel-content" ref={logPanelRef}>
        {logs.length === 0 ? (
          <div className="log-empty">No logs yet. Run the DAG to see execution logs.</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="log-entry" style={{ borderLeftColor: getLogColor(log.type) }}>
              <div className="log-timestamp">{formatTime(log.timestamp)}</div>
              <div className="log-content">
                {log.nodeId && (
                  <span className="log-node-id">[{log.nodeId}]</span>
                )}
                <span className="log-message">{log.message}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default LogPanel;

