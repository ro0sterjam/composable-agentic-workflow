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

import { ConsoleTerminalExecutor } from '../../sdk/src/executors/console.js';
import { LiteralSourceExecutor } from '../../sdk/src/executors/literal.js';
import { SimpleLLMExecutor } from '../../sdk/src/executors/llm.js';
import {
  executeDAG,
  type SerializedDAG,
  type NodeExecutionResult,
  defaultExecutorRegistry,
} from '../../sdk/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

export interface LogEntry {
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
async function executeDAGFromFile(options: ExecutionOptions): Promise<void> {
  const { dagFile, dagJson, verbose = false, onLog } = options;

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

  // Register executors with custom logging for console terminal
  defaultExecutorRegistry.registerSource('literal', new LiteralSourceExecutor());
  defaultExecutorRegistry.registerTerminal(
    'console',
    new ConsoleTerminalExecutor((message: string, data: unknown) => {
      // Send log through the app's logging system
      const logMessage = `${message} ${typeof data === 'string' ? data : JSON.stringify(data)}`;
      sendLog('console', logMessage);
    })
  );
  defaultExecutorRegistry.registerTransformer('simple_llm', new SimpleLLMExecutor());

  // Load DAG
  let serializedDAG: SerializedDAG;
  if (dagFile) {
    const filePath = resolve(process.cwd(), dagFile);
    if (verbose) {
      console.log(`[App] Loading DAG from file: ${filePath}`);
    }
    const fileContent = readFileSync(filePath, 'utf-8');
    serializedDAG = JSON.parse(fileContent) as SerializedDAG;
  } else if (dagJson) {
    if (verbose) {
      console.log(`[App] Loading DAG from JSON string`);
    }
    serializedDAG = typeof dagJson === 'string' ? JSON.parse(dagJson) : dagJson;
  } else {
    throw new Error('Either dagFile or dagJson must be provided');
  }

  if (verbose) {
    console.log(
      `[App] DAG loaded: ${serializedDAG.nodes.length} nodes, ${serializedDAG.edges.length} edges`
    );
    console.log(
      `[App] Node IDs:`,
      serializedDAG.nodes.map((n) => n.id)
    );
    console.log(
      `[App] Edges:`,
      serializedDAG.edges.map((e) => `${e.from}->${e.to}`)
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

  sendLog('info', 'Starting DAG execution...');
  sendLog(
    'info',
    `DAG contains ${serializedDAG.nodes.length} node(s) and ${serializedDAG.edges.length} edge(s)`
  );

  const startTime = Date.now();

  try {
    const result = await executeDAG(serializedDAG, {
      onNodeComplete: (nodeId: string, nodeResult: NodeExecutionResult) => {
        const node = serializedDAG.nodes.find((n) => n.id === nodeId);
        const nodeLabel = node?.label || nodeId;

        if (nodeResult.error) {
          sendLog('error', `Failed: ${nodeLabel} - ${nodeResult.error.message}`, nodeId);
        } else {
          sendLog('success', `Completed: ${nodeLabel}`, nodeId);

          // Check for console output
          if (node?.type === 'console' && nodeResult.output !== undefined) {
            sendLog('console', String(nodeResult.output), nodeId);
          }
        }
      },
    });

    const duration = Date.now() - startTime;

    // Check for failures
    const failedNodes: Array<[string, NodeExecutionResult]> = [];
    for (const [nodeId, nodeResult] of result.results.entries()) {
      if (nodeResult.error) {
        failedNodes.push([nodeId, nodeResult]);
      }
    }

    if (failedNodes.length > 0) {
      sendLog(
        'error',
        `DAG execution completed with ${failedNodes.length} failure(s) in ${duration}ms`
      );
      for (const [nodeId, nodeResult] of failedNodes) {
        const node = serializedDAG.nodes.find((n) => n.id === nodeId);
        sendLog(
          'error',
          `${node?.label || nodeId}: ${nodeResult.error?.message || 'Unknown error'}`,
          nodeId
        );
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
  --json, -j <string>       DAG JSON string
  --verbose, -v             Enable verbose logging
  --help, -h                Show this help message

Environment Variables:
  OPENAI_API_KEY            OpenAI API key for LLM nodes

Examples:
  npm run execute -- --file ./dag.json
  npm run execute -- --file ./dag.json --verbose
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
  await executeDAGFromFile(options);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { executeDAGFromFile };
