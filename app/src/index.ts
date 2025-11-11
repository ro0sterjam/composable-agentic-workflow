#!/usr/bin/env node

/**
 * Composable Search DAG Executor
 *
 * A Node.js application for executing DAGs defined in JSON format.
 * This allows DAGs created in the UI to be executed server-side,
 * which is necessary for LLM nodes and other server-side operations.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

import {
  DAGBuilder,
  DAGExecutor,
  defaultNodeRegistry,
  type ExecutionState,
  type DAGData,
  DEFAULT_NODE_TYPES,
} from '../../sdk/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning' | 'console';
  message: string;
  nodeId?: string;
}

interface ExecutionOptions {
  dagFile?: string;
  dagJson?: string;
  verbose?: boolean;
  onLog?: (type: LogEntry['type'], message: string, nodeId?: string) => void;
}

/**
 * Execute a DAG from a JSON file or JSON string
 */
async function executeDAG(options: ExecutionOptions): Promise<void> {
  const { dagFile, dagJson, verbose = false, onLog } = options;

  // Load DAG
  let dagData: DAGData;
  if (dagFile) {
    const filePath = resolve(process.cwd(), dagFile);
    if (verbose) {
      console.log(`[App] Loading DAG from file: ${filePath}`);
    }
    const fileContent = readFileSync(filePath, 'utf-8');
    dagData = JSON.parse(fileContent) as DAGData;
  } else if (dagJson) {
    if (verbose) {
      console.log(`[App] Loading DAG from JSON string`);
    }
    dagData = JSON.parse(dagJson) as DAGData;
  } else {
    throw new Error('Either dagFile or dagJson must be provided');
  }

  // Deserialize DAG using registry
  if (verbose) {
    console.log(`[App] Deserializing DAG...`);
  }
  const builder = new DAGBuilder(dagData.id);

  // Reconstruct nodes from serialized data using the registry
  for (const [id, nodeData] of Object.entries(dagData.nodes)) {
    const serialized = nodeData as any;

    // Use registry to create node instance
    const node = defaultNodeRegistry.create(serialized.type, serialized);

    if (!node) {
      throw new Error(
        `Unknown node type: ${serialized.type}. Make sure it's registered in the node registry.`
      );
    }

    // Set metadata if present and node supports it
    if (serialized.metadata && 'metadata' in node) {
      (node as { metadata?: Record<string, unknown> }).metadata = serialized.metadata;
    }

    builder.addNode(node as any); // Registry returns BaseNode union, cast to Node
  }

  // Reconstruct connections
  for (const conn of dagData.connections) {
    builder.connect(conn.fromNodeId, conn.fromPortId, conn.toNodeId, conn.toPortId, conn.id);
  }

  if (dagData.entryNodeId) {
    builder.setEntryNode(dagData.entryNodeId);
  }

  if (dagData.exitNodeIds) {
    for (const exitId of dagData.exitNodeIds) {
      builder.addExitNode(exitId);
    }
  }

  const dag = builder.build();

  if (verbose) {
    console.log(`[App] DAG loaded: ${dag.nodes.size} nodes, ${dag.connections.length} connections`);
    console.log(`[App] Entry node ID: ${dag.entryNodeId || 'not set'}`);
    console.log(`[App] Node IDs:`, Array.from(dag.nodes.keys()));
    console.log(
      `[App] Connections:`,
      dag.connections.map((c) => `${c.fromNodeId}->${c.toNodeId}`)
    );

    // Check for nodes with no incoming connections
    const nodesWithNoInputs: string[] = [];
    for (const nodeId of dag.nodes.keys()) {
      const incoming = dag.connections.filter((conn) => conn.toNodeId === nodeId);
      if (incoming.length === 0) {
        nodesWithNoInputs.push(nodeId);
      }
    }
    console.log(
      `[App] Nodes with no incoming connections (potential entry nodes):`,
      nodesWithNoInputs
    );
  }

  if (verbose) {
    console.log(`[App] Configuration:`);
    const hasApiKey = process.env.OPENAI_API_KEY;
    console.log(`  - API Key: ${hasApiKey ? 'Set' : 'Not set (will fail for LLM nodes)'}`);
    if (!hasApiKey) {
      console.warn(`[App] WARNING: OPENAI_API_KEY not found in environment variables!`);
    }
  }

  // Create executor
  const executor = new DAGExecutor(dag);

  // Execute with state change callbacks
  const sendLog = (type: LogEntry['type'], message: string, nodeId?: string) => {
    if (onLog) {
      onLog(type, message, nodeId);
    }
    if (verbose) {
      const timestamp = new Date().toISOString();
      console.log(
        `[${timestamp}] [${type.toUpperCase()}] ${message}${nodeId ? ` (${nodeId})` : ''}`
      );
    }
  };

  sendLog('info', 'Starting DAG execution...');
  sendLog(
    'info',
    `DAG contains ${dag.nodes.size} node(s) and ${dag.connections.length} connection(s)`
  );

  const startTime = Date.now();

  try {
    await executor.execute((nodeId: string, state: ExecutionState) => {
      const node = dag.nodes.get(nodeId);
      const nodeLabel = node?.label || nodeId;

      if (state === 'running') {
        sendLog('info', `Executing node: ${nodeLabel}`, nodeId);
      } else if (state === 'completed') {
        sendLog('success', `Completed: ${nodeLabel}`, nodeId);

        // Check for console logs from console nodes
        if (node?.type === DEFAULT_NODE_TYPES.CONSOLE) {
          const context = executor.getContext();
          const outputs = context.nodeOutputs.get(nodeId);
          const consoleLogs = outputs?.get('_console_logs');
          if (consoleLogs && Array.isArray(consoleLogs)) {
            consoleLogs.forEach((log: string) => {
              sendLog('console', log, nodeId);
            });
          }
        }
      } else if (state === 'failed') {
        const error = executor.getNodeError(nodeId);
        sendLog('error', `Failed: ${nodeLabel} - ${error?.message || 'Unknown error'}`, nodeId);
      }
    });

    const duration = Date.now() - startTime;

    // Get final states
    const allStates = executor.getAllNodeStates();
    const failedNodes: Array<[string, 'failed']> = [];
    for (const [nodeId, state] of allStates.entries()) {
      if (state === 'failed') {
        failedNodes.push([nodeId, state]);
      }
    }

    if (failedNodes.length > 0) {
      sendLog(
        'error',
        `DAG execution completed with ${failedNodes.length} failure(s) in ${duration}ms`
      );
      for (const [nodeId] of failedNodes) {
        const node = dag.nodes.get(nodeId);
        const error = executor.getNodeError(nodeId);
        sendLog('error', `${node?.label || nodeId}: ${error?.message || 'Unknown error'}`, nodeId);
      }
      if (!onLog) {
        // Only exit if not being called from server (CLI mode)
        process.exit(1);
      }
    } else {
      sendLog('success', `DAG execution completed successfully in ${duration}ms`);
      if (!onLog) {
        // Only exit if not being called from server (CLI mode)
        process.exit(0);
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    sendLog(
      'error',
      `DAG execution failed after ${duration}ms: ${error instanceof Error ? error.message : String(error)}`
    );
    if (verbose && error instanceof Error) {
      sendLog('error', `Stack: ${error.stack}`, undefined);
    }
    if (!onLog) {
      // Only exit if not being called from server (CLI mode)
      process.exit(1);
    }
    throw error;
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Composable Search DAG Executor

Usage:
  npm run execute -- --file <dag-file.json> [options]
  npm run execute -- --json '<dag-json-string>' [options]

Options:
  --file, -f <path>        Path to DAG JSON file
  --json, -j <string>      DAG JSON string
  --verbose, -v            Enable verbose logging
  --help, -h               Show this help message

Environment Variables:
  OPENAI_API_KEY           OpenAI API key for LLM nodes

Examples:
  npm run execute -- --file ./dag.json
  npm run execute -- --file ./dag.json --verbose
  npm run execute -- --file ./dag.json
    `);
    process.exit(0);
  }

  const options: ExecutionOptions = {
    verbose: args.includes('--verbose') || args.includes('-v'),
  };

  // Parse file or JSON
  const fileIndex = args.findIndex((arg) => arg === '--file' || arg === '-f');
  const jsonIndex = args.findIndex((arg) => arg === '--json' || arg === '-j');

  if (fileIndex !== -1 && args[fileIndex + 1]) {
    options.dagFile = args[fileIndex + 1];
  } else if (jsonIndex !== -1 && args[jsonIndex + 1]) {
    options.dagJson = args[jsonIndex + 1];
  } else {
    console.error('Error: Either --file or --json must be provided');
    process.exit(1);
  }

  // Execute
  await executeDAG(options);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { executeDAG };
