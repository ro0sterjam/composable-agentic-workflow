# Composable Search DAG Executor

A Node.js application for executing Directed Acyclic Graphs (DAGs) defined in JSON format. This application provides both a command-line interface and an HTTP server for executing DAGs created in the visual editor or programmatically.

## Overview

The DAG Executor is the runtime engine for Composable Search workflows. It executes DAGs that can include:

- **Source Nodes**: Literal values, datasets
- **Transformer Nodes**: LLM calls, data transformations, filtering, extraction, mapping, deduplication, caching
- **Terminal Nodes**: Console output
- **Advanced Nodes**: Agents with tool calling, Exa search integration

DAGs created in the visual UI can be saved as JSON and executed server-side, which is necessary for LLM operations and other server-side processing.

## Installation

```bash
npm install
```

## Configuration

The executor requires environment variables for certain operations:

### Required for LLM Nodes

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

### Required for Exa Search Nodes

```bash
EXA_API_KEY=your-exa-api-key-here
```

Create a `.env` file in the `app` directory:

```env
OPENAI_API_KEY=sk-...
EXA_API_KEY=your-exa-api-key-here
```

### Optional Configuration

- `PORT`: HTTP server port (default: `3001`)

## Usage

### Command-Line Interface

**Important:** Run commands from the `app` directory, or use the workspace command from the root.

From the `app` directory:

```bash
cd app
npm run execute -- --file ./dag.json
# or using short form
npm run execute -- -f ./dag.json
```

From the root directory (using workspace):

```bash
npm run execute --workspace=app -- --file ./dag.json
# or using short form
npm run execute --workspace=app -- -f ./dag.json
```

Execute with verbose logging:

```bash
# From app directory
npm run execute -- --file ./dag.json --verbose
# or using short forms
npm run execute -- -f ./dag.json -v

# From root directory
npm run execute --workspace=app -- --file ./dag.json --verbose
```

Execute from a JSON string:

```bash
# From app directory
npm run execute -- --json '{"nodes":[...],"edges":[...]}'
# or using short form
npm run execute -- -j '{"nodes":[...],"edges":[...]}'
```

Show help:

```bash
npm run execute -- --help
# or
npm run execute -- -h
```

### HTTP Server

Start the HTTP server for executing DAGs via API:

```bash
npm run dev
# or for production
npm run build
npm start
```

The server runs on `http://localhost:3001` by default.

#### Execute DAG Endpoint

**POST** `/api/execute`

Execute a DAG and receive logs via Server-Sent Events (SSE).

**Request Body:**

```json
{
  "dagJson": {
    "nodes": [
      {
        "id": "node1",
        "type": "literal",
        "label": "Input",
        "config": {
          "value": "Hello, World!"
        }
      },
      {
        "id": "node2",
        "type": "console",
        "label": "Output"
      }
    ],
    "edges": [
      {
        "from": "node1",
        "to": "node2"
      }
    ]
  }
}
```

**Response:** Server-Sent Events stream with execution logs

**Example with curl:**

```bash
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "dagJson": {
      "nodes": [
        {"id": "n1", "type": "literal", "config": {"value": "test"}},
        {"id": "n2", "type": "console"}
      ],
      "edges": [{"from": "n1", "to": "n2"}]
    }
  }'
```

### Visual UI Editor

The Composable Search UI provides a visual drag-and-drop editor for creating, editing, and executing DAGs.

#### Launching the UI

> **Note:** The UI requires that the `app` HTTP server is running in order to execute DAGs. Make sure to start `app` (see [HTTP Server](#http-server) section) before running DAGs from the UI.

From the root directory:

```bash
npm run dev:ui
```

Or from the `ui` directory:

```bash
cd ui
npm install
npm run dev
```

The UI will be available at `http://localhost:3000` (or the port shown in the terminal).

#### Loading a DAG

1. Click **"Load DAG from JSON"** in the toolbar
2. Paste your DAG JSON into the text area
3. Click **"Load"**

The DAG will be loaded into the visual editor where you can view and edit it.

#### Executing a DAG

1. Ensure the HTTP server is running (see [HTTP Server](#http-server) section)
2. Click **"Run DAG"** in the toolbar
3. Execution logs will appear in the log panel on the right side

#### Sample DAG

Here's a complete example DAG you can load into the UI:

````json
{
  "nodes": [
    {
      "id": "node_5",
      "type": "literal",
      "label": "Query",
      "config": {
        "value": "How many runs did each of the bluejays players make in the 2025 world series?"
      }
    },
    {
      "id": "node_6",
      "type": "console",
      "label": "Console"
    },
    {
      "id": "node_8",
      "type": "structured_llm",
      "label": "Query Varient Generator",
      "config": {
        "model": "openai/gpt-4o-mini",
        "schema": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "$schema": "http://json-schema.org/draft-07/schema#"
        },
        "prompt": "Generate 5 variants of the following query: ${input}"
      }
    },
    {
      "id": "node_16",
      "type": "flatmap",
      "label": "Flatmap",
      "config": {
        "parallel": true,
        "transformerId": "node_17"
      }
    },
    {
      "id": "node_17",
      "type": "exa_search",
      "label": "Exa search",
      "config": {
        "type": "fast",
        "numResults": 10
      }
    },
    {
      "id": "node_18",
      "type": "dedupe",
      "label": "Dedupe",
      "config": {
        "method": "first",
        "byProperty": "url"
      }
    },
    {
      "id": "node_19",
      "type": "cache",
      "label": "Cache Query",
      "config": {
        "property": "query"
      }
    },
    {
      "id": "node_20",
      "type": "map",
      "label": "Map",
      "config": {
        "parallel": true,
        "transformerId": "node_21"
      }
    },
    {
      "id": "node_21",
      "type": "extract",
      "label": "Extract",
      "config": {
        "property": "text"
      }
    },
    {
      "id": "node_22",
      "type": "structured_llm",
      "label": "Summary",
      "config": {
        "model": "openai/gpt-4o-mini",
        "schema": {
          "type": "string",
          "$schema": "http://json-schema.org/draft-07/schema#"
        },
        "prompt": "From the original query: \"${dagContext.cache.query}\", generate a summary of the following text: \\n\\n```\\n${input}\\n```\\n\\n. If the text doesn't relate to the query, return \"No answer found\"."
      }
    },
    {
      "id": "node_23",
      "type": "filter",
      "label": "Filter",
      "config": {
        "expression": "input !== 'No answer found'"
      }
    },
    {
      "id": "node_28",
      "type": "agent",
      "label": "Agent",
      "config": {
        "model": "openai/gpt-4o-mini",
        "tools": [
          {
            "name": "multi_query_search",
            "description": "Performs a multi-query search and returns the results",
            "inputSchema": {
              "type": "string"
            },
            "transformerId": "node_8"
          }
        ],
        "maxLoops": 3,
        "schema": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "player": {
                "type": "string"
              },
              "runs": {
                "type": "number"
              }
            },
            "required": ["player", "runs"]
          },
          "$schema": "http://json-schema.org/draft-07/schema#"
        }
      }
    }
  ],
  "edges": [
    {
      "from": "node_8",
      "to": "node_16"
    },
    {
      "from": "node_18",
      "to": "node_20"
    },
    {
      "from": "node_20",
      "to": "node_23"
    },
    {
      "from": "node_19",
      "to": "node_28"
    },
    {
      "from": "node_28",
      "to": "node_6"
    },
    {
      "from": "node_5",
      "to": "node_19"
    },
    {
      "from": "node_16",
      "to": "node_18"
    },
    {
      "from": "node_21",
      "to": "node_22"
    }
  ]
}
````

This DAG demonstrates:

- Query generation with structured LLM
- Multi-query search using flatmap and Exa search
- Deduplication by URL
- Parallel processing with map
- Text extraction and summarization
- Filtering results
- Agent with tool calling for final answer extraction

## Programmatic Usage

Build and execute DAGs programmatically using the SDK's fluent API:

```typescript
import {
  LiteralSourceNode,
  ConsoleTerminalNode,
  SimpleLLMTransformerNode,
  serializeStandAloneNode,
  executeDAG,
  defaultExecutorRegistry,
  setLogger,
  TerminalLogger,
  SimpleLLMExecutor,
  LiteralSourceExecutor,
  ConsoleTerminalExecutor,
} from '@composable-search/sdk';

// Register executors
defaultExecutorRegistry.registerSource('literal', new LiteralSourceExecutor());
defaultExecutorRegistry.registerTerminal('console', new ConsoleTerminalExecutor());
defaultExecutorRegistry.registerTransformer('simple_llm', new SimpleLLMExecutor());

// Set up logging
setLogger(new TerminalLogger('debug'));

// Build a simple DAG: literal -> LLM -> console
const dag = new LiteralSourceNode('input', { value: 'Hello, World!' })
  .pipe(
    new SimpleLLMTransformerNode('llm', {
      model: 'openai/gpt-4o-mini',
      prompt: 'Capitalize this: ${input}',
    })
  )
  .terminate(new ConsoleTerminalNode('output'));

// Serialize and execute
const serializedDAG = serializeStandAloneNode(dag);
const result = await executeDAG(serializedDAG, {
  onNodeComplete: (nodeId, nodeResult) => {
    if (nodeResult.error) {
      console.error(`Node ${nodeId} failed:`, nodeResult.error.message);
    } else {
      console.log(`Node ${nodeId} completed:`, nodeResult.output);
    }
  },
});

console.log('Execution success:', result.success);
```

### More Complex Example

```typescript
import {
  DatasetSourceNode,
  ConsoleTerminalNode,
  StructuredLLMTransformerNode,
  MapTransformerNode,
  ExtractTransformerNode,
  serializeStandAloneNode,
  executeDAG,
} from '@composable-search/sdk';
import { z } from 'zod';

// Build a DAG that processes an array of items
const dag = new DatasetSourceNode('data', {
  value: [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
  ],
})
  .pipe(
    new MapTransformerNode(
      'process',
      new ExtractTransformerNode('extract', { property: 'name' }).pipe(
        new StructuredLLMTransformerNode('format', {
          model: 'openai/gpt-4o-mini',
          prompt: 'Format this name nicely: ${input}',
          schema: z.string(),
        })
      )
    )
  )
  .terminate(new ConsoleTerminalNode('output'));

const serializedDAG = serializeStandAloneNode(dag);
await executeDAG(serializedDAG);
```

## Supported Node Types

### Source Nodes

- **`literal`**: Static string value
- **`dataset`**: Array of objects (JSON array)

### Transformer Nodes

- **`simple_llm`**: OpenAI LLM calls with system/prompt
- **`structured_llm`**: LLM calls with JSON schema output
- **`map`**: Transform each item in an array using a subgraph
- **`flatmap`**: Transform and flatten arrays using a subgraph
- **`extract`**: Extract a property from objects
- **`filter`**: Filter arrays based on an expression
- **`dedupe`**: Remove duplicates from arrays
- **`cache`**: Cache values by property
- **`peek`**: Inspect data without modifying it
- **`exa_search`**: Search using Exa API
- **`agent`**: Agent with tool calling capabilities

### Terminal Nodes

- **`console`**: Output to console

## Example DAGs

### Simple Chain

```json
{
  "nodes": [
    {
      "id": "input",
      "type": "literal",
      "label": "Input",
      "config": {
        "value": "Hello, World!"
      }
    },
    {
      "id": "llm",
      "type": "simple_llm",
      "label": "Process",
      "config": {
        "model": "openai/gpt-4o-mini",
        "prompt": "Capitalize this: ${input}"
      }
    },
    {
      "id": "output",
      "type": "console",
      "label": "Output"
    }
  ],
  "edges": [
    { "from": "input", "to": "llm" },
    { "from": "llm", "to": "output" }
  ]
}
```

### Map with Subgraph

```json
{
  "nodes": [
    {
      "id": "dataset",
      "type": "dataset",
      "label": "Data",
      "config": {
        "value": [
          { "name": "Alice", "age": 30 },
          { "name": "Bob", "age": 25 }
        ]
      }
    },
    {
      "id": "map",
      "type": "map",
      "label": "Transform",
      "config": {
        "transformerId": "extract",
        "parallel": true
      }
    },
    {
      "id": "extract",
      "type": "extract",
      "label": "Extract Name",
      "config": {
        "property": "name"
      }
    },
    {
      "id": "output",
      "type": "console",
      "label": "Output"
    }
  ],
  "edges": [
    { "from": "dataset", "to": "map" },
    { "from": "map", "to": "output" }
  ]
}
```

## Development

### Run in Development Mode

```bash
npm run dev
```

This starts the HTTP server with hot-reload using `tsx watch`.

### Build for Production

```bash
npm run build
```

Outputs compiled JavaScript to `dist/`.

### Run Production Build

```bash
npm start
```

## Architecture

The executor uses the Composable Search SDK to:

1. **Parse** DAG JSON into executable nodes
2. **Validate** DAG structure and connections
3. **Execute** nodes in topological order
4. **Handle** errors and provide detailed logging
5. **Stream** execution logs via SSE (HTTP server mode)

## Logging

The executor provides detailed logging at multiple levels:

- **Debug**: Detailed execution flow
- **Info**: General execution information
- **Warn**: Warnings and non-fatal issues
- **Error**: Execution errors
- **Success**: Completion messages

Logs can be consumed via:

- Console output (CLI mode)
- Callback functions (programmatic usage)
- Server-Sent Events (HTTP server mode)

## Error Handling

The executor validates DAGs before execution and provides clear error messages for:

- Invalid node types
- Missing required configuration
- Circular dependencies
- Invalid connections
- Execution failures

## License

ISC
