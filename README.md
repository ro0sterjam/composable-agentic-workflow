# Composable Search

A system for building and visualizing Directed Acyclic Graphs (DAGs) with a fluent API, visual editor, and playground.

## Project Structure

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

### 2. UI (`ui/`)

A visual drag-and-drop editor for creating DAGs. Uses the SDK and can save/load DAGs as JSON.

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
cd ui
npm install
npm run dev
```

### 3. App (`app/`)

A Node.js application for executing DAGs defined in JSON format. Provides both CLI and HTTP server interfaces.

**Features:**

- Command-line interface for executing DAGs
- HTTP server with Server-Sent Events for streaming execution logs
- Integration with UI for executing DAGs

**Usage:**

```bash
cd app
npm install
npm run dev  # Start HTTP server
npm run execute -- --file ./dag.json  # Execute from CLI
```

See [`app/README.md`](app/README.md) for detailed documentation.

### 4. Playground (`playground/`)

A code playground for testing the SDK manually. Edit the code and see results interactively.

**Usage:**

```bash
cd playground
npm install
npm run dev
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

1. **Execution** ⚙️ - Takes input and produces output
2. **Conditional** ❓ - Branches based on a condition
3. **Loop** 🔁 - Iterates over a sub-DAG
4. **Fan Out** 🔀 - Duplicates input to multiple paths
5. **Aggregator** 📊 - Combines multiple inputs into one output

## Fluent API Examples

### Simple Chain

```typescript
const dag = new FluentDAGBuilder('chain')
  .execution('step1', async (input) => input)
  .to('step2', 'input')
  .execution('step2', async (input) => input)
  .build();
```

### Conditional Branching

```typescript
const dag = new FluentDAGBuilder('conditional')
  .execution('start', async (input) => input)
  .to('check', 'input')
  .conditional('check', async (input: any) => input.value > 10)
  .toTrue('high', 'input')
  .toFalse('low', 'input')
  .execution('high', async (input) => ({ result: 'HIGH' }))
  .execution('low', async (input) => ({ result: 'LOW' }))
  .build();
```

### Fan-out and Aggregator

```typescript
const dag = new FluentDAGBuilder('fanout')
  .execution('source', async (input) => input)
  .to('fanout', 'input')
  .fanOut('fanout', 3)
  .toPort('output0', 'process1', 'input')
  .toPort('output1', 'process2', 'input')
  .toPort('output2', 'process3', 'input')
  .execution('process1', async (input) => input)
  .to('aggregate', 'input')
  .execution('process2', async (input) => input)
  .to('aggregate', 'input')
  .execution('process3', async (input) => input)
  .to('aggregate', 'input')
  .aggregator('aggregate', async (inputs) => ({ results: inputs }))
  .build();
```

## JSON Serialization

DAGs can be serialized to JSON for storage and transmission:

```typescript
import { serializeDAG, deserializeDAG } from '@composable-search/sdk';

const dag = new FluentDAGBuilder('my-dag').execution('node1', async (input) => input).build();

const json = serializeDAG(dag);
// Save or transmit JSON

const restoredDag = deserializeDAG(json);
```

## License

ISC
