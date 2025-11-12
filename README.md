# Composable Search

A system for building and visualizing Directed Acyclic Graphs (DAGs) with a fluent API, visual editor, and playground.

## Project Structure

> **Note:** Before running any commands, make sure to install dependencies from the root directory:
>
> ```bash
> npm install
> ```

This project is divided into four parts:

### 1. SDK (`sdk/`)

The core SDK for building DAGs programmatically with a fluent API. Can be used as a library in other projects.

**Features:**

- Fluent API for constructing DAGs
- Support for multiple node types: Source, Transformer, Terminal nodes
- JSON serialization/deserialization
- DAG validation and execution

**Usage:**

```typescript
import {
  LiteralSourceNode,
  ConsoleTerminalNode,
  SimpleLLMTransformerNode,
} from '@composable-search/sdk';

const dag = new LiteralSourceNode('input', { value: 'Hello' })
  .pipe(new SimpleLLMTransformerNode('llm', { model: 'openai/gpt-4o-mini', prompt: '${input}' }))
  .terminate(new ConsoleTerminalNode('output'));
```

### 2. App (`app/`)

A Node.js application for executing DAGs defined in JSON format. Provides both CLI and HTTP server interfaces.

**Features:**

- Command-line interface for executing DAGs
- HTTP server with Server-Sent Events for streaming execution logs
- Integration with UI for executing DAGs

**Configuration:**

The executor requires environment variables for certain operations. Create a `.env` file in the `app` directory:

```env
# Required for LLM Nodes
OPENAI_API_KEY=sk-your-api-key-here

# Required for Exa Search Nodes
EXA_API_KEY=your-exa-api-key-here

# Optional: HTTP server port (default: 3001)
PORT=3001
```

**CLI Usage:**

From the root directory (using workspace):

```bash
# Execute from file
npm run execute --workspace=app -- --file ./dag.json
# or using short form
npm run execute --workspace=app -- -f ./dag.json

# Execute with verbose logging
npm run execute --workspace=app -- --file ./dag.json --verbose
# or using short form
npm run execute --workspace=app -- -f ./dag.json -v

# Execute from JSON string
npm run execute --workspace=app -- --json '{"nodes":[...],"edges":[...]}'
# or using short form
npm run execute --workspace=app -- -j '{"nodes":[...],"edges":[...]}'

# Show help
npm run execute --workspace=app -- --help
```

From the `app` directory:

```bash
cd app
npm run execute -- --file ./dag.json
npm run execute -- -f ./dag.json  # short form
npm run execute -- --file ./dag.json --verbose  # verbose logging
```

**HTTP Server:**

Start the HTTP server for executing DAGs via API:

```bash
npm run dev:app  # Development mode with hot-reload
# Or for production:
cd app && npm run build && npm start
```

The server runs on `http://localhost:3001` by default.

**Execute DAG Endpoint:**

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

### 3. UI (`ui/`)

A visual drag-and-drop editor for creating DAGs. Uses the SDK and can save/load DAGs as JSON. Requires the App HTTP server to be running for execution.

**Features:**

- Drag-and-drop node creation
- Visual connection between nodes
- Save DAGs as JSON
- Load DAGs from JSON
- Execute DAGs via HTTP server
- Color-coded node types
- Minimap and controls

**Usage:**

```bash
npm run dev:ui
```

The UI will be available at `http://localhost:3000` (or the port shown in the terminal).

> **Note:** Make sure the App HTTP server is running (`npm run dev:app`) before executing DAGs from the UI.

**Loading a DAG:**

1. Click **"Load DAG from JSON"** in the toolbar
2. Paste your DAG JSON into the text area
3. Click **"Load"**

The DAG will be loaded into the visual editor where you can view and edit it.

**Executing a DAG:**

1. Ensure the HTTP server is running (see [App HTTP Server](#2-app-app) section)
2. Click **"Run DAG"** in the toolbar
3. Execution logs will appear in the log panel on the right side

See [`ui/README.md`](ui/README.md) for more details about the visual editor.

### 4. Playground (`playground/`)

A code playground for testing the SDK manually. Edit the code and see results interactively.

**Usage:**

```bash
npm run dev:playground
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Build SDK

```bash
npm run build:sdk
```

### Run App (HTTP Server)

```bash
npm run dev:app
```

### Run UI

```bash
npm run dev:ui
```

> **Note:** Make sure the App HTTP server is running before executing DAGs from the UI.

### Run Playground

```bash
npm run dev:playground
```

> **Tip:** For more advanced experiments, you can directly edit the DAG definitions and see results interactively in [`playground/src/index.ts`](playground/src/index.ts). This will watch for changes and re-run your code as you edit the playground file.

## Node Types

### Source Nodes

- **Literal** - Static string value
- **Dataset** - Array of objects

### Transformer Nodes

- **Simple LLM** - OpenAI LLM calls with system/prompt
- **Structured LLM** - LLM calls with JSON schema output
- **Map** - Transform each item in an array using a subgraph
- **FlatMap** - Transform and flatten arrays using a subgraph
- **Extract** - Extract a property from objects
- **Filter** - Filter arrays based on an expression
- **Dedupe** - Remove duplicates from arrays
- **Cache** - Cache values by property
- **Peek** - Inspect data without modifying it
- **Exa Search** - Search using Exa API
- **Agent** - Agent with tool calling capabilities

### Terminal Nodes

- **Console** - Output to console

## Fluent API Examples

### Simple Chain

```typescript
import {
  LiteralSourceNode,
  ConsoleTerminalNode,
  SimpleLLMTransformerNode,
} from '@composable-search/sdk';

const dag = new LiteralSourceNode('input', { value: 'Hello, World!' })
  .pipe(
    new SimpleLLMTransformerNode('llm', {
      model: 'openai/gpt-4o-mini',
      prompt: 'Capitalize this: ${input}',
    })
  )
  .terminate(new ConsoleTerminalNode('output'));
```

### Map with Subgraph

```typescript
import {
  DatasetSourceNode,
  ConsoleTerminalNode,
  MapTransformerNode,
  ExtractTransformerNode,
} from '@composable-search/sdk';

const dag = new DatasetSourceNode('data', {
  value: [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
  ],
})
  .pipe(
    new MapTransformerNode('process', new ExtractTransformerNode('extract', { property: 'name' }))
  )
  .terminate(new ConsoleTerminalNode('output'));
```

### Complex Example with FlatMap and Filter

```typescript
import {
  LiteralSourceNode,
  ConsoleTerminalNode,
  StructuredLLMTransformerNode,
  FlatMapTransformerNode,
  ExaSearchTransformerNode,
  DedupeTransformerNode,
  FilterTransformerNode,
} from '@composable-search/sdk';
import { z } from 'zod';

const dag = new LiteralSourceNode('query', { value: 'What is TypeScript?' })
  .pipe(
    new StructuredLLMTransformerNode('generateVariants', {
      model: 'openai/gpt-4o-mini',
      prompt: 'Generate 3 search query variants: ${input}',
      schema: z.array(z.string()),
    })
  )
  .pipe(
    new FlatMapTransformerNode(
      'search',
      new ExaSearchTransformerNode('exa_search', { type: 'fast', numResults: 5 })
    )
  )
  .pipe(new DedupeTransformerNode('dedupe', { byProperty: 'url', method: 'first' }))
  .pipe(
    new FilterTransformerNode('filter', { expression: 'input.text && input.text.length > 100' })
  )
  .terminate(new ConsoleTerminalNode('output'));
```

## JSON Serialization

DAGs can be serialized to JSON for storage and transmission:

```typescript
import { serializeStandAloneNode, executeDAG } from '@composable-search/sdk';

const dag = new LiteralSourceNode('input', { value: 'Hello' }).terminate(
  new ConsoleTerminalNode('output')
);

const serializedDAG = serializeStandAloneNode(dag);
// Save or transmit JSON

await executeDAG(serializedDAG);
```

## Programmatic Execution

You can build and execute DAGs programmatically using the SDK's fluent API with executor registration:

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

## Example DAGs (JSON Format)

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

### Complex Example

Here's a complete example DAG demonstrating advanced features:

```json
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
      "id": "node_8",
      "type": "structured_llm",
      "label": "Query Varient Generator",
      "config": {
        "model": "openai/gpt-4o-mini",
        "schema": {
          "type": "array",
          "items": { "type": "string" },
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
      "id": "node_6",
      "type": "console",
      "label": "Console"
    }
  ],
  "edges": [
    { "from": "node_5", "to": "node_8" },
    { "from": "node_8", "to": "node_16" },
    { "from": "node_16", "to": "node_18" },
    { "from": "node_18", "to": "node_6" }
  ]
}
```

This DAG demonstrates:

- Query generation with structured LLM
- Multi-query search using flatmap and Exa search
- Deduplication by URL

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

## Development

### Build for Production

```bash
cd app && npm run build
```

Outputs compiled JavaScript to `dist/`.

### Run Production Build

```bash
cd app && npm start
```

## License

ISC
