import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import { BILLING_PLANS, getTierToPriceIdMap } from '@/lib/stripe/plans';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIp(request);
    const { success } = await limiter.check(ip, 5);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { validateBody } = await import('@/lib/validation/validate');
    const { CheckoutSchema } = await import('@/lib/validation/schemas');
    const validation = validateBody(CheckoutSchema, body);
    if (!validation.success) return validation.response;
    const { tier } = validation.data;

    // Get user's org
    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can manage billing' }, { status: 403 });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, stripe_customer_id')
      .eq('id', userProfile.organization_id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const stripe = getStripe();
    const priceIds = getTierToPriceIdMap();
    const priceId = priceIds[tier];

    if (!priceId) {
      return NextResponse.json({ error: 'Stripe price not configured for this tier' }, { status: 400 });
    }

    // Create or retrieve Stripe customer (with race condition protection)
    let customerId = org.stripe_customer_id;

    if (!customerId) {
      // Re-check with fresh query to prevent race condition
      const { data: freshOrg } = await supabase
        .from('organizations')
        .select('stripe_customer_id')
        .eq('id', org.id)
        .single();

      if (freshOrg?.stripe_customer_id) {
        customerId = freshOrg.stripe_customer_id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: {
            organization_id: org.id,
            organization_name: org.name,
          },
        });

        customerId = customer.id;

        // Use update with a WHERE clause that ensures no other request set it first
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ stripe_customer_id: customerId })
          .eq('id', org.id)
          .is('stripe_customer_id', null);

        if (updateError) {
          // Another request already set the customer ID - fetch theirs
          const { data: raceOrg } = await supabase
            .from('organizations')
            .select('stripe_customer_id')
            .eq('id', org.id)
            .single();

          if (raceOrg?.stripe_customer_id) {
            customerId = raceOrg.stripe_customer_id;
            // Clean up the duplicate Stripe customer
            await stripe.customers.del(customer.id);
          }
        }
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?upgrade=canceled`,
      metadata: {
        organization_id: org.id,
        tier,
      },
    });

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error: unknown) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
