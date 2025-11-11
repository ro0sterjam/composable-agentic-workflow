import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  NodeTypes,
  BackgroundVariant,
  ReactFlowInstance,
  OnConnectStart,
  OnConnectEnd,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  NodeType, 
  type SerializedDAG,
  NODE_TYPES,
} from './types';
import { convertToSerializedDAG } from './utils/converter';
import CustomNode from './components/CustomNode';
import Sidebar from './components/Sidebar';
import NodeTypeMenu from './components/NodeTypeMenu';
import NodeEditor, { NodeConfig } from './components/NodeEditor';
import LogPanel, { type LogEntry } from './components/LogPanel';
const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

let nodeIdCounter = 0;
const getNodeId = () => `node_${++nodeIdCounter}`;

const STORAGE_KEY = 'dag-editor-state';
const STORAGE_KEY_COUNTER = 'dag-editor-node-counter';

// Initialize counter from storage
const savedCounter = localStorage.getItem(STORAGE_KEY_COUNTER);
if (savedCounter) {
  nodeIdCounter = parseInt(savedCounter, 10) || 0;
}

type ExecutionState = 'idle' | 'running' | 'completed' | 'failed';

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string; handleId: string; position: { x: number; y: number } } | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const connectionMadeRef = useRef(false);
  const isDraggingConnectionRef = useRef(false);
  const modifierKeyPressedRef = useRef(false);
  
  // Execution state
  const [nodeExecutionStates, setNodeExecutionStates] = useState<Map<string, ExecutionState>>(new Map());
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Pan/selection state
  const [enablePanning, setEnablePanning] = useState(true);
  
  // Undo/Redo state
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false);
  const saveHistoryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    if (isUndoRedoRef.current) return;

    const currentState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };

    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(currentState);
      // Limit history to 50 entries
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [nodes, edges, historyIndex]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex < 0 || history.length === 0) return;

    isUndoRedoRef.current = true;
    const previousIndex = historyIndex - 1;
    
    if (previousIndex >= 0) {
      const previousState = history[previousIndex];
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      setHistoryIndex(previousIndex);
    } else {
      // Clear everything
      setNodes([]);
      setEdges([]);
      setHistoryIndex(-1);
    }

    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 100);
  }, [history, historyIndex, setNodes, setEdges]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    isUndoRedoRef.current = true;
    const nextIndex = historyIndex + 1;
    const nextState = history[nextIndex];
    
    setNodes(nextState.nodes);
    setEdges(nextState.edges);
    setHistoryIndex(nextIndex);

    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 100);
  }, [history, historyIndex, setNodes, setEdges]);

  // Keyboard event handler for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Z (undo) or Cmd+Z on Mac
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      // Check for Ctrl+Shift+Z or Ctrl+Y (redo) or Cmd+Shift+Z on Mac
      if ((event.ctrlKey || event.metaKey) && ((event.shiftKey && event.key === 'z') || event.key === 'y')) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  // Track modifier key state for panning/selection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        modifierKeyPressedRef.current = true;
        setEnablePanning(false); // Disable panning, enable selection
        const pane = document.querySelector('.react-flow__pane') as HTMLElement;
        if (pane) {
          pane.style.cursor = 'crosshair'; // Selection box cursor
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) {
        modifierKeyPressedRef.current = false;
        setEnablePanning(true); // Enable panning, disable selection
        const pane = document.querySelector('.react-flow__pane') as HTMLElement;
        if (pane) {
          pane.style.cursor = 'grab'; // Default panning cursor
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Set initial cursor
    const pane = document.querySelector('.react-flow__pane') as HTMLElement;
    if (pane) {
      pane.style.cursor = 'grab';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const onConnectStart: OnConnectStart = useCallback((event, { nodeId, handleId }) => {
    if (handleId === 'output' && nodeId) {
      connectionMadeRef.current = false;
      isDraggingConnectionRef.current = true;
      const mouseEvent = event as unknown as MouseEvent;
      setConnectionStart({
        nodeId,
        handleId,
        position: { x: mouseEvent.clientX, y: mouseEvent.clientY },
      });
      // Don't show menu during drag - only after release
      setMenuPosition(null);
    }
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback(
    (event) => {
      if (!connectionStart) return;
      isDraggingConnectionRef.current = false;

      // If a connection was made, hide menu
      if (connectionMadeRef.current) {
        setConnectionStart(null);
        setMenuPosition(null);
        connectionMadeRef.current = false;
        return;
      }

      // Connection ended without connecting - show menu at final position
      const mouseEvent = event as MouseEvent;
      setMenuPosition({
        x: mouseEvent.clientX + 10,
        y: mouseEvent.clientY + 10,
      });
    },
    [connectionStart]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      connectionMadeRef.current = true;
      setEdges((eds) => addEdge(params, eds));
      setConnectionStart(null);
      setMenuPosition(null);
      
      // Save to history after a short delay
      if (saveHistoryTimeoutRef.current) {
        clearTimeout(saveHistoryTimeoutRef.current);
      }
      saveHistoryTimeoutRef.current = setTimeout(() => {
        saveToHistory();
      }, 300);
    },
    [setEdges, saveToHistory]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);


  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nodeId = getNodeId();
      const label = type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');

      const newNode: Node = {
        id: nodeId,
        type: 'custom',
        position,
        data: {
          label,
          nodeType: type,
          id: nodeId,
          ...(type === NodeType.LITERAL && { value: '' }),
          ...(type === NodeType.MAP && { mapConfig: { parallel: true } }),
          ...(type === NodeType.FLATMAP && { flatmapConfig: { parallel: true } }),
        },
      };

      setNodes((nds) => nds.concat(newNode));
      
      // Save to history
      setTimeout(() => saveToHistory(), 100);
    },
    [reactFlowInstance, setNodes, saveToHistory]
  );

  const onNodeAdd = useCallback((nodeType: NodeType) => {
    if (!reactFlowInstance) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const position = reactFlowInstance.screenToFlowPosition({
      x: centerX,
      y: centerY,
    });

    const nodeId = getNodeId();
    const label = nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace('_', ' ');

    const newNode: Node = {
      id: nodeId,
      type: 'custom',
      position,
      data: {
        label,
        nodeType,
        id: nodeId,
        ...(nodeType === NodeType.LITERAL && { value: '' }),
      },
    };

    setNodes((nds) => nds.concat(newNode));
    
    // Save to history
    setTimeout(() => saveToHistory(), 100);
  }, [reactFlowInstance, setNodes, saveToHistory]);

  const onSave = useCallback(() => {
    // Serialize to JSON using convertToSerializedDAG
    const serialized = convertToSerializedDAG(nodes, edges);
    console.log('Serialized DAG:', JSON.stringify(serialized, null, 2));
    
    // Save visual state
    localStorage.setItem('dag-editor-state', JSON.stringify({
      nodes,
      edges,
    }));
    
    // Save DAG JSON
    localStorage.setItem('dag-json', JSON.stringify(serialized));
    
    // Create download link
    const blob = new Blob([JSON.stringify(serialized, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dag.json';
    a.click();
    URL.revokeObjectURL(url);
    
    alert('DAG saved! JSON file downloaded.');
  }, [nodes, edges]);

  const addLog = useCallback((type: LogEntry['type'], message: string, nodeId?: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        type,
        message,
        nodeId,
      },
    ]);
  }, []);


  const onRunDAG = useCallback(async () => {
    if (isExecuting) return;

    setIsExecuting(true);
    setNodeExecutionStates(new Map());
    setLogs([]);
    addLog('info', 'Starting DAG execution...');

    try {
      // Convert current React Flow state to SerializedDAG
      const serialized = convertToSerializedDAG(nodes, edges);

      if (serialized.nodes.length === 0) {
        addLog('error', 'No nodes in DAG. Please add some nodes first.');
        setIsExecuting(false);
        return;
      }
      
      // Call server endpoint to execute DAG
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
      const response = await fetch(`${serverUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dagJson: serialized,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get response stream');
      }

      let buffer = '';
      const nodeStates = new Map<string, ExecutionState>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const log: LogEntry = JSON.parse(line.substring(6));
              addLog(log.type, log.message, log.nodeId);
              
              // Update node states based on log messages
              if (log.nodeId) {
                if (log.message.includes('Executing')) {
                  nodeStates.set(log.nodeId, 'running');
                } else if (log.message.includes('Completed')) {
                  nodeStates.set(log.nodeId, 'completed');
                } else if (log.message.includes('Failed')) {
                  nodeStates.set(log.nodeId, 'failed');
                }
              }
            } catch (e) {
              console.error('Failed to parse log:', e);
            }
          }
        }
      }

      // Update all node states
      setNodeExecutionStates(nodeStates);
    } catch (error) {
      addLog('error', `Error executing DAG: ${error instanceof Error ? error.message : String(error)}`);
      console.error('DAG execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting, addLog, nodes, edges]);

  const onLoad = useCallback(() => {
    const saved = localStorage.getItem('dag-json');
    if (saved) {
      try {
        const dagData = JSON.parse(saved);
        // TODO: Implement loading from JSON
        alert('Load functionality coming soon!');
      } catch (e) {
        alert('Error loading DAG: ' + e);
      }
    } else {
      alert('No saved DAG found');
    }
  }, []);

  const onCreateNodeFromConnection = useCallback(
    (nodeType: NodeType) => {
      if (!connectionStart || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: menuPosition!.x,
        y: menuPosition!.y,
      });

      const nodeId = getNodeId();
      const label = nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace('_', ' ');

      const newNode: Node = {
        id: nodeId,
        type: 'custom',
        position,
        data: {
          label,
          nodeType,
          id: nodeId,
          ...(nodeType === NodeType.LITERAL && { value: '' }),
                  ...(nodeType === NodeType.MAP && { mapConfig: { parallel: true } }),
                  ...(nodeType === NodeType.FLATMAP && { flatmapConfig: { parallel: true } }),
        },
      };

      setNodes((nds) => nds.concat(newNode));

      // Connect the original node to the new node
      const connection: Connection = {
        source: connectionStart.nodeId,
        sourceHandle: connectionStart.handleId,
        target: nodeId,
        targetHandle: 'input',
      };

      setEdges((eds) => addEdge(connection, eds));

      setConnectionStart(null);
      setMenuPosition(null);
    },
    [connectionStart, menuPosition, reactFlowInstance, setNodes, setEdges]
  );

  const onNodeEdit = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId);
  }, []);

  const onNodeSave = useCallback(
    (nodeId: string, config: NodeConfig) => {
      // Update the visual node
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...(config.label !== undefined && { label: config.label }),
                  ...(config.value !== undefined && { value: config.value }),
                  ...(config.llmConfig !== undefined && { llmConfig: config.llmConfig }),
                  ...(config.structuredLLMConfig !== undefined && {
                    structuredLLMConfig: config.structuredLLMConfig,
                  }),
                  ...(config.mapConfig !== undefined && {
                    mapConfig: config.mapConfig,
                  }),
                  ...(config.flatmapConfig !== undefined && {
                    flatmapConfig: config.flatmapConfig,
                  }),
                  ...(config.exaSearchConfig !== undefined && {
                    exaSearchConfig: config.exaSearchConfig,
                  }),
                  ...(config.dedupeConfig !== undefined && {
                    dedupeConfig: config.dedupeConfig,
                  }),
                  ...(config.cacheConfig !== undefined && {
                    cacheConfig: config.cacheConfig,
                  }),
                },
              }
            : node
        )
      );

      setEditingNodeId(null);
      
      // Save to history
      setTimeout(() => saveToHistory(), 100);
    },
    [setNodes, saveToHistory]
  );

  // Save state to localStorage whenever nodes or edges change
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      const stateToSave = {
        nodes,
        edges,
        nodeCounter: nodeIdCounter,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      localStorage.setItem(STORAGE_KEY_COUNTER, nodeIdCounter.toString());
    }
  }, [nodes, edges]);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.nodes && parsed.edges) {
          // Restore node counter
          if (parsed.nodeCounter) {
            nodeIdCounter = parsed.nodeCounter;
          }

          // Restore visual state
          setNodes(parsed.nodes || []);
          setEdges(parsed.edges || []);
        }
      } catch (error) {
        console.error('Error loading saved state:', error);
      }
    }
  }, []);

  return (
    <div className="app">
      <div className="toolbar">
        <h1>Composable Search - DAG Editor</h1>
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button type="button" onClick={onSave}>Save DAG as JSON</button>
          <button type="button" onClick={onLoad}>Load DAG from JSON</button>
          <button 
            type="button"
            onClick={onRunDAG} 
            disabled={isExecuting}
            style={{
              backgroundColor: isExecuting ? '#9ca3af' : '#3b82f6',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            {isExecuting ? 'Running...' : 'Run DAG'}
          </button>
        </div>
      </div>
      <div className="editor-container">
        <Sidebar onNodeAdd={onNodeAdd} />
        <div className="flow-container" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes.map((node) => ({
              ...node,
              data: {
                ...node.data,
                executionState: nodeExecutionStates.get(node.id) || 'idle',
                onDoubleClick: onNodeEdit,
              },
            }))}
            edges={edges}
            onNodesChange={(changes) => {
              onNodesChange(changes);
              // Save to history on node deletion or significant changes
              const hasDeletion = changes.some((change) => change.type === 'remove');
              if (hasDeletion) {
                if (saveHistoryTimeoutRef.current) {
                  clearTimeout(saveHistoryTimeoutRef.current);
                }
                saveHistoryTimeoutRef.current = setTimeout(() => {
                  saveToHistory();
                }, 300);
              }
            }}
            onEdgesChange={(changes) => {
              onEdgesChange(changes);
              // Save to history on edge deletion
              const hasDeletion = changes.some((change) => change.type === 'remove');
              if (hasDeletion) {
                if (saveHistoryTimeoutRef.current) {
                  clearTimeout(saveHistoryTimeoutRef.current);
                }
                saveHistoryTimeoutRef.current = setTimeout(() => {
                  saveToHistory();
                }, 300);
              }
            }}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            panOnDrag={enablePanning}
            selectionOnDrag={!enablePanning}
            panOnScroll={true}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>
        <LogPanel logs={logs} />
      </div>
      {menuPosition && (
        <NodeTypeMenu
          position={menuPosition}
          onSelect={onCreateNodeFromConnection}
          onClose={() => {
            setMenuPosition(null);
            setConnectionStart(null);
          }}
        />
      )}
      {editingNodeId && (() => {
            const node = nodes.find((n) => n.id === editingNodeId);
            if (!node) return null;

            const nodeType = node.data.nodeType as NodeType;
            const currentLabel = node.data.label || '';
            const currentValue = node.data.value;
            const currentLLMConfig = node.data.llmConfig;
            const currentStructuredLLMConfig = node.data.structuredLLMConfig;
            const currentExaSearchConfig = node.data.exaSearchConfig;
            const currentDedupeConfig = node.data.dedupeConfig;
            const currentCacheConfig = node.data.cacheConfig;
            const currentMapConfig = node.data.mapConfig;
            const currentFlatmapConfig = node.data.flatmapConfig;

            // Get available transformer nodes (exclude source, terminal, and map nodes)
            const transformerNodeTypes: NodeType[] = [
              NodeType.SIMPLE_LLM,
              NodeType.STRUCTURED_LLM,
              NodeType.EXA_SEARCH,
              NodeType.PEEK,
            ];
            const availableTransformers = nodes
              .filter((n) => {
                const nType = n.data.nodeType as NodeType;
                return transformerNodeTypes.includes(nType) && n.id !== editingNodeId;
              })
              .map((n) => ({
                id: n.id,
                label: n.data.label || n.id,
                type: n.data.nodeType as string,
              }));

            return (
              <NodeEditor
                nodeId={editingNodeId}
                nodeType={nodeType}
                currentLabel={currentLabel}
                currentValue={currentValue}
                currentLLMConfig={currentLLMConfig}
                currentStructuredLLMConfig={currentStructuredLLMConfig}
                currentExaSearchConfig={currentExaSearchConfig}
                currentDedupeConfig={currentDedupeConfig}
                currentCacheConfig={currentCacheConfig}
                currentMapConfig={currentMapConfig}
                currentFlatmapConfig={currentFlatmapConfig}
                availableTransformers={availableTransformers}
                onSave={(config) => onNodeSave(editingNodeId, config)}
                onClose={() => setEditingNodeId(null)}
              />
            );
          })()}
    </div>
  );
}

export default App;
