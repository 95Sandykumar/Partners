import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { createServiceClient } from '@/lib/supabase/server';
import { BILLING_PLANS, getPriceIdToTierMap } from '@/lib/stripe/plans';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import type Stripe from 'stripe';

const log = logger.child({ module: 'stripe-webhook' });
const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });

// Stripe webhooks have no user session - skip auth check
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { success } = await limiter.check(ip, 100);
    if (!success) {
      log.warn({ ip }, 'webhook rate limited');
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      log.warn({ hasSignature: !!signature, hasSecret: !!process.env.STRIPE_WEBHOOK_SECRET }, 'webhook missing signature or secret');
      return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    log.info({ eventId: event.id, eventType: event.type }, 'webhook event received');

    const supabase = await createServiceClient();

    // Idempotency check - skip if already processed
    const { data: existing } = await supabase
      .from('webhook_events')
      .select('event_id')
      .eq('event_id', event.id)
      .single();

    if (existing) {
      log.info({ eventId: event.id }, 'duplicate webhook event skipped');
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Record event before processing (prevents re-processing on crash)
    await supabase
      .from('webhook_events')
      .insert({ event_id: event.id, event_type: event.type });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organization_id;
        const tier = session.metadata?.tier;

        if (orgId && tier && session.subscription) {
          log.info({ orgId, tier, subscriptionId: session.subscription }, 'checkout session completed');
          await handleSubscriptionUpdate(supabase, orgId, session.subscription as string, tier, 'active');
        } else {
          log.warn({ eventId: event.id, orgId, tier, subscription: session.subscription }, 'checkout session missing metadata');
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: org } = await supabase
          .from('organizations')
          .select('id, subscription_tier')
          .eq('stripe_customer_id', customerId)
          .single();

        if (org) {
          const priceId = subscription.items.data[0]?.price.id;
          const priceToTier = getPriceIdToTierMap();
          const tier = priceToTier[priceId] || org.subscription_tier;

          const statusMap: Record<string, string> = {
            active: 'active',
            past_due: 'past_due',
            canceled: 'canceled',
            trialing: 'trialing',
            incomplete: 'inactive',
            incomplete_expired: 'inactive',
            unpaid: 'past_due',
            paused: 'inactive',
          };

          log.info({ orgId: org.id, tier, stripeStatus: subscription.status, mappedStatus: statusMap[subscription.status] }, 'subscription updated');
          await handleSubscriptionUpdate(
            supabase,
            org.id,
            subscription.id,
            tier,
            statusMap[subscription.status] || 'inactive'
          );
        } else {
          log.warn({ customerId, eventType: event.type }, 'no organization found for stripe customer');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (org) {
          log.info({ orgId: org.id, customerId }, 'subscription canceled, reverting to free tier');
          await supabase
            .from('organizations')
            .update({
              subscription_tier: 'free',
              monthly_po_limit: BILLING_PLANS.free.poLimit,
              stripe_subscription_id: null,
              subscription_status: 'canceled',
            })
            .eq('id', org.id);
        } else {
          log.warn({ customerId }, 'subscription deleted but no org found');
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (org) {
          log.warn({ orgId: org.id, customerId, invoiceId: invoice.id }, 'invoice payment failed, marking past_due');
          await supabase
            .from('organizations')
            .update({ subscription_status: 'past_due' })
            .eq('id', org.id);
        } else {
          log.warn({ customerId }, 'payment failed but no org found');
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: org } = await supabase
          .from('organizations')
          .select('id, subscription_status')
          .eq('stripe_customer_id', customerId)
          .single();

        if (org && org.subscription_status !== 'active') {
          log.info({ orgId: org.id, customerId, previousStatus: org.subscription_status }, 'payment succeeded, reactivating subscription');
          await supabase
            .from('organizations')
            .update({ subscription_status: 'active' })
            .eq('id', org.id);
        }
        break;
      }

      default: {
        log.info({ eventType: event.type, eventId: event.id }, 'unhandled webhook event type');
      }
    }

    log.info({ eventId: event.id, eventType: event.type }, 'webhook event processed successfully');
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    // Stripe signature verification failures should return 400
    // (tells Stripe the webhook is misconfigured)
    if (error instanceof Error && error.message.includes('signature')) {
      log.error({ error: error.message }, 'webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    // All other errors: return 200 to acknowledge receipt
    // (prevents Stripe from retrying business logic errors)
    log.error({ error: error instanceof Error ? error.message : String(error) }, 'webhook processing error');
    return NextResponse.json({ received: true, error: 'Processing failed' }, { status: 200 });
  }
}

async function handleSubscriptionUpdate(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  orgId: string,
  subscriptionId: string,
  tier: string,
  status: string
) {
  const plan = BILLING_PLANS[tier as keyof typeof BILLING_PLANS] || BILLING_PLANS.free;

  const { error } = await supabase
    .from('organizations')
    .update({
      subscription_tier: tier,
      monthly_po_limit: plan.poLimit === -1 ? 999999 : plan.poLimit,
      stripe_subscription_id: subscriptionId,
      subscription_status: status,
    })
    .eq('id', orgId);

  if (error) {
    log.error({ orgId, tier, status, error: error.message }, 'failed to update subscription in database');
    throw new Error(`Failed to update subscription: ${error.message}`);
  }
}
