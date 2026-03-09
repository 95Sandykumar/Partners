import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { logger, errorContext } from '@/lib/logger';

interface ApiErrorOptions {
  /** Module name for structured log context */
  module: string;
  /** Optional request ID for correlation */
  reqId?: string;
  /** Optional organization ID for tenant context */
  orgId?: string;
  /** Optional user ID */
  userId?: string;
}

/**
 * Wrap an API route handler with structured error logging and Sentry capture.
 * Returns a consistent JSON error response without leaking internal details.
 *
 * Usage:
 *   return handleApiError(error, { module: 'po-upload', orgId, userId });
 */
export function handleApiError(
  error: unknown,
  options: ApiErrorOptions,
  statusCode = 500,
  userMessage = 'An unexpected error occurred. Please try again.'
): NextResponse {
  const log = logger.child({
    module: options.module,
    reqId: options.reqId,
    orgId: options.orgId,
    userId: options.userId,
  });

  log.error(errorContext(error), `API error in ${options.module}`);

  // Report to Sentry with structured context
  Sentry.captureException(error, {
    tags: {
      module: options.module,
      orgId: options.orgId,
    },
    extra: {
      reqId: options.reqId,
      userId: options.userId,
    },
  });

  return NextResponse.json(
    {
      error: userMessage,
      ...(options.reqId ? { requestId: options.reqId } : {}),
    },
    { status: statusCode }
  );
}

/**
 * Generate a short request ID for log correlation.
 * Format: timestamp-random (e.g., "1709913600000-a3f2b1")
 */
export function generateRequestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}
