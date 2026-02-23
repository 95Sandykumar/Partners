import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
});

const optionalEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export function validateEnv(): void {
  const isProduction = process.env.NODE_ENV === 'production';

  // Always validate required vars
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');

    if (isProduction) {
      throw new Error(`Missing required environment variables:\n${message}`);
    } else {
      console.warn(`[env] Missing environment variables:\n${message}`);
    }
  }

  // Check optional but recommended vars
  const optional = optionalEnvSchema.safeParse(process.env);
  if (!optional.success) {
    const warnings = optional.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    if (isProduction) {
      console.warn(`[env] Missing optional environment variables:\n${warnings}`);
    }
  }

  // Production-specific checks
  if (isProduction) {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('placeholder')) {
      throw new Error('ANTHROPIC_API_KEY must be set to a real key in production');
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('[env] STRIPE_SECRET_KEY not set - billing features will be unavailable');
    }
  }
}
