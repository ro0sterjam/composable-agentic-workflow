/**
 * DAG Configuration System
 * 
 * Handles configuration for DAG execution, including:
 * - API keys and secrets (never stored in DAG definitions)
 * - Runtime configuration
 * - Environment-specific settings
 */

export interface DAGConfig {
  /**
   * API keys and secrets
   * These should NEVER be serialized with the DAG
   */
  secrets?: {
    openaiApiKey?: string;
    exaApiKey?: string;
    [key: string]: string | undefined;
  };

  /**
   * Runtime configuration
   */
  runtime?: {
    timeout?: number; // Execution timeout in ms
    maxRetries?: number;
    [key: string]: unknown;
  };

  /**
   * Environment-specific settings
   */
  environment?: {
    name?: string; // 'development' | 'staging' | 'production'
    [key: string]: unknown;
  };

  /**
   * Custom configuration
   */
  [key: string]: unknown;
}

/**
 * Default configuration
 */
export const DEFAULT_DAG_CONFIG: DAGConfig = {
  runtime: {
    timeout: 60000, // 60 seconds (default increased for GPT-5 and complex requests)
    maxRetries: 0,
  },
  environment: {
    name: (typeof (globalThis as { window?: unknown }).window !== 'undefined') ? 'browser' : (process.env.NODE_ENV || 'development'),
  },
};

/**
 * Create configuration from environment variables
 * Note: In browser, process.env is only available if Vite exposes it via import.meta.env
 */
export function createConfigFromEnv(overrides?: Partial<DAGConfig>): DAGConfig {
  // In browser, use import.meta.env if available, otherwise process.env
  const getEnvVar = (key: string): string | undefined => {
    if (typeof (globalThis as { window?: unknown }).window !== 'undefined') {
      // Browser environment - Vite exposes env vars via import.meta.env
      // For now, we'll just return undefined and let the user set it via UI
      return undefined;
    }
    return process.env[key];
  };

  const config: DAGConfig = {
    ...DEFAULT_DAG_CONFIG,
    secrets: {
      openaiApiKey: overrides?.secrets?.openaiApiKey || getEnvVar('OPENAI_API_KEY'),
      exaApiKey: overrides?.secrets?.exaApiKey || getEnvVar('EXA_API_KEY'),
      ...overrides?.secrets,
    },
    runtime: {
      ...DEFAULT_DAG_CONFIG.runtime,
      ...overrides?.runtime,
    },
    environment: {
      ...DEFAULT_DAG_CONFIG.environment,
      name: (typeof (globalThis as { window?: unknown }).window !== 'undefined') ? 'browser' : (process.env.NODE_ENV || 'development'),
      ...overrides?.environment,
    },
    ...overrides,
  };

  return config;
}

/**
 * Merge multiple configurations (later configs override earlier ones)
 */
export function mergeConfigs(...configs: (DAGConfig | undefined)[]): DAGConfig {
  const merged: DAGConfig = { ...DEFAULT_DAG_CONFIG };

  for (const config of configs) {
    if (!config) continue;

    merged.secrets = {
      ...merged.secrets,
      ...config.secrets,
    };

    merged.runtime = {
      ...merged.runtime,
      ...config.runtime,
    };

    merged.environment = {
      ...merged.environment,
      ...config.environment,
    };

    // Merge other custom properties
    for (const [key, value] of Object.entries(config)) {
      if (key !== 'secrets' && key !== 'runtime' && key !== 'environment') {
        merged[key] = value;
      }
    }
  }

  return merged;
}

/**
 * Validate configuration
 */
export function validateConfig(config: DAGConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Add validation rules here
  // For example, check if required secrets are present

  return {
    valid: errors.length === 0,
    errors,
  };
}

