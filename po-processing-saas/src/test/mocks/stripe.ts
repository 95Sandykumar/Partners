import { vi } from 'vitest';

export function createMockStripe() {
  return {
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
      del: vi.fn().mockResolvedValue({}),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/test' }),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  };
}

export function mockGetStripe(stripe: ReturnType<typeof createMockStripe>) {
  vi.mock('@/lib/stripe/server', () => ({
    getStripe: vi.fn().mockReturnValue(stripe),
  }));
}
