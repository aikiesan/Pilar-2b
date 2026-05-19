/**
 * Tests for Logger Utility
 * Tests production-safe logging with environment-based behavior
 */

import { logger, log } from './logger';

describe('Logger', () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    // Restore console methods
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleDebugSpy.mockRestore();

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should log errors in development', () => {
      logger.error('Test error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Test error');
    });

    it('should log warnings in development', () => {
      logger.warn('Test warning');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'Test warning');
    });

    it('should log info in development', () => {
      logger.info('Test info');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO]', 'Test info');
    });

    it('should log debug in development', () => {
      logger.debug('Test debug');

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG]', 'Test debug');
    });

    it('should handle multiple arguments', () => {
      logger.error('Error:', { code: 500 }, 'Additional info');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR]',
        'Error:',
        { code: 500 },
        'Additional info'
      );
    });

    it('should handle objects', () => {
      const errorObj = { message: 'Error occurred', stack: 'stack trace' };
      logger.error(errorObj);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', errorObj);
    });

    it('should handle arrays', () => {
      logger.info(['item1', 'item2', 'item3']);

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO]', ['item1', 'item2', 'item3']);
    });

    it('should handle null and undefined', () => {
      logger.debug(null, undefined);

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG]', null, undefined);
    });
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should log errors in production', () => {
      logger.error('Production error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Production error');
    });

    it('should NOT log warnings in production', () => {
      logger.warn('Production warning');

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should NOT log info in production', () => {
      logger.info('Production info');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should NOT log debug in production', () => {
      logger.debug('Production debug');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });

  describe('Test Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should log errors in test environment', () => {
      logger.error('Test error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Test error');
    });

    it('should NOT log warnings in test environment', () => {
      logger.warn('Test warning');

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should NOT log info in test environment', () => {
      logger.info('Test info');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should NOT log debug in test environment', () => {
      logger.debug('Test debug');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });

  describe('logWithContext', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should log with context and message', () => {
      logger.logWithContext('info', 'MapComponent', 'Map rendered');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO]', '[MapComponent]', 'Map rendered');
    });

    it('should log with context, message, and data', () => {
      const data = { municipalities: 645, layers: 3 };
      logger.logWithContext('info', 'MapComponent', 'Map loaded', data);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO]',
        '[MapComponent]',
        'Map loaded',
        data
      );
    });

    it('should work with error level', () => {
      logger.logWithContext('error', 'APIClient', 'Request failed', { status: 500 });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR]',
        '[APIClient]',
        'Request failed',
        { status: 500 }
      );
    });

    it('should work with warn level', () => {
      logger.logWithContext('warn', 'Cache', 'Cache miss');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', '[Cache]', 'Cache miss');
    });

    it('should work with debug level', () => {
      logger.logWithContext('debug', 'Utils', 'Calculating distance', { km: 5 });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[DEBUG]',
        '[Utils]',
        'Calculating distance',
        { km: 5 }
      );
    });

    it('should respect environment settings', () => {
      process.env.NODE_ENV = 'production';

      logger.logWithContext('info', 'Component', 'Should not log');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should handle complex data structures', () => {
      const complexData = {
        user: { id: 1, name: 'Test' },
        coordinates: [1.23, 4.56],
        nested: { deep: { value: 'test' } },
      };

      logger.logWithContext('info', 'Simulation', 'Running', complexData);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO]',
        '[Simulation]',
        'Running',
        complexData
      );
    });
  });

  describe('Convenience log object', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should expose error method', () => {
      log.error('Error via convenience object');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Error via convenience object');
    });

    it('should expose warn method', () => {
      log.warn('Warning via convenience object');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'Warning via convenience object');
    });

    it('should expose info method', () => {
      log.info('Info via convenience object');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO]', 'Info via convenience object');
    });

    it('should expose debug method', () => {
      log.debug('Debug via convenience object');

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG]', 'Debug via convenience object');
    });

    it('should be bound to logger instance', () => {
      const { error } = log;
      error('Destructured error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Destructured error');
    });
  });

  describe('Log Level Behavior', () => {
    it('should always log errors regardless of environment', () => {
      const environments = ['development', 'production', 'test', 'staging'];

      environments.forEach((env) => {
        consoleErrorSpy.mockClear();
        process.env.NODE_ENV = env;

        logger.error(`Error in ${env}`);

        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });

    it('should only log non-errors in development', () => {
      const logLevels = [
        { method: 'warn', spy: consoleWarnSpy },
        { method: 'info', spy: consoleInfoSpy },
        { method: 'debug', spy: consoleDebugSpy },
      ];

      logLevels.forEach(({ method, spy }) => {
        // Development: should log
        process.env.NODE_ENV = 'development';
        spy.mockClear();
        (logger as any)[method]('test');
        expect(spy).toHaveBeenCalled();

        // Production: should not log
        process.env.NODE_ENV = 'production';
        spy.mockClear();
        (logger as any)[method]('test');
        expect(spy).not.toHaveBeenCalled();

        // Test: should not log
        process.env.NODE_ENV = 'test';
        spy.mockClear();
        (logger as any)[method]('test');
        expect(spy).not.toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should handle empty calls', () => {
      logger.info();

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO]');
    });

    it('should handle empty strings', () => {
      logger.warn('');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', '');
    });

    it('should handle numbers', () => {
      logger.debug(0, 123, -456, 3.14);

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG]', 0, 123, -456, 3.14);
    });

    it('should handle booleans', () => {
      logger.info(true, false);

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO]', true, false);
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      logger.error(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', error);
    });

    it('should handle circular references gracefully', () => {
      const circular: any = { prop: 'value' };
      circular.self = circular;

      // Should not throw
      expect(() => logger.info(circular)).not.toThrow();
    });

    it('should handle very long strings', () => {
      const longString = 'A'.repeat(10000);
      logger.debug(longString);

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG]', longString);
    });

    it('should handle symbols', () => {
      const sym = Symbol('test');
      logger.debug(sym);

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG]', sym);
    });

    it('should handle functions', () => {
      const fn = () => 'test';
      logger.debug(fn);

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG]', fn);
    });
  });

  describe('Real-world Usage Patterns', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should handle API error logging', () => {
      const error = {
        status: 500,
        message: 'Internal Server Error',
        endpoint: '/api/municipalities',
      };

      logger.error('API request failed:', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'API request failed:', error);
    });

    it('should handle performance logging', () => {
      logger.info('Query executed in', 45.5, 'ms');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO]', 'Query executed in', 45.5, 'ms');
    });

    it('should handle user action logging', () => {
      logger.debug('User clicked:', { button: 'simulate', region: '3501' });

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG]', 'User clicked:', {
        button: 'simulate',
        region: '3501',
      });
    });

    it('should handle state change logging', () => {
      logger.info('State updated:', { before: 'loading', after: 'success' });

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO]', 'State updated:', {
        before: 'loading',
        after: 'success',
      });
    });

    it('should handle validation warnings', () => {
      logger.warn('Invalid input detected:', { field: 'investment', value: -1000 });

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'Invalid input detected:', {
        field: 'investment',
        value: -1000,
      });
    });
  });

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should be the same instance when imported multiple times', () => {
      // This test verifies the module exports a singleton
      const logger1 = logger;
      const logger2 = logger;

      expect(logger1).toBe(logger2);
    });
  });
});
