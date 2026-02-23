import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  latency_ms?: number;
  message?: string;
}

export async function GET() {
  const checks: Record<string, HealthCheck> = {};
  let allHealthy = true;

  // Database connectivity
  const dbStart = Date.now();
  try {
    const supabase = await createServiceClient();
    const { error } = await supabase.from('organizations').select('id').limit(1);
    checks.database = error
      ? { status: 'unhealthy', message: error.message, latency_ms: Date.now() - dbStart }
      : { status: 'healthy', latency_ms: Date.now() - dbStart };
  } catch (e) {
    checks.database = { status: 'unhealthy', message: String(e), latency_ms: Date.now() - dbStart };
  }

  // Auth service
  const authStart = Date.now();
  try {
    const supabase = await createServiceClient();
    const { error } = await supabase.auth.getUser();
    // Expected to fail without token, but service should respond
    checks.auth = { status: 'healthy', latency_ms: Date.now() - authStart };
    if (error && error.message.includes('fetch')) {
      checks.auth = { status: 'unhealthy', message: error.message, latency_ms: Date.now() - authStart };
    }
  } catch (e) {
    checks.auth = { status: 'unhealthy', message: String(e), latency_ms: Date.now() - authStart };
  }

  // Storage bucket
  const storageStart = Date.now();
  try {
    const supabase = await createServiceClient();
    const { error } = await supabase.storage.getBucket('po-pdfs');
    checks.storage = error
      ? { status: 'unhealthy', message: error.message, latency_ms: Date.now() - storageStart }
      : { status: 'healthy', latency_ms: Date.now() - storageStart };
  } catch (e) {
    checks.storage = { status: 'unhealthy', message: String(e), latency_ms: Date.now() - storageStart };
  }

  // Claude API key configured
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('placeholder');
  checks.claude_api = hasAnthropicKey
    ? { status: 'healthy' }
    : { status: 'unhealthy', message: 'ANTHROPIC_API_KEY not configured' };

  // Stripe key configured
  const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
  checks.stripe = hasStripeKey
    ? { status: 'healthy' }
    : { status: 'unhealthy', message: 'STRIPE_SECRET_KEY not configured' };

  // Determine overall health
  for (const check of Object.values(checks)) {
    if (check.status === 'unhealthy') {
      allHealthy = false;
      break;
    }
  }

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
