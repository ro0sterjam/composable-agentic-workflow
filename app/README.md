# Composable Search DAG Executor

A Node.js application for executing DAGs defined in JSON format. This allows DAGs created in the UI to be executed server-side, which is necessary for LLM nodes and other server-side operations.

## Installation

```bash
npm install
```

## Usage

### Execute a DAG from a JSON file

```bash
npm run execute -- --file ./dag.json
```

### Execute with verbose logging

```bash
npm run execute -- --file ./dag.json --verbose
```

### Execute with custom timeout

```bash
npm run execute -- --file ./dag.json --timeout 60000
```

### Execute from JSON string

```bash
npm run execute -- --json '{"nodes":[...],"connections":[...]}'
```

## Configuration

The executor uses environment variables for configuration:

- `OPENAI_API_KEY`: Required for LLM nodes. Set this in your `.env` file or export it.

Example `.env` file:
```
OPENAI_API_KEY=sk-...
```

## Development

```bash
npm run dev
```

This will watch for changes and automatically restart the executor.

## Building

```bash
npm run build
```

## API

The module exports an `executeDAG` function that can be used programmatically:

```typescript
import { executeDAG } from '@composable-search/app';

await executeDAG({
  dagFile: './dag.json',
  verbose: true,
  config: {
    runtime: {
      timeout: 60000,
    },
  },
});
```

