/**
 * Logger interface for configurable logging throughout the SDK
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Terminal logger - outputs to console with appropriate log levels
 */
export class TerminalLogger implements Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = 'debug') {
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}

/**
 * Callback logger - forwards logs to a callback function
 * Useful for forwarding logs to UI or other systems
 */
export class CallbackLogger implements Logger {
  private callback: (level: LogLevel, message: string, ...args: unknown[]) => void;
  private minLevel: LogLevel;

  constructor(
    callback: (level: LogLevel, message: string, ...args: unknown[]) => void,
    minLevel: LogLevel = 'debug'
  ) {
    this.callback = callback;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      this.callback('debug', message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      this.callback('info', message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      this.callback('warn', message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      this.callback('error', message, ...args);
    }
  }
}

/**
 * No-op logger - discards all logs
 */
export class NoOpLogger implements Logger {
  debug(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  info(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  warn(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  error(_message: string, ..._args: unknown[]): void {
    // No-op
  }
}

/**
 * Global logger instance
 * Defaults to TerminalLogger but can be overridden
 */
let globalLogger: Logger = new TerminalLogger();

/**
 * Set the global logger instance
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * Get the current global logger instance
 */
export function getLogger(): Logger {
  return globalLogger;
}

/**
 * Create a logger that combines multiple loggers
 */
export class CompositeLogger implements Logger {
  private loggers: Logger[];

  constructor(...loggers: Logger[]) {
    this.loggers = loggers;
  }

  debug(message: string, ...args: unknown[]): void {
    for (const logger of this.loggers) {
      logger.debug(message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    for (const logger of this.loggers) {
      logger.info(message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    for (const logger of this.loggers) {
      logger.warn(message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    for (const logger of this.loggers) {
      logger.error(message, ...args);
    }
  }
}

