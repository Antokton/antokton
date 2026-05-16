import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia'
});

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event;

  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { user_email, plan_type } = session.metadata;

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const endDate = new Date(subscription.current_period_end * 1000);

        await base44.asServiceRole.entities.PremiumSubscription.create({
          user_email,
          plan_type,
          amount: session.amount_total / 100,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          is_active: true,
          stripe_subscription_id: session.subscription
        });

        await base44.asServiceRole.entities.Notification.create({
          user_email,
          type: 'system',
          title: 'Mirë se erdhe në Premium!',
          message: `Abonimet tuaj ${plan_type === 'monthly' ? 'mujor' : 'vjetor'} është aktivizuar me sukses.`,
          link: '/subscriptions'
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const endDate = new Date(subscription.current_period_end * 1000);

          const subs = await base44.asServiceRole.entities.PremiumSubscription.filter({
            stripe_subscription_id: invoice.subscription
          });

          if (subs.length > 0) {
            await base44.asServiceRole.entities.PremiumSubscription.update(subs[0].id, {
              end_date: endDate.toISOString(),
              is_active: true
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subs = await base44.asServiceRole.entities.PremiumSubscription.filter({
          stripe_subscription_id: subscription.id
        });

        if (subs.length > 0) {
          await base44.asServiceRole.entities.PremiumSubscription.update(subs[0].id, {
            is_active: false
          });
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});