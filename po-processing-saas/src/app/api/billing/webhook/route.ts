import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { createServiceClient } from '@/lib/supabase/server';
import { BILLING_PLANS, getPriceIdToTierMap } from '@/lib/stripe/plans';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import type Stripe from 'stripe';

const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });

// Stripe webhooks have no user session - skip auth check
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { success } = await limiter.check(ip, 100);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const supabase = await createServiceClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organization_id;
        const tier = session.metadata?.tier;

        if (orgId && tier && session.subscription) {
          await handleSubscriptionUpdate(supabase, orgId, session.subscription as string, tier, 'active');
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

          await handleSubscriptionUpdate(
            supabase,
            org.id,
            subscription.id,
            tier,
            statusMap[subscription.status] || 'inactive'
          );
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
          await supabase
            .from('organizations')
            .update({
              subscription_tier: 'free',
              monthly_po_limit: BILLING_PLANS.free.poLimit,
              stripe_subscription_id: null,
              subscription_status: 'canceled',
            })
            .eq('id', org.id);
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
          await supabase
            .from('organizations')
            .update({ subscription_status: 'past_due' })
            .eq('id', org.id);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Webhook failed';
    return NextResponse.json({ error: message }, { status: 400 });
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

  await supabase
    .from('organizations')
    .update({
      subscription_tier: tier,
      monthly_po_limit: plan.poLimit === -1 ? 999999 : plan.poLimit,
      stripe_subscription_id: subscriptionId,
      subscription_status: status,
    })
    .eq('id', orgId);
}
