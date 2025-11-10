# DAG Visual Editor

A drag-and-drop visual editor for creating and editing Directed Acyclic Graphs (DAGs), similar to Lucidchart.

## Features

- **Drag & Drop Nodes**: Drag nodes from the sidebar onto the canvas
- **Click to Add**: Click node types in the sidebar to add them at the center
- **Connect Nodes**: Click and drag from output handles to input handles to create connections
- **Visual Feedback**: Color-coded nodes by type with icons
- **Minimap**: Navigate large graphs easily
- **Save/Load**: Save your DAG structure (currently to localStorage)

## Node Types

1. **Execution** ⚙️ - Takes input and produces output
2. **Conditional** ❓ - Branches based on a condition
3. **Loop** 🔁 - Iterates over a sub-DAG
4. **Fan Out** 🔀 - Duplicates input to multiple paths
5. **Aggregator** 📊 - Combines multiple inputs into one output

## Usage

### Start the Development Server

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Creating a DAG

1. **Add Nodes**: 
   - Drag a node type from the left sidebar onto the canvas, OR
   - Click a node type in the sidebar to add it at the center

2. **Connect Nodes**:
   - Hover over a node to see input/output handles (blue circles)
   - Click and drag from an output handle (right side, green) to an input handle (left side, blue)
   - Release to create the connection

3. **Move Nodes**:
   - Click and drag nodes to reposition them

4. **Save**:
   - Click the "Save DAG" button in the toolbar
   - Check the browser console for the DAG structure
   - The visual state is saved to localStorage

### Controls

- **Zoom**: Use mouse wheel or the zoom controls in the bottom-right
- **Pan**: Click and drag the background
- **Minimap**: Use the minimap in the bottom-right to navigate
- **Fit View**: The canvas automatically fits all nodes on load

## Architecture

- **React Flow**: Used for the canvas and node rendering
- **TypeScript**: Full type safety
- **Vite**: Fast development server and build tool
- **DAG Builder**: Backend DAG structure synced with visual representation

## Next Steps

- [ ] Node property editing (double-click nodes)
- [ ] Delete nodes and connections
- [ ] Undo/Redo functionality
- [ ] Export/Import DAG as JSON
- [ ] Execution engine integration
- [ ] Real-time validation feedback

