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
  FluentDAGBuilder, 
  NodeType, 
  serializeDAG, 
  DAGExecutor, 
  type ExecutionState,
  createConfigFromEnv,
  type DAGConfig
} from '../../sdk/src/index';
import CustomNode from './components/CustomNode';
import Sidebar from './components/Sidebar';
import NodeTypeMenu from './components/NodeTypeMenu';
import NodeEditor, { NodeConfig } from './components/NodeEditor';
import LogPanel, { type LogEntry } from './components/LogPanel';
import ConfigPanel from './components/ConfigPanel';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

let nodeIdCounter = 0;
const getNodeId = () => `node_${++nodeIdCounter}`;

const STORAGE_KEY = 'dag-editor-state';
const STORAGE_KEY_COUNTER = 'dag-editor-node-counter';
const STORAGE_KEY_CONFIG = 'dag-editor-config';

// Initialize counter from storage
const savedCounter = localStorage.getItem(STORAGE_KEY_COUNTER);
if (savedCounter) {
  nodeIdCounter = parseInt(savedCounter, 10) || 0;
}

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
  dagData: string; // Serialized DAG state
}

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [dagBuilder] = useState(() => new FluentDAGBuilder('main-dag'));
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
  // Load config from localStorage or create default
  // Note: Secrets are not stored in UI config - they come from .env when executing server-side
  const [dagConfig, setDagConfig] = useState<DAGConfig>(() => {
    const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // Merge with defaults, but exclude secrets
        return {
          ...createConfigFromEnv(),
          ...parsed,
          // Explicitly remove secrets from UI config
          secrets: undefined,
          runtime: {
            ...createConfigFromEnv().runtime,
            ...parsed.runtime,
          },
          environment: {
            ...createConfigFromEnv().environment,
            ...parsed.environment,
          },
        };
      } catch (e) {
        console.error('Error loading config from localStorage:', e);
        const defaultConfig = createConfigFromEnv();
        return {
          ...defaultConfig,
          secrets: undefined, // Remove secrets from UI
        };
      }
    }
    const defaultConfig = createConfigFromEnv();
    return {
      ...defaultConfig,
      secrets: undefined, // Remove secrets from UI
    };
  });
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  
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
      dagData: JSON.stringify(serializeDAG(dagBuilder.build())),
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
  }, [nodes, edges, dagBuilder, historyIndex]);

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
      
      // Restore DAG builder from serialized state
      try {
        const dagData = JSON.parse(previousState.dagData);
        // Clear current DAG builder
        const newDagBuilder = new FluentDAGBuilder('main-dag');
        
        // Recreate nodes
        previousState.nodes.forEach((node: Node) => {
          const nodeType = node.data.nodeType as NodeType;
          if (nodeType) {
            const label = node.data.label || nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace('_', ' ');
            
            switch (nodeType) {
              case NodeType.CONDITIONAL:
                newDagBuilder.conditional(node.id, async () => true).label(label);
                break;
              case NodeType.LOOP:
                newDagBuilder.loop(node.id, async () => false).label(label);
                break;
              case NodeType.FAN_OUT:
                newDagBuilder.fanOut(node.id, 1).label(label);
                break;
              case NodeType.AGGREGATOR:
                newDagBuilder.aggregator(node.id, async (inputs) => inputs).label(label);
                break;
              case NodeType.LITERAL:
                newDagBuilder.data(node.id, node.data.value || '').label(label);
                break;
              case NodeType.CONSOLE:
                newDagBuilder.consoleSink(node.id).label(label);
                break;
              case NodeType.LLM:
                newDagBuilder
                  .llm(node.id)
                  .label(label);
                const restoredLLMNode = newDagBuilder.getBuilder().getNode(node.id);
                if (restoredLLMNode && restoredLLMNode.type === NodeType.LLM) {
                  if (node.data.model) {
                    restoredLLMNode.model = node.data.model;
                  }
                  if (node.data.structuredOutput) {
                    restoredLLMNode.structuredOutput = node.data.structuredOutput;
                  }
                }
                break;
            }
          }
        });

        // Restore connections
        previousState.edges.forEach((edge: Edge) => {
          if (edge.source && edge.target && edge.sourceHandle && edge.targetHandle) {
            newDagBuilder.connect(
              edge.source,
              edge.sourceHandle,
              edge.target,
              edge.targetHandle
            );
          }
        });

        // Replace the DAG builder
        (dagBuilder as any).builder = newDagBuilder.getBuilder();
      } catch (error) {
        console.error('Error restoring DAG state:', error);
      }
    } else {
      // Clear everything
      setNodes([]);
      setEdges([]);
      setHistoryIndex(-1);
      const newDagBuilder = new FluentDAGBuilder('main-dag');
      (dagBuilder as any).builder = newDagBuilder.getBuilder();
    }

    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 100);
  }, [history, historyIndex, setNodes, setEdges, dagBuilder]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    isUndoRedoRef.current = true;
    const nextIndex = historyIndex + 1;
    const nextState = history[nextIndex];
    
    setNodes(nextState.nodes);
    setEdges(nextState.edges);
    setHistoryIndex(nextIndex);
    
    // Restore DAG builder from serialized state
    try {
      const dagData = JSON.parse(nextState.dagData);
      const newDagBuilder = new FluentDAGBuilder('main-dag');
      
      // Recreate nodes
      nextState.nodes.forEach((node: Node) => {
        const nodeType = node.data.nodeType as NodeType;
        if (nodeType) {
          const label = node.data.label || nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace('_', ' ');
          
          switch (nodeType) {
            case NodeType.CONDITIONAL:
              newDagBuilder.conditional(node.id, async () => true).label(label);
              break;
            case NodeType.LOOP:
              newDagBuilder.loop(node.id, async () => false).label(label);
              break;
            case NodeType.FAN_OUT:
              newDagBuilder.fanOut(node.id, 1).label(label);
              break;
            case NodeType.AGGREGATOR:
              newDagBuilder.aggregator(node.id, async (inputs) => inputs).label(label);
              break;
                case NodeType.LITERAL:
              newDagBuilder.data(node.id, node.data.value || '').label(label);
              break;
            case NodeType.LLM:
              newDagBuilder
                .llm(node.id)
                .label(label);
              const restoredLLMNode = newDagBuilder.getBuilder().getNode(node.id);
              if (restoredLLMNode && restoredLLMNode.type === NodeType.LLM) {
                if (node.data.model) {
                  restoredLLMNode.model = node.data.model;
                }
                if (node.data.structuredOutput) {
                  restoredLLMNode.structuredOutput = node.data.structuredOutput;
                }
              }
              break;
          }
        }
      });

      // Restore connections
      nextState.edges.forEach((edge: Edge) => {
        if (edge.source && edge.target && edge.sourceHandle && edge.targetHandle) {
          newDagBuilder.connect(
            edge.source,
            edge.sourceHandle,
            edge.target,
            edge.targetHandle
          );
        }
      });

      (dagBuilder as any).builder = newDagBuilder.getBuilder();
    } catch (error) {
      console.error('Error restoring DAG state:', error);
    }

    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 100);
  }, [history, historyIndex, setNodes, setEdges, dagBuilder]);

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
      const mouseEvent = event as MouseEvent;
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
      
      // Also add to DAG builder
      if (params.source && params.target && params.sourceHandle && params.targetHandle) {
        dagBuilder.connect(
          params.source,
          params.sourceHandle,
          params.target,
          params.targetHandle
        );
      }
      
      // Save to history after a short delay
      if (saveHistoryTimeoutRef.current) {
        clearTimeout(saveHistoryTimeoutRef.current);
      }
      saveHistoryTimeoutRef.current = setTimeout(() => {
        saveToHistory();
      }, 300);
    },
    [setEdges, dagBuilder, saveToHistory]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const createDAGNode = useCallback((nodeType: NodeType, id: string) => {
    const label = nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace('_', ' ');
    
    switch (nodeType) {
      case NodeType.CONDITIONAL:
        dagBuilder.conditional(id, async () => true).label(label);
        break;
      case NodeType.LOOP:
        dagBuilder.loop(id, async () => false).label(label);
        break;
      case NodeType.FAN_OUT:
        dagBuilder.fanOut(id, 1).label(label);
        break;
      case NodeType.AGGREGATOR:
        dagBuilder.aggregator(id, async (inputs) => inputs).label(label);
        break;
      case NodeType.LITERAL:
        dagBuilder.data(id, '').label(label);
        break;
      case NodeType.CONSOLE:
        dagBuilder.consoleSink(id).label(label);
        break;
      case NodeType.LLM:
        dagBuilder
          .llm(id)
          .label(label);
        break;
      case NodeType.EXA_SEARCH:
        dagBuilder
          .exaSearch(id)
          .label(label);
        break;
      default:
        // Unknown node type - do nothing
        break;
    }
  }, [dagBuilder]);

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
      createDAGNode(type, nodeId);

    // Get value for source nodes and model for LLM nodes
    let nodeValue: string | number | boolean | null | undefined = undefined;
    let nodeModel: string | undefined = undefined;
    let nodeStructuredOutput: { schema: Record<string, unknown>; mode?: 'json' | 'json_schema' | 'tool' } | undefined = undefined;
    let nodeExaConfig: {
      searchType?: 'auto' | 'neural' | 'keyword' | 'fast';
      includeDomains?: string[];
      excludeDomains?: string[];
      includeText?: string[];
      excludeText?: string[];
      category?: string;
      numResults?: number;
      text?: boolean;
      contents?: boolean | { numChars?: number };
      highlights?: boolean;
      summary?: boolean;
    } | undefined = undefined;
    
    const dagNode = dagBuilder.getBuilder().getNode(nodeId);
    if (type === NodeType.LITERAL && dagNode && dagNode.type === NodeType.LITERAL) {
      nodeValue = dagNode.value;
    } else if (type === NodeType.LLM && dagNode && dagNode.type === NodeType.LLM) {
      nodeModel = dagNode.model;
      nodeStructuredOutput = dagNode.structuredOutput;
    } else if (type === NodeType.EXA_SEARCH && dagNode && dagNode.type === NodeType.EXA_SEARCH) {
      nodeExaConfig = dagNode.config;
    }

      const newNode: Node = {
        id: nodeId,
        type: 'custom',
        position,
        data: {
          label: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
          nodeType: type,
          id: nodeId,
          ...(type === NodeType.LITERAL && { value: nodeValue }),
          ...(type === NodeType.LLM && { model: nodeModel, structuredOutput: nodeStructuredOutput }),
          ...(type === NodeType.EXA_SEARCH && { exaConfig: nodeExaConfig }),
        },
      };

      setNodes((nds) => nds.concat(newNode));
      
      // Save to history
      setTimeout(() => saveToHistory(), 100);
    },
    [reactFlowInstance, setNodes, createDAGNode, dagBuilder, saveToHistory]
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
    createDAGNode(nodeType, nodeId);

    // Get value for literal nodes, model for LLM nodes, config for Exa Search nodes
    let nodeValue: string | number | boolean | null | undefined = undefined;
    let nodeModel: string | undefined = undefined;
    let nodeStructuredOutput: { schema: Record<string, unknown>; mode?: 'json' | 'json_schema' | 'tool' } | undefined = undefined;
    let nodeExaConfig: {
      searchType?: 'auto' | 'neural' | 'keyword' | 'fast';
      includeDomains?: string[];
      excludeDomains?: string[];
      includeText?: string[];
      excludeText?: string[];
      category?: string;
      numResults?: number;
      text?: boolean;
      contents?: boolean | { numChars?: number };
      highlights?: boolean;
      summary?: boolean;
    } | undefined = undefined;
    
    const dagNode = dagBuilder.getBuilder().getNode(nodeId);
    if (nodeType === NodeType.LITERAL && dagNode && dagNode.type === NodeType.LITERAL) {
      nodeValue = dagNode.value;
    } else if (nodeType === NodeType.LLM && dagNode && dagNode.type === NodeType.LLM) {
      nodeModel = dagNode.model;
      nodeStructuredOutput = dagNode.structuredOutput;
    } else if (nodeType === NodeType.EXA_SEARCH && dagNode && dagNode.type === NodeType.EXA_SEARCH) {
      nodeExaConfig = dagNode.config;
    }

    const newNode: Node = {
      id: nodeId,
      type: 'custom',
      position,
      data: {
        label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace('_', ' '),
        nodeType,
        id: nodeId,
        ...(nodeType === NodeType.LITERAL && { value: nodeValue }),
        ...(nodeType === NodeType.LLM && { model: nodeModel, structuredOutput: nodeStructuredOutput }),
        ...(nodeType === NodeType.EXA_SEARCH && { exaConfig: nodeExaConfig }),
      },
    };

    setNodes((nds) => nds.concat(newNode));
    
    // Save to history
    setTimeout(() => saveToHistory(), 100);
  }, [reactFlowInstance, setNodes, createDAGNode, dagBuilder, saveToHistory]);

  const onSave = useCallback(() => {
    const dag = dagBuilder.build();
    const validation = dagBuilder.getBuilder().validate();
    console.log('DAG Validation:', validation);
    
    // Serialize to JSON
    const serialized = serializeDAG(dag);
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
  }, [dagBuilder, nodes, edges]);

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

  // Rebuild DAG from current React Flow state
  const rebuildDAGFromUI = useCallback(() => {
    // Create a fresh DAG builder
    const freshBuilder = new FluentDAGBuilder('main-dag');
    
    // Recreate all nodes from React Flow state
    nodes.forEach((node) => {
      const nodeType = node.data.nodeType as NodeType;
      if (!nodeType) return;
      
      const label = node.data.label || nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace('_', ' ');
      
      switch (nodeType) {
        case NodeType.LITERAL:
          freshBuilder.data(node.id, node.data.value || '').label(label);
          break;
        case NodeType.LLM:
          freshBuilder
            .llm(node.id)
            .label(label);
          const llmNode = freshBuilder.getBuilder().getNode(node.id);
          if (llmNode && llmNode.type === NodeType.LLM) {
            if (node.data.model) {
              llmNode.model = node.data.model;
            }
            if (node.data.structuredOutput) {
              llmNode.structuredOutput = node.data.structuredOutput;
            }
          }
          break;
        case NodeType.CONSOLE:
          freshBuilder.consoleSink(node.id).label(label);
          break;
        case NodeType.EXA_SEARCH:
          freshBuilder
            .exaSearch(node.id)
            .label(label);
          const exaNode = freshBuilder.getBuilder().getNode(node.id);
          if (exaNode && exaNode.type === NodeType.EXA_SEARCH) {
            if (node.data.exaConfig) {
              exaNode.config = { ...exaNode.config, ...node.data.exaConfig };
            }
          }
          break;
        case NodeType.CONDITIONAL:
          freshBuilder.conditional(node.id, async () => true).label(label);
          break;
        case NodeType.LOOP:
          freshBuilder.loop(node.id, async () => false).label(label);
          break;
        case NodeType.FAN_OUT:
          freshBuilder.fanOut(node.id, 1).label(label);
          break;
        case NodeType.AGGREGATOR:
          freshBuilder.aggregator(node.id, async (inputs) => inputs).label(label);
          break;
      }
    });
    
    // Recreate all connections from React Flow edges
    edges.forEach((edge) => {
      if (edge.source && edge.target && edge.sourceHandle && edge.targetHandle) {
        freshBuilder.connect(
          edge.source,
          edge.sourceHandle,
          edge.target,
          edge.targetHandle
        );
      }
    });
    
    return freshBuilder.build();
  }, [nodes, edges]);

  const onRunDAG = useCallback(async () => {
    if (isExecuting) return;

    setIsExecuting(true);
    setNodeExecutionStates(new Map());
    setLogs([]);
    addLog('info', 'Starting DAG execution...');

    try {
      // Rebuild DAG from current UI state to ensure it's in sync
      const dag = rebuildDAGFromUI();

      if (dag.nodes.size === 0) {
        addLog('error', 'No nodes in DAG. Please add some nodes first.');
        setIsExecuting(false);
        return;
      }

      // Serialize DAG for server
      const serialized = serializeDAG(dag);
      
      // Call server endpoint to execute DAG
      // In Vite, environment variables are accessed via import.meta.env
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
      const response = await fetch(`${serverUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dagJson: serialized,
          config: dagConfig,
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
  }, [rebuildDAGFromUI, isExecuting, addLog, dagConfig, serializeDAG]);

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
      createDAGNode(nodeType, nodeId);

      // Get value for data nodes, model for LLM nodes, config for Exa Search nodes
      let nodeValue: string | number | boolean | null | undefined = undefined;
      let nodeModel: string | undefined = undefined;
      let nodeStructuredOutput: { schema: Record<string, unknown>; mode?: 'json' | 'json_schema' | 'tool' } | undefined = undefined;
      let nodeExaConfig: {
        searchType?: 'auto' | 'neural' | 'keyword' | 'fast';
        includeDomains?: string[];
        excludeDomains?: string[];
        includeText?: string[];
        excludeText?: string[];
        category?: string;
        numResults?: number;
        text?: boolean;
        contents?: boolean | { numChars?: number };
        highlights?: boolean;
        summary?: boolean;
      } | undefined = undefined;
      
      const dagNode = dagBuilder.getBuilder().getNode(nodeId);
      if (nodeType === NodeType.LITERAL && dagNode && dagNode.type === NodeType.LITERAL) {
        nodeValue = dagNode.value;
      } else if (nodeType === NodeType.LLM && dagNode && dagNode.type === NodeType.LLM) {
        nodeModel = dagNode.model;
        nodeStructuredOutput = dagNode.structuredOutput;
      } else if (nodeType === NodeType.EXA_SEARCH && dagNode && dagNode.type === NodeType.EXA_SEARCH) {
        nodeExaConfig = dagNode.config;
      }

      const newNode: Node = {
        id: nodeId,
        type: 'custom',
        position,
        data: {
          label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace('_', ' '),
          nodeType,
          id: nodeId,
          ...(nodeType === NodeType.LITERAL && { value: nodeValue }),
          ...(nodeType === NodeType.LLM && { model: nodeModel, structuredOutput: nodeStructuredOutput }),
          ...(nodeType === NodeType.EXA_SEARCH && { exaConfig: nodeExaConfig }),
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
      dagBuilder.connect(connectionStart.nodeId, connectionStart.handleId, nodeId, 'input');

      setConnectionStart(null);
      setMenuPosition(null);
    },
    [connectionStart, menuPosition, reactFlowInstance, setNodes, createDAGNode, setEdges, dagBuilder]
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
                  ...(config.model !== undefined && { model: config.model }),
                  ...(config.structuredOutput !== undefined && { structuredOutput: config.structuredOutput }),
                  ...(config.exaConfig !== undefined && { exaConfig: config.exaConfig }),
                },
              }
            : node
        )
      );

      // Update the DAG builder node
      const dagNode = dagBuilder.getBuilder().getNode(nodeId);
      if (dagNode) {
        if (config.label !== undefined) {
          dagNode.label = config.label;
        }
        if (dagNode.type === NodeType.LITERAL && config.value !== undefined) {
          dagNode.value = config.value;
        }
        if (dagNode.type === NodeType.LLM) {
          if (config.model !== undefined) {
            dagNode.model = config.model;
          }
          if (config.structuredOutput !== undefined) {
            dagNode.structuredOutput = config.structuredOutput;
          }
        }
        if (dagNode.type === NodeType.EXA_SEARCH) {
          if (config.exaConfig !== undefined) {
            dagNode.config = { ...dagNode.config, ...config.exaConfig };
          }
        }
      }

      setEditingNodeId(null);
      
      // Save to history
      setTimeout(() => saveToHistory(), 100);
    },
    [setNodes, dagBuilder, saveToHistory]
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

          // Restore visual state first
          setNodes(parsed.nodes || []);
          setEdges(parsed.edges || []);

          // Restore DAG builder state
          // Recreate all nodes in the DAG builder
          parsed.nodes.forEach((node: Node) => {
            const nodeType = node.data.nodeType as NodeType;
            if (nodeType) {
              const label = node.data.label || nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace('_', ' ');
              
              switch (nodeType) {
                case NodeType.CONDITIONAL:
                  dagBuilder.conditional(node.id, async () => true).label(label);
                  break;
                case NodeType.LOOP:
                  dagBuilder.loop(node.id, async () => false).label(label);
                  break;
                case NodeType.FAN_OUT:
                  dagBuilder.fanOut(node.id, 1).label(label);
                  break;
                case NodeType.AGGREGATOR:
                  dagBuilder.aggregator(node.id, async (inputs) => inputs).label(label);
                  break;
                case NodeType.LITERAL:
                  dagBuilder.data(node.id, node.data.value || '').label(label);
                  break;
                case NodeType.LLM:
                  dagBuilder
                    .llm(node.id)
                    .label(label);
                  // Restore model and structured output
                  const restoredLLMNode = dagBuilder.getBuilder().getNode(node.id);
                  if (restoredLLMNode && restoredLLMNode.type === NodeType.LLM) {
                    if (node.data.model) {
                      restoredLLMNode.model = node.data.model;
                    }
                    if (node.data.structuredOutput) {
                      restoredLLMNode.structuredOutput = node.data.structuredOutput;
                    }
                  }
                  break;
                case NodeType.EXA_SEARCH:
                  dagBuilder
                    .exaSearch(node.id)
                    .label(label);
                  const restoredExaNode = dagBuilder.getBuilder().getNode(node.id);
                  if (restoredExaNode && restoredExaNode.type === NodeType.EXA_SEARCH) {
                    if (node.data.exaConfig) {
                      restoredExaNode.config = { ...restoredExaNode.config, ...node.data.exaConfig };
                    }
                  }
                  break;
                case NodeType.CONSOLE:
                  dagBuilder.consoleSink(node.id).label(label);
                  break;
            }
          }
        });

          // Restore connections
          parsed.edges.forEach((edge: Edge) => {
            if (edge.source && edge.target && edge.sourceHandle && edge.targetHandle) {
              dagBuilder.connect(
                edge.source,
                edge.sourceHandle,
                edge.target,
                edge.targetHandle
              );
            }
          });
        }
      } catch (error) {
        console.error('Error loading saved state:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  return (
    <div className="app">
      <div className="toolbar">
        <h1>Composable Search - DAG Editor</h1>
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button type="button" onClick={() => setShowConfigPanel(true)}>
            ⚙️ Config
          </button>
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
            const dagNode = dagBuilder.getBuilder().getNode(editingNodeId);
            
            // Get current values from DAG node or visual node (DAG node takes precedence)
            const currentLabel = dagNode?.label || node.data.label || '';
            
            // For LITERAL nodes, get value from DAG node first, then visual node
            let currentValue: string | number | boolean | null | undefined = undefined;
    if (nodeType === NodeType.LITERAL) {
      if (dagNode && dagNode.type === NodeType.LITERAL) {
                currentValue = dagNode.value;
              } else {
                currentValue = node.data.value;
              }
            } else {
              currentValue = node.data.value;
            }
            
            // For LLM nodes, get model and structured output from DAG node first, then visual node
            let currentModel: string | undefined = undefined;
            let currentStructuredOutput: { schema: Record<string, unknown>; mode?: 'json' | 'json_schema' | 'tool' } | undefined = undefined;
            
            if (nodeType === NodeType.LLM) {
              if (dagNode && dagNode.type === NodeType.LLM) {
                currentModel = dagNode.model;
                currentStructuredOutput = dagNode.structuredOutput;
              } else {
                currentModel = node.data.model || 'openai/gpt-4o';
                currentStructuredOutput = node.data.structuredOutput;
              }
            }

            // For Exa Search nodes, get config from DAG node first, then visual node
            let currentExaConfig: {
              searchType?: 'auto' | 'neural' | 'keyword' | 'fast';
              includeDomains?: string[];
              excludeDomains?: string[];
              includeText?: string[];
              excludeText?: string[];
              category?: string;
              numResults?: number;
              text?: boolean;
              contents?: boolean | { numChars?: number };
              highlights?: boolean;
              summary?: boolean;
            } | undefined = undefined;

            if (nodeType === NodeType.EXA_SEARCH) {
              if (dagNode && dagNode.type === NodeType.EXA_SEARCH) {
                currentExaConfig = dagNode.config;
              } else {
                currentExaConfig = node.data.exaConfig;
              }
            }

            return (
              <NodeEditor
                nodeId={editingNodeId}
                nodeType={nodeType}
                currentLabel={currentLabel}
                currentValue={currentValue}
                currentModel={currentModel}
                currentStructuredOutput={currentStructuredOutput}
                currentExaConfig={currentExaConfig}
                onSave={(config) => onNodeSave(editingNodeId, config)}
                onClose={() => setEditingNodeId(null)}
              />
            );
          })()}
      {showConfigPanel && (
        <ConfigPanel
          config={dagConfig}
          onConfigChange={(newConfig) => {
            // Ensure secrets are not saved
            const configToSave = {
              ...newConfig,
              secrets: undefined,
            };
            setDagConfig(configToSave);
            // Save config to localStorage (without secrets)
            localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(configToSave));
          }}
          onClose={() => setShowConfigPanel(false)}
        />
      )}
    </div>
  );
}

export default App;
