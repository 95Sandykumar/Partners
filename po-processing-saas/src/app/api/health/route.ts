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
      ? { status: 'unhealthy', latency_ms: Date.now() - dbStart }
      : { status: 'healthy', latency_ms: Date.now() - dbStart };
  } catch {
    checks.database = { status: 'unhealthy', latency_ms: Date.now() - dbStart };
  }

  // Auth service
  const authStart = Date.now();
  try {
    const supabase = await createServiceClient();
    const { error } = await supabase.auth.getUser();
    // Expected to fail without token, but service should respond
    checks.auth = { status: 'healthy', latency_ms: Date.now() - authStart };
    if (error && error.message.includes('fetch')) {
      checks.auth = { status: 'unhealthy', latency_ms: Date.now() - authStart };
    }
  } catch {
    checks.auth = { status: 'unhealthy', latency_ms: Date.now() - authStart };
  }

  // Storage bucket
  const storageStart = Date.now();
  try {
    const supabase = await createServiceClient();
    const { error } = await supabase.storage.getBucket('po-pdfs');
    checks.storage = error
      ? { status: 'unhealthy', latency_ms: Date.now() - storageStart }
      : { status: 'healthy', latency_ms: Date.now() - storageStart };
  } catch {
    checks.storage = { status: 'unhealthy', latency_ms: Date.now() - storageStart };
  }

  // Mistral API key configured (no detail exposed to avoid info leakage)
  checks.extraction_api = process.env.MISTRAL_API_KEY
    ? { status: 'healthy' }
    : { status: 'unhealthy' };

  // Stripe key configured
  checks.stripe = process.env.STRIPE_SECRET_KEY
    ? { status: 'healthy' }
    : { status: 'unhealthy' };

  // Stripe webhook secret configured
  checks.stripe_webhook = process.env.STRIPE_WEBHOOK_SECRET
    ? { status: 'healthy' }
    : { status: 'unhealthy' };

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
