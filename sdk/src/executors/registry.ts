import { ConsoleTerminalExecutor } from './console';
import { LiteralSourceExecutor } from './literal';

/**
 * Transformer node executor - executes transformer nodes
 */
export interface TransformerExecutor<InputType, OutputType, ConfigType> {
  execute(input: InputType, config: ConfigType): Promise<OutputType> | OutputType;
}

/**
 * Source node executor - executes source nodes
 */
export interface SourceExecutor<OutputType, ConfigType> {
  execute(config: ConfigType): Promise<OutputType> | OutputType;
}

/**
 * Terminal node executor - executes terminal nodes
 */
export interface TerminalExecutor<InputType, ConfigType> {
  execute(input: InputType, config: ConfigType): Promise<void> | void;
}

/**
 * Standalone node executor - executes standalone nodes
 */
export interface StandAloneExecutor<ConfigType> {
  execute(config: ConfigType): Promise<void> | void;
}

/**
 * Executor registry - maps node types to their executor implementations
 */
export class ExecutorRegistry {
  private transformerExecutors: Map<string, TransformerExecutor<any, any, any>> = new Map();
  private sourceExecutors: Map<string, SourceExecutor<any, any>> = new Map();
  private terminalExecutors: Map<string, TerminalExecutor<any, any>> = new Map();
  private standaloneExecutors: Map<string, StandAloneExecutor<any>> = new Map();

  /**
   * Register a transformer node executor
   */
  registerTransformer<InputType, OutputType, ConfigType = unknown>(
    type: string,
    executor: TransformerExecutor<InputType, OutputType, ConfigType>
  ): void {
    this.transformerExecutors.set(type, executor);
  }

  /**
   * Register a source node executor
   */
  registerSource<OutputType, ConfigType = unknown>(
    type: string,
    executor: SourceExecutor<OutputType, ConfigType>
  ): void {
    this.sourceExecutors.set(type, executor);
  }

  /**
   * Register a terminal node executor
   */
  registerTerminal<InputType, ConfigType = unknown>(
    type: string,
    executor: TerminalExecutor<InputType, ConfigType>
  ): void {
    this.terminalExecutors.set(type, executor);
  }

  /**
   * Register a standalone node executor
   */
  registerStandalone<ConfigType = unknown>(
    type: string,
    executor: StandAloneExecutor<ConfigType>
  ): void {
    this.standaloneExecutors.set(type, executor);
  }

  /**
   * Get transformer executor for a node type
   */
  getTransformer(type: string): TransformerExecutor<any, any, any> | undefined {
    return this.transformerExecutors.get(type);
  }

  /**
   * Get source executor for a node type
   */
  getSource(type: string): SourceExecutor<any, any> | undefined {
    return this.sourceExecutors.get(type);
  }

  /**
   * Get terminal executor for a node type
   */
  getTerminal(type: string): TerminalExecutor<any, any> | undefined {
    return this.terminalExecutors.get(type);
  }

  /**
   * Get standalone executor for a node type
   */
  getStandalone(type: string): StandAloneExecutor<any> | undefined {
    return this.standaloneExecutors.get(type);
  }

  /**
   * Check if a node type has an executor registered
   */
  has(type: string): boolean {
    return (
      this.transformerExecutors.has(type) ||
      this.sourceExecutors.has(type) ||
      this.terminalExecutors.has(type) ||
      this.standaloneExecutors.has(type)
    );
  }
}

/**
 * Default executor registry
 */
export const defaultExecutorRegistry = new ExecutorRegistry();

// Register default executors for built-in node types
defaultExecutorRegistry.registerSource('literal', new LiteralSourceExecutor());
defaultExecutorRegistry.registerTerminal('console', new ConsoleTerminalExecutor());
