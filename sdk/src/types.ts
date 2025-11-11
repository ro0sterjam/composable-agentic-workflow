/**
 * Base types for DAG nodes
 */

// Re-export node types from nodes
export { TransformerNode, SourceNode, TerminalNode, StandAloneNode } from './nodes/types';

/**
 * Node type - free form string identifier for node types
 */
export type NodeType = string;

/**
 * Default node type constants
 */
export const DEFAULT_NODE_TYPES = {
  LITERAL: 'literal',
  CONSOLE: 'console',
  SIMPLE_LLM: 'simple_llm',
  STRUCTURED_LLM: 'structured_llm',
  MAP: 'map',
  PEEK: 'peek',
  EXA_SEARCH: 'exa_search',
  DEDUPE: 'dedupe',
  CACHE: 'cache',
  EXTRACT: 'extract',
  FILTER: 'filter',
} as const;

// Re-export node implementations
export {
  LiteralSourceNode,
  ConsoleTerminalNode,
  SimpleLLMTransformerNode,
  StructuredLLMTransformerNode,
  MapTransformerNode,
  PeekTransformerNode,
  ExaSearchTransformerNode,
  DedupeTransformerNode,
  CacheTransformerNode,
  ExtractTransformerNode,
  FilterTransformerNode,
} from './nodes';
export type {
  SimpleLLMTransformerNodeConfig,
  StructuredLLMTransformerNodeConfig,
  JSONSchema,
  MapTransformerNodeConfig,
  PeekTransformerNodeConfig,
  ExaSearchTransformerNodeConfig,
  ExaSearchType,
  ExaSearchCategory,
  ExaSearchResponse,
  ExaSearchResult,
  DedupeTransformerNodeConfig,
  DedupeMethod,
  CacheTransformerNodeConfig,
  ExtractTransformerNodeConfig,
  FilterTransformerNodeConfig,
} from './nodes';
