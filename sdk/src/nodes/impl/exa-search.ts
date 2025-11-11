import { TransformerNode } from '../types';

/**
 * Search type options for ExaSearchTransformerNode
 */
export type ExaSearchType = 'auto' | 'fast' | 'neural';

/**
 * Category options for ExaSearchTransformerNode
 */
export type ExaSearchCategory =
  | 'company'
  | 'research paper'
  | 'news'
  | 'pdf'
  | 'github'
  | 'tweet'
  | 'personal site'
  | 'linkedin profile'
  | 'financial report';

/**
 * Config type for ExaSearchTransformerNode
 */
export interface ExaSearchTransformerNodeConfig {
  type?: ExaSearchType; // Default: 'auto'
  numResults?: number; // Default: 10
  includeDomains?: string[];
  excludeDomains?: string[];
  includeText?: string[];
  excludeText?: string[];
  category?: ExaSearchCategory;
}

/**
 * Exa Search result from API
 */
export interface ExaSearchResult {
  id: string;
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  image?: string;
  favicon?: string;
  text?: string;
  highlights?: string[];
  highlightScores?: number[];
  summary?: string;
  subpages?: ExaSearchResult[];
  extras?: {
    links?: string[];
  };
}

/**
 * Exa Search API response
 */
export interface ExaSearchResponse {
  requestId: string;
  resolvedSearchType: 'neural' | 'keyword';
  results: ExaSearchResult[];
  searchType: 'neural' | 'keyword';
  context?: string;
  costDollars?: {
    total: number;
    breakDown: Array<{
      search: number;
      contents: number;
      breakdown: {
        keywordSearch: number;
        neuralSearch: number;
        contentText: number;
        contentHighlight: number;
        contentSummary: number;
      };
    }>;
    perRequestPrices: {
      neuralSearch_1_25_results: number;
      neuralSearch_26_100_results: number;
      neuralSearch_100_plus_results: number;
      keywordSearch_1_100_results: number;
      keywordSearch_100_plus_results: number;
    };
    perPagePrices: {
      contentText: number;
      contentHighlight: number;
      contentSummary: number;
    };
  };
}

/**
 * Exa Search transformer node - performs web search using Exa API
 * @template InputType - The type of input data (typically string for query)
 * @template OutputType - The type of output data (ExaSearchResponse)
 */
export class ExaSearchTransformerNode<
  InputType = string,
  OutputType = ExaSearchResponse,
> extends TransformerNode<InputType, OutputType, ExaSearchTransformerNodeConfig> {
  type: 'exa_search';

  constructor(id: string, config?: ExaSearchTransformerNodeConfig, label?: string) {
    super(id, 'exa_search', config, label);
    this.type = 'exa_search';
  }
}
