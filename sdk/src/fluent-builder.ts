import { DAGBuilder } from './dag-builder';
import { Node, NodeType, Port, DAG } from './types';
import {
  ConditionalNode,
  LoopNode,
  FanOutNode,
  AggregatorNode,
  LLMNode,
  LiteralNode,
  ConsoleSinkNode,
  ExaSearchNode,
  ConditionalNodeBuilder,
  LoopNodeBuilder,
  FanOutNodeBuilder,
  AggregatorNodeBuilder,
  LiteralNodeBuilder,
  LLMNodeBuilder,
  ConsoleSinkBuilder,
  ExaSearchNodeBuilder,
  NodeBuilder,
} from './nodes';

/**
 * Fluent API for building DAGs
 */

export class FluentDAGBuilder {
  private builder: DAGBuilder;
  private currentNode: Node | null = null;

  constructor(id: string) {
    this.builder = new DAGBuilder(id);
  }


  /**
   * Get a node builder for an existing node (for chaining)
   */
  node(id: string): NodeBuilder<Node> | null {
    const node = this.builder.getNode(id);
    if (!node) return null;
    return new NodeBuilder(this, node);
  }

  /**
   * Create a conditional node
   */
  conditional(id: string, condition: (input: unknown) => Promise<boolean> | boolean): ConditionalNodeBuilder {
    const node: ConditionalNode = {
      id,
      type: NodeType.CONDITIONAL,
      label: id,
      inputPorts: [{ id: 'input', label: 'Input' }],
      trueOutputPort: { id: 'true', label: 'True' },
      falseOutputPort: { id: 'false', label: 'False' },
      condition,
    };
    this.currentNode = node;
    this.builder.addNode(node);
    return new ConditionalNodeBuilder(this, node);
  }

  /**
   * Create a loop node
   */
  loop(id: string, loopCondition: (input: unknown, iteration: number) => Promise<boolean> | boolean): LoopNodeBuilder {
    const subDag = new DAGBuilder(`sub-dag-${id}`).build();
    const node: LoopNode = {
      id,
      type: NodeType.LOOP,
      label: id,
      inputPorts: [{ id: 'input', label: 'Input' }],
      outputPorts: [{ id: 'output', label: 'Output' }],
      subDag,
      loopCondition,
    };
    this.currentNode = node;
    this.builder.addNode(node);
    return new LoopNodeBuilder(this, node);
  }

  /**
   * Create a fan-out node
   */
  fanOut(id: string, branches: number): FanOutNodeBuilder {
    const outputBranches = Array.from({ length: branches }, (_, i) => ({
      port: { id: `output${i}`, label: `Output ${i + 1}` },
    }));
    const node: FanOutNode = {
      id,
      type: NodeType.FAN_OUT,
      label: id,
      inputPorts: [{ id: 'input', label: 'Input' }],
      outputBranches,
    };
    this.currentNode = node;
    this.builder.addNode(node);
    return new FanOutNodeBuilder(this, node);
  }

  /**
   * Create an aggregator node
   */
  aggregator(id: string, aggregate: (inputs: unknown[]) => Promise<unknown> | unknown): AggregatorNodeBuilder {
    const node: AggregatorNode = {
      id,
      type: NodeType.AGGREGATOR,
      label: id,
      inputPorts: [{ id: 'input', label: 'Input' }],
      outputPorts: [{ id: 'output', label: 'Output' }],
      aggregate,
    };
    this.currentNode = node;
    this.builder.addNode(node);
    return new AggregatorNodeBuilder(this, node);
  }

  /**
   * Create a literal node (outputs a literal value, no input)
   */
  literal(id: string, value: string | number | boolean | null | undefined): LiteralNodeBuilder {
    const node: LiteralNode = {
      id,
      type: NodeType.LITERAL,
      label: id,
      outputPorts: [{ id: 'output', label: 'Output' }],
      value,
    };
    this.currentNode = node;
    this.builder.addNode(node);
    return new LiteralNodeBuilder(this, node);
  }

  /**
   * Alias for literal() for backward compatibility
   */
  data(id: string, value: string | number | boolean | null | undefined): LiteralNodeBuilder {
    return this.literal(id, value);
  }

  /**
   * Create a console sink node (logs input to console, no output)
   */
  consoleSink(id: string): ConsoleSinkBuilder {
    const node: ConsoleSinkNode = {
      id,
      type: NodeType.CONSOLE,
      label: id,
      inputPorts: [{ id: 'input', label: 'Input' }],
      execute: (input: unknown) => {
        console.log('ConsoleSink:', input);
      },
    };
    this.currentNode = node;
    this.builder.addNode(node);
    // Builder will set up the execute function
    return new ConsoleSinkBuilder(this, node);
  }

  /**
   * Create an LLM node (sends input to LLM and outputs response)
   */
  llm(id: string): LLMNodeBuilder {
    const node: LLMNode = {
      id,
      type: NodeType.LLM,
      label: id,
      inputPorts: [{ id: 'input', label: 'Input' }],
      outputPorts: [{ id: 'output', label: 'Output' }],
      model: 'openai/gpt-4o', // Using gpt-4o for faster responses (gpt-5 is a reasoning model that's slower)
      execute: async () => {
        throw new Error('Execute function not initialized. This should be set by LLMNodeBuilder.');
      },
    };
    this.currentNode = node;
    this.builder.addNode(node);
    // Builder will set up the execute function
    return new LLMNodeBuilder(this, node);
  }

  /**
   * Create an Exa Search node (performs web search using Exa API)
   */
  exaSearch(id: string): ExaSearchNodeBuilder {
    const node: ExaSearchNode = {
      id,
      type: NodeType.EXA_SEARCH,
      label: id,
      inputPorts: [{ id: 'input', label: 'Input' }],
      outputPorts: [{ id: 'output', label: 'Output' }],
      config: {
        searchType: 'auto',
        text: true,
        numResults: 10,
      },
      execute: async () => {
        throw new Error('Execute function not initialized. This should be set by ExaSearchNodeBuilder.');
      },
    };
    this.currentNode = node;
    this.builder.addNode(node);
    // Builder will set up the execute function
    return new ExaSearchNodeBuilder(this, node);
  }

  /**
   * Connect nodes
   */
  connect(fromNodeId: string, fromPort: string, toNodeId: string, toPort: string): this {
    this.builder.connect(fromNodeId, fromPort, toNodeId, toPort);
    return this;
  }

  /**
   * Set entry node
   */
  entry(nodeId: string): this {
    this.builder.setEntryNode(nodeId);
    return this;
  }

  /**
   * Add exit node
   */
  exit(nodeId: string): this {
    this.builder.addExitNode(nodeId);
    return this;
  }

  /**
   * Build the DAG
   */
  build() {
    return this.builder.build();
  }

  /**
   * Get the underlying builder
   */
  getBuilder(): DAGBuilder {
    return this.builder;
  }
}

// Node builders are now exported from ./nodes

