export interface BillingPlan {
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
  name: string;
  price: number;
  poLimit: number;       // -1 = unlimited
  userLimit: number;     // -1 = unlimited
  features: string[];
}

export const BILLING_PLANS: Record<string, BillingPlan> = {
  free: {
    tier: 'free',
    name: 'Free',
    price: 0,
    poLimit: 50,
    userLimit: 1,
    features: ['50 POs/month', '1 user', 'Email support'],
  },
  starter: {
    tier: 'starter',
    name: 'Starter',
    price: 299,
    poLimit: 200,
    userLimit: 2,
    features: ['200 POs/month', '2 users', 'Priority support', 'API access'],
  },
  professional: {
    tier: 'professional',
    name: 'Professional',
    price: 599,
    poLimit: 500,
    userLimit: 5,
    features: ['500 POs/month', '5 users', 'Priority support', 'API access', 'Custom templates'],
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 1299,
    poLimit: -1,
    userLimit: -1,
    features: ['Unlimited POs', 'Unlimited users', 'Dedicated support', 'Custom integrations', 'SLA'],
  },
};

/** Map Stripe Price IDs to tiers (populated from env vars at runtime) */
export function getPriceIdToTierMap(): Record<string, string> {
  return {
    [process.env.STRIPE_STARTER_PRICE_ID || '']: 'starter',
    [process.env.STRIPE_PROFESSIONAL_PRICE_ID || '']: 'professional',
    [process.env.STRIPE_ENTERPRISE_PRICE_ID || '']: 'enterprise',
  };
}

/** Map tiers to Stripe Price IDs */
export function getTierToPriceIdMap(): Record<string, string> {
  return {
    starter: process.env.STRIPE_STARTER_PRICE_ID || '',
    professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID || '',
    enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
  };
}
