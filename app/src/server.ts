/**
 * HTTP Server for executing DAGs and streaming logs to UI
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { executeDAGFromFile } from './index.js';
import type { LogEntry } from './index.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

/**
 * Execute a DAG and stream logs via Server-Sent Events
 */
app.post('/api/execute', async (req: express.Request, res: express.Response) => {
  const { dagJson } = req.body;

  if (!dagJson) {
    return res.status(400).json({ error: 'dagJson is required' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sendLog = (type: 'info' | 'success' | 'error' | 'warning' | 'console', message: string, nodeId?: string) => {
    const log = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      nodeId,
    };
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  };

  try {
    console.log('[Server] Received DAG execution request');
    
    // dagJson is already a parsed object from req.body, so we need to stringify it
    // But if it's already a string, we should use it as-is
    const dagJsonString = typeof dagJson === 'string' ? dagJson : JSON.stringify(dagJson);
    
    console.log('[Server] Starting DAG execution...');
    const startTime = Date.now();
    
    await executeDAGFromFile({
      dagJson: dagJsonString,
      verbose: true,
      onLog: (type: LogEntry['type'], message: string, nodeId?: string) => {
        // Send to UI
        sendLog(type, message, nodeId);
        // Also log to server console for debugging
        console.log(`[Server] [${type.toUpperCase()}] ${message}${nodeId ? ` (${nodeId})` : ''}`);
      },
    });

    const duration = Date.now() - startTime;
    console.log(`[Server] DAG execution completed in ${duration}ms`);

    // Send completion event
    sendLog('success', 'DAG execution completed');
    res.end();
  } catch (error) {
    console.error('[Server] DAG execution error:', error);
    sendLog('error', `DAG execution failed: ${error instanceof Error ? error.message : String(error)}`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`[Server] DAG execution server running on http://localhost:${PORT}`);
  console.log(`[Server] Ready to execute DAGs from UI`);
});

