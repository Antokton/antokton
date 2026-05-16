import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId, planType, posts } = await req.json();

    if (!priceId || !planType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'https://antokton.base44.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/subscriptions?success=true`,
      cancel_url: `${origin}/subscriptions?canceled=true`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        user_email: user.email,
        plan_type: planType,
        posts_included: posts || 0
      },
      subscription_data: {
        metadata: {
          user_email: user.email,
          plan_type: planType,
          posts_included: posts || 0
        }
      }
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});