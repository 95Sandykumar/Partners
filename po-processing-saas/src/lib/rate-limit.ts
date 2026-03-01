import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

// Use Upstash Redis for distributed rate limiting if configured,
// otherwise fall back to in-memory for local development
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? Redis.fromEnv()
  : null;

interface RateLimitOptions {
  interval: number;
  uniqueTokenPerInterval: number;
}

export function rateLimit(options: RateLimitOptions) {
  if (redis) {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, `${options.interval}ms`),
      analytics: true,
    });

    return {
      async check(token: string, limit: number): Promise<{ success: boolean }> {
        const { success } = await limiter.limit(`${token}:${limit}`);
        return { success };
      },
    };
  }

  // Fallback: in-memory for local dev
  const tokenMap = new Map<string, { count: number; lastReset: number }>();
  const { interval } = options;

  return {
    check(token: string, limit: number): Promise<{ success: boolean }> {
      const now = Date.now();
      const entry = tokenMap.get(token);

      if (!entry || now - entry.lastReset >= interval) {
        tokenMap.set(token, { count: 1, lastReset: now });
        return Promise.resolve({ success: true });
      }

      entry.count += 1;
      return Promise.resolve({ success: entry.count <= limit });
    },
  };
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}
