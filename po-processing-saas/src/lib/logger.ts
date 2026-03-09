import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createRequestLogger(reqId: string, orgId?: string, userId?: string) {
  return logger.child({ reqId, orgId, userId });
}

/**
 * Create a module-scoped logger for consistent log context.
 * Usage: const log = createModuleLogger('extraction-pipeline');
 */
export function createModuleLogger(module: string) {
  return logger.child({ module });
}

/**
 * Structured error context for logging API and pipeline errors.
 * Extracts safe, serializable fields from an unknown error.
 */
export function errorContext(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }
  return { errorMessage: String(error) };
}
