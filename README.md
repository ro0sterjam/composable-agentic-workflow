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

**Usage:**

```bash
npm run dev:app  # Start HTTP server
# Or execute from CLI (from app directory):
cd app && npm run execute -- --file ./dag.json
```

See [`app/README.md`](app/README.md) for detailed documentation.

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

> **Note:** Make sure the App HTTP server is running (`npm run dev:app`) before executing DAGs from the UI.

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

### Run UI

```bash
npm run dev:ui
```

### Run Playground

```bash
npm run dev:playground
```

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

## License

ISC
