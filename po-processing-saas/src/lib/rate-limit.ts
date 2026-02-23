import { NextRequest } from 'next/server';

// Simple sliding-window rate limiter using in-memory Map.
//
// This works well for Vercel's persistent Node.js workers in a single region,
// where the Map persists across requests within the same process. However,
// it has limitations:
//   - State is lost on cold starts or redeployments
//   - Not shared across multiple instances/regions
//
// For multi-region or high-scale deployments, replace with Upstash Redis:
//   npm install @upstash/ratelimit @upstash/redis
//   import { Ratelimit } from '@upstash/ratelimit';
//   import { Redis } from '@upstash/redis';
//   const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '60 s') });
//
// Usage: const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });
// In route: const { success } = await limiter.check(ip, limit);

interface RateLimitEntry {
  count: number;
  lastReset: number;
}

interface RateLimitOptions {
  /** Time window in milliseconds (e.g. 60_000 for 1 minute) */
  interval: number;
  /** Max number of unique tokens (IPs) to track per interval */
  uniqueTokenPerInterval: number;
}

export function rateLimit(options: RateLimitOptions) {
  const { interval, uniqueTokenPerInterval } = options;
  const tokenMap = new Map<string, RateLimitEntry>();

  // Periodically clean up expired entries every interval
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of tokenMap) {
      if (now - entry.lastReset >= interval) {
        tokenMap.delete(key);
      }
    }
  }, interval);

  // Allow garbage collection of the interval in serverless environments
  if (cleanup.unref) {
    cleanup.unref();
  }

  return {
    check(token: string, limit: number): Promise<{ success: boolean }> {
      const now = Date.now();
      const entry = tokenMap.get(token);

      if (!entry || now - entry.lastReset >= interval) {
        // New window - reset count
        tokenMap.set(token, { count: 1, lastReset: now });

        // Evict oldest entries if we exceed the max unique tokens
        if (tokenMap.size > uniqueTokenPerInterval) {
          const firstKey = tokenMap.keys().next().value;
          if (firstKey !== undefined) {
            tokenMap.delete(firstKey);
          }
        }

        return Promise.resolve({ success: true });
      }

      // Same window - increment count
      entry.count += 1;

      if (entry.count > limit) {
        return Promise.resolve({ success: false });
      }

      return Promise.resolve({ success: true });
    },
  };
}

/**
 * Extract client IP from request headers.
 * Checks x-forwarded-for, x-real-ip, then falls back to '127.0.0.1'.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs; take the first one
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return '127.0.0.1';
}
