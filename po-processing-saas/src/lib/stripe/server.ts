import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/** Lazy-initialized Stripe client. Only throws if called without STRIPE_SECRET_KEY. */
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
    });
  }
  return _stripe;
}
