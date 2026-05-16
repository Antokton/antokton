import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  try {
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { job_id, featured_type, duration_days, user_email } = session.metadata;

      if (job_id && featured_type && duration_days) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + parseInt(duration_days));

        // Krijo FeaturedJob
        await base44.asServiceRole.entities.FeaturedJob.create({
          job_id,
          featured_type,
          price_paid: session.amount_total / 100,
          stripe_payment_id: session.payment_intent,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          is_active: true,
          impression_count: 0,
          click_count: 0,
          created_by: user_email
        });

        console.log(`Featured job created: ${job_id} (${featured_type}) for ${duration_days} days`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
});