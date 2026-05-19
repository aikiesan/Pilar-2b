/**
 * Production-safe logging utility for PILAR-2b V3
 *
 * Logs to console in development, suppresses in production
 * Prepares for error tracking integration (Sentry, etc.)
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

class Logger {
  private shouldLog(level: LogLevel): boolean {
    // Always log errors (even in production for debugging)
    if (level === 'error') return true;

    // Log everything in development
    if (isDevelopment) return true;

    // Don't log in production or tests
    if (isTest) return false;

    return false;
  }

  error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error('[ERROR]', ...args);
    }

    // TODO: In production, send to error tracking service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(args[0]);
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info('[INFO]', ...args);
    }
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug('[DEBUG]', ...args);
    }
  }

  /**
   * Log with additional context information
   *
   * @param level - Log level
   * @param context - Context string (e.g., component name, function name)
   * @param message - Log message
   * @param data - Optional additional data
   */
  logWithContext(level: LogLevel, context: string, message: string, data?: any): void {
    const logMethod = this[level];
    if (data) {
      logMethod.call(this, `[${context}]`, message, data);
    } else {
      logMethod.call(this, `[${context}]`, message);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience object for easy migration from console.*
export const log = {
  error: logger.error.bind(logger),
  warn: logger.warn.bind(logger),
  info: logger.info.bind(logger),
  debug: logger.debug.bind(logger),
};

export default logger;
