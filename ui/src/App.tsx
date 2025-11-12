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
import { convertToSerializedDAG, convertFromSerializedDAG } from './utils/converter';
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

/**
 * Determine the category of a node type (source, transformer, or terminal)
 */
function getNodeTypeCategory(nodeType: string): 'source' | 'transformer' | 'terminal' {
  // Sources: produce output, no input
  const sources = ['literal', 'dataset'];
  
  // Terminals: take input, produce no output
  const terminals = ['console'];
  
  // Transformers: take input, produce output (everything else)
  if (sources.includes(nodeType)) return 'source';
  if (terminals.includes(nodeType)) return 'terminal';
  return 'transformer';
}

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
  const edgesRef = useRef<Edge[]>([]);
  const nodesRef = useRef<Node[]>([]);
  
  // Keep refs in sync with state
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Execution state
  const [nodeExecutionStates, setNodeExecutionStates] = useState<Map<string, ExecutionState>>(new Map());
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Define addLog early so it can be used in onConnect
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

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string; handleId: string; position: { x: number; y: number } } | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const connectionMadeRef = useRef(false);
  const isDraggingConnectionRef = useRef(false);
  const modifierKeyPressedRef = useRef(false);
  
  // Pan/selection state
  const [enablePanning, setEnablePanning] = useState(true);
  
  // Undo/Redo state
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const saveHistoryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load dialog state
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [loadJsonText, setLoadJsonText] = useState('');
  
  // Keep historyIndexRef in sync with historyIndex state
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    if (isUndoRedoRef.current) return;

    // Use refs to get the latest values instead of closure values
    const currentState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodesRef.current)),
      edges: JSON.parse(JSON.stringify(edgesRef.current)),
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
  }, [historyIndex]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex < 0 || history.length === 0) return;

    isUndoRedoRef.current = true;
    const previousIndex = historyIndex - 1;
    
    // Don't allow undo beyond the first history entry
    if (previousIndex < 0) {
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 100);
      return;
    }
    
    const previousState = history[previousIndex];
    setNodes(previousState.nodes);
    setEdges(previousState.edges);
    setHistoryIndex(previousIndex);

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
    // Only allow connections from output handles, not from bottom handles (transformer connections)
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
    // Ignore connections from bottom/top handles (they're visual only)
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

      // Check if source node is a terminal - terminals can't connect to anything
      const sourceNode = nodesRef.current.find((n) => n.id === connectionStart.nodeId);
      if (sourceNode) {
        const sourceCategory = getNodeTypeCategory(sourceNode.data.nodeType as string);
        if (sourceCategory === 'terminal') {
          // Terminal nodes can't be sources, so don't show menu
          setConnectionStart(null);
          setMenuPosition(null);
          return;
        }
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
      // Prevent connections from/to transformer handles (bottom/top handles)
      if (params.sourceHandle === 'bottom' || params.targetHandle === 'top') {
        // Mark as handled so menu doesn't show
        connectionMadeRef.current = true;
        setConnectionStart(null);
        setMenuPosition(null);
        return;
      }

      // Validate: prevent multiple connections to the same target node
      // Check current edges before updating
      if (params.target) {
        const existingEdgeToTarget = edgesRef.current.find((edge) => edge.target === params.target);
        if (existingEdgeToTarget) {
          // Log error - addLog will be available when this callback executes
          if (typeof addLog === 'function') {
            addLog(
              'error',
              `Cannot create connection: Node "${params.target}" already has an incoming connection from "${existingEdgeToTarget.source}". Input connectors cannot have multiple connections.`
            );
          }
          // Mark as handled so menu doesn't show
          connectionMadeRef.current = true;
          setConnectionStart(null);
          setMenuPosition(null);
          return; // Reject the connection
        }
      }

      // Validate: prevent connections to nodes used as subgraphs
      // Compute referenced nodes on the fly
      const referencedNodeIds = new Set<string>();
      for (const node of nodesRef.current) {
        const nodeType = node.data.nodeType as NodeType;
        if (nodeType === NodeType.MAP && node.data.mapConfig?.transformerId) {
          referencedNodeIds.add(node.data.mapConfig.transformerId);
        }
        if (nodeType === NodeType.FLATMAP && node.data.flatmapConfig?.transformerId) {
          referencedNodeIds.add(node.data.flatmapConfig.transformerId);
        }
        if (nodeType === NodeType.AGENT && node.data.agentConfig?.tools) {
          for (const tool of node.data.agentConfig.tools) {
            if (tool.transformerId) {
              referencedNodeIds.add(tool.transformerId);
            }
          }
        }
      }

      if (params.target && referencedNodeIds.has(params.target)) {
        const targetNode = nodesRef.current.find((n) => n.id === params.target);
        const targetLabel = targetNode?.data.label || params.target;
        if (typeof addLog === 'function') {
          addLog(
            'error',
            `Cannot create connection: Node "${targetLabel}" is being used as a subgraph transformer (by map/flatmap/agent) and cannot have incoming connections in the main DAG.`
          );
        }
        // Mark as handled so menu doesn't show
        connectionMadeRef.current = true;
        setConnectionStart(null);
        setMenuPosition(null);
        return; // Reject the connection
      }

      // Validate node type connections
      if (params.source && params.target) {
        const sourceNode = nodesRef.current.find((n) => n.id === params.source);
        const targetNode = nodesRef.current.find((n) => n.id === params.target);
        
        if (sourceNode && targetNode) {
          const sourceCategory = getNodeTypeCategory(sourceNode.data.nodeType as string);
          const targetCategory = getNodeTypeCategory(targetNode.data.nodeType as string);
          
          // Terminal nodes cannot be sources (they don't produce output)
          if (sourceCategory === 'terminal') {
            const sourceLabel = sourceNode.data.label || sourceNode.id;
            if (typeof addLog === 'function') {
              addLog(
                'error',
                `Invalid connection: Terminal node "${sourceLabel}" cannot be a source. Terminal nodes do not produce output.`
              );
            }
            // Mark as handled so menu doesn't show
            connectionMadeRef.current = true;
            setConnectionStart(null);
            setMenuPosition(null);
            return; // Reject the connection
          }
          
          // Source nodes cannot be targets (they don't take input)
          if (targetCategory === 'source') {
            const targetLabel = targetNode.data.label || targetNode.id;
            if (typeof addLog === 'function') {
              addLog(
                'error',
                `Invalid connection: Source node "${targetLabel}" cannot be a target. Source nodes do not accept input.`
              );
            }
            // Mark as handled so menu doesn't show
            connectionMadeRef.current = true;
            setConnectionStart(null);
            setMenuPosition(null);
            return; // Reject the connection
          }
        }
      }

      // Connection is valid, add it
      setEdges((eds) => {
        const newEdges = addEdge(params, eds);
        // Save to history immediately after state update with the new edges
        setTimeout(() => {
          // Use the new edges directly since we have them here
          if (!isUndoRedoRef.current) {
            const currentState: HistoryState = {
              nodes: JSON.parse(JSON.stringify(nodesRef.current)),
              edges: JSON.parse(JSON.stringify(newEdges)),
            };
            setHistory((prev) => {
              const newHistory = prev.slice(0, historyIndexRef.current + 1);
              newHistory.push(currentState);
              if (newHistory.length > 50) {
                newHistory.shift();
                return newHistory;
              }
              return newHistory;
            });
            setHistoryIndex((prev) => Math.min(prev + 1, 49));
          }
        }, 0);
        return newEdges;
      });
      connectionMadeRef.current = true;
      setConnectionStart(null);
      setMenuPosition(null);
    },
    [setEdges, addLog]
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
          ...(type === NodeType.DATASET && { value: '[]' }),
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
        ...(nodeType === NodeType.DATASET && { value: '[]' }),
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
              // Parse timestamp string to Date object
              const logEntry: LogEntry = {
                ...log,
                timestamp: new Date(log.timestamp),
              };
              addLog(logEntry.type, logEntry.message, logEntry.nodeId);
              
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

  const handleLoadFromFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setLoadJsonText(text);
    };
    reader.onerror = () => {
      addLog('error', 'Failed to read file');
    };
    reader.readAsText(file);
    
    // Reset file input so same file can be selected again
    event.target.value = '';
  }, [addLog]);

  const handleLoadFromText = useCallback(() => {
    if (!loadJsonText.trim()) {
      addLog('error', 'Please provide JSON to load');
      return;
    }

    try {
      const dagData = JSON.parse(loadJsonText);
      
      // Validate it's a SerializedDAG
      if (!dagData.nodes || !Array.isArray(dagData.nodes)) {
        throw new Error('Invalid DAG format: missing nodes array');
      }
      if (!dagData.edges || !Array.isArray(dagData.edges)) {
        throw new Error('Invalid DAG format: missing edges array');
      }

      // Convert from SerializedDAG to ReactFlow nodes/edges
      const updateNodeCounter = (maxId: number) => {
        // maxId is already the numeric part extracted from node IDs
        if (maxId > nodeIdCounter) {
          nodeIdCounter = maxId;
          localStorage.setItem(STORAGE_KEY_COUNTER, nodeIdCounter.toString());
        }
      };

      const { nodes: loadedNodes, edges: loadedEdges } = convertFromSerializedDAG(
        dagData,
        updateNodeCounter
      );
      
      // Clear current state and load new nodes/edges
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        nodes: loadedNodes,
        edges: loadedEdges,
        nodeCounter: nodeIdCounter,
      }));
      localStorage.setItem('dag-json', loadJsonText);
      
      // Close dialog and clear text
      setShowLoadDialog(false);
      setLoadJsonText('');
      
      addLog('info', `Successfully loaded DAG with ${loadedNodes.length} nodes and ${loadedEdges.length} edges`);
      
      // Fit view to show all nodes
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView({ padding: 0.2, duration: 500 });
        }
      }, 100);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      addLog('error', `Error loading DAG: ${errorMessage}`);
      console.error('Load error:', e);
    }
  }, [loadJsonText, setNodes, setEdges, addLog, reactFlowInstance]);

  const onLoad = useCallback(() => {
    // Clear the text box and show dialog
    setLoadJsonText('');
    setShowLoadDialog(true);
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

      // Validate node type connections before creating node and edge
      const sourceNode = nodesRef.current.find((n) => n.id === connectionStart.nodeId);
      
      if (sourceNode) {
        const sourceCategory = getNodeTypeCategory(sourceNode.data.nodeType as string);
        const targetCategory = getNodeTypeCategory(nodeType);
        
        // Terminal nodes cannot be sources (they don't produce output)
        if (sourceCategory === 'terminal') {
          const sourceLabel = sourceNode.data.label || sourceNode.id;
          if (typeof addLog === 'function') {
            addLog(
              'error',
              `Invalid connection: Terminal node "${sourceLabel}" cannot be a source. Terminal nodes do not produce output.`
            );
          }
          setConnectionStart(null);
          setMenuPosition(null);
          return; // Reject the connection
        }
        
        // Source nodes cannot be targets (they don't take input)
        if (targetCategory === 'source') {
          if (typeof addLog === 'function') {
            addLog(
              'error',
              `Invalid connection: Source node "${nodeType}" cannot be a target. Source nodes do not accept input.`
            );
          }
          setConnectionStart(null);
          setMenuPosition(null);
          return; // Reject the connection
        }
      }

      const newNode: Node = {
        id: nodeId,
        type: 'custom',
        position,
        data: {
          label,
          nodeType,
          id: nodeId,
          ...(nodeType === NodeType.LITERAL && { value: '' }),
        ...(nodeType === NodeType.DATASET && { value: '[]' }),
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

      setEdges((eds) => {
        const newEdges = addEdge(connection, eds);
        // Save to history immediately after state update with the new edges
        setTimeout(() => {
          if (!isUndoRedoRef.current) {
            const currentState: HistoryState = {
              nodes: JSON.parse(JSON.stringify(nodesRef.current)),
              edges: JSON.parse(JSON.stringify(newEdges)),
            };
            setHistory((prev) => {
              const newHistory = prev.slice(0, historyIndexRef.current + 1);
              newHistory.push(currentState);
              if (newHistory.length > 50) {
                newHistory.shift();
                return newHistory;
              }
              return newHistory;
            });
            setHistoryIndex((prev) => Math.min(prev + 1, 49));
          }
        }, 0);
        return newEdges;
      });

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
                  ...(config.extractConfig !== undefined && {
                    extractConfig: config.extractConfig,
                  }),
                  ...(config.filterConfig !== undefined && {
                    filterConfig: config.filterConfig,
                  }),
                  ...(config.agentConfig !== undefined && {
                    agentConfig: config.agentConfig,
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

  // Compute which nodes are referenced by nesting nodes (map/flatmap/agent)
  const referencedNodeIds = React.useMemo(() => {
    const referenced = new Set<string>();
    
    for (const node of nodes) {
      const nodeType = node.data.nodeType as NodeType;
      
      // Check if this is a Map node with a transformer
      if (nodeType === NodeType.MAP && node.data.mapConfig?.transformerId) {
        referenced.add(node.data.mapConfig.transformerId);
      }
      
      // Check if this is a FlatMap node with a transformer
      if (nodeType === NodeType.FLATMAP && node.data.flatmapConfig?.transformerId) {
        referenced.add(node.data.flatmapConfig.transformerId);
      }
      
      // Check if this is an Agent node with tools
      if (nodeType === NodeType.AGENT && node.data.agentConfig?.tools) {
        for (const tool of node.data.agentConfig.tools) {
          if (tool.transformerId) {
            referenced.add(tool.transformerId);
          }
        }
      }
    }
    
    return referenced;
  }, [nodes]);

  // Generate virtual edges from Map/FlatMap nodes to their transformer nodes
  const transformerEdges = React.useMemo(() => {
    const virtualEdges: Edge[] = [];
    
    for (const node of nodes) {
      const nodeType = node.data.nodeType as NodeType;
      
      // Check if this is a Map node with a transformer
      if (nodeType === NodeType.MAP && node.data.mapConfig?.transformerId) {
        const transformerId = node.data.mapConfig.transformerId;
        const transformerNode = nodes.find((n) => n.id === transformerId);
        
        if (transformerNode) {
          virtualEdges.push({
            id: `transformer-edge-${node.id}-${transformerId}`,
            source: node.id,
            target: transformerId,
            sourceHandle: 'bottom',
            targetHandle: 'top',
            style: {
              stroke: '#8b5cf6',
              strokeWidth: 2,
              strokeDasharray: '5,5',
              opacity: 0.6,
            },
            type: 'straight',
            animated: false,
          });
        }
      }
      
      // Check if this is a FlatMap node with a transformer
      if (nodeType === NodeType.FLATMAP && node.data.flatmapConfig?.transformerId) {
        const transformerId = node.data.flatmapConfig.transformerId;
        const transformerNode = nodes.find((n) => n.id === transformerId);
        
        if (transformerNode) {
          virtualEdges.push({
            id: `transformer-edge-${node.id}-${transformerId}`,
            source: node.id,
            target: transformerId,
            sourceHandle: 'bottom',
            targetHandle: 'top',
            style: {
              stroke: '#8b5cf6',
              strokeWidth: 2,
              strokeDasharray: '5,5',
              opacity: 0.6,
            },
            type: 'straight',
            animated: false,
          });
        }
      }
      
      // Check if this is an Agent node with tools
      if (nodeType === NodeType.AGENT && node.data.agentConfig?.tools) {
        for (const tool of node.data.agentConfig.tools) {
          if (tool.transformerId) {
            const transformerId = tool.transformerId;
            const transformerNode = nodes.find((n) => n.id === transformerId);
            
            if (transformerNode) {
              virtualEdges.push({
                id: `transformer-edge-${node.id}-${transformerId}-${tool.name}`,
                source: node.id,
                target: transformerId,
                sourceHandle: 'bottom',
                targetHandle: 'top',
                style: {
                  stroke: '#c084fc',
                  strokeWidth: 2,
                  strokeDasharray: '5,5',
                  opacity: 0.6,
                },
                type: 'straight',
                animated: false,
                label: tool.name,
                labelStyle: {
                  fontSize: '10px',
                  fill: '#c084fc',
                },
                labelBgStyle: {
                  fill: '#1a1a1a',
                  fillOpacity: 0.8,
                },
              });
            }
          }
        }
      }
    }
    
    return virtualEdges;
  }, [nodes]);

  // Combine regular edges with virtual transformer edges
  const allEdges = React.useMemo(() => {
    return [...edges, ...transformerEdges];
  }, [edges, transformerEdges]);

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
      {showLoadDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => {
            setShowLoadDialog(false);
            setLoadJsonText('');
          }}
        >
          <div
            style={{
              background: '#2a2a2a',
              border: '1px solid #4a4a4a',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '600px',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              zIndex: 2001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
              Load DAG from JSON
            </h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
                Load from File
              </label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleLoadFromFile}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#3a3a3a',
                  border: '1px solid #4a4a4a',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px', color: '#9ca3af', textAlign: 'center', fontSize: '14px' }}>
              OR
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
                Paste JSON
              </label>
              <textarea
                value={loadJsonText}
                onChange={(e) => setLoadJsonText(e.target.value)}
                placeholder='{"nodes": [...], "edges": [...]}'
                rows={12}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#3a3a3a',
                  border: '1px solid #4a4a4a',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '13px',
                  resize: 'vertical',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowLoadDialog(false);
                  setLoadJsonText('');
                }}
                style={{
                  padding: '10px 20px',
                  background: '#3a3a3a',
                  border: '1px solid #4a4a4a',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#4a4a4a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#3a3a3a';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLoadFromText}
                disabled={!loadJsonText.trim()}
                style={{
                  padding: '10px 20px',
                  background: loadJsonText.trim() ? '#3b82f6' : '#4a4a4a',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: loadJsonText.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: loadJsonText.trim() ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (loadJsonText.trim()) {
                    e.currentTarget.style.background = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (loadJsonText.trim()) {
                    e.currentTarget.style.background = '#3b82f6';
                  }
                }}
              >
                Load from Text
              </button>
            </div>
          </div>
        </div>
      )}
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
                isReferencedByNestingNode: referencedNodeIds.has(node.id),
              },
            }))}
            edges={allEdges}
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
              // Filter out changes to virtual transformer edges (they're read-only)
              const filteredChanges = changes.filter((change) => {
                if (change.type === 'remove') {
                  const edgeId = 'id' in change ? change.id : undefined;
                  return edgeId && !edgeId.startsWith('transformer-edge-');
                }
                return true;
              });
              
              if (filteredChanges.length > 0) {
                onEdgesChange(filteredChanges);
              // Save to history on edge deletion
                const hasDeletion = filteredChanges.some((change) => change.type === 'remove');
              if (hasDeletion) {
                if (saveHistoryTimeoutRef.current) {
                  clearTimeout(saveHistoryTimeoutRef.current);
                }
                saveHistoryTimeoutRef.current = setTimeout(() => {
                  saveToHistory();
                }, 300);
                }
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
          sourceNodeType={
            connectionStart
              ? nodesRef.current.find((n) => n.id === connectionStart.nodeId)?.data.nodeType
              : undefined
          }
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
            const currentExtractConfig = node.data.extractConfig;
            const currentFilterConfig = node.data.filterConfig;
            const currentMapConfig = node.data.mapConfig;
            const currentFlatmapConfig = node.data.flatmapConfig;
            const currentAgentConfig = node.data.agentConfig;

            // Get available transformer nodes (exclude source, terminal, and map nodes)
            const transformerNodeTypes: NodeType[] = [
              NodeType.SIMPLE_LLM,
              NodeType.STRUCTURED_LLM,
              NodeType.EXA_SEARCH,
              NodeType.PEEK,
              NodeType.EXTRACT,
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
                currentExtractConfig={currentExtractConfig}
                currentFilterConfig={currentFilterConfig}
                currentMapConfig={currentMapConfig}
                currentFlatmapConfig={currentFlatmapConfig}
                currentAgentConfig={currentAgentConfig}
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
