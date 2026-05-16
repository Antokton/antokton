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

    const { priceId, userEmail, planName } = await req.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: priceId === 'price_1T1Qh1AwARmWzmF9hPUAsH9b' ? 'subscription' : 'payment',
      success_url: `${req.headers.get('origin')}?subscription=success`,
      cancel_url: `${req.headers.get('origin')}/Subscriptions?subscription=cancelled`,
      customer_email: userEmail,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        user_email: userEmail,
        plan_name: planName
      }
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});