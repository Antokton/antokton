import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    console.log('Webhook event:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userEmail = session.metadata.user_email;
      const planName = session.metadata.plan_name;
      const amountPaid = session.amount_total / 100; // Convert from cents

      let subscriptionType, duration;
      
      if (planName.includes('Mujor')) {
        subscriptionType = 'monthly';
        duration = 30;
      } else if (planName.includes('6 Mujor')) {
        subscriptionType = '6_months';
        duration = 180;
      } else if (planName.includes('Rinovim')) {
        subscriptionType = 'yearly_renewal';
        duration = 365;
      } else {
        subscriptionType = 'yearly_first';
        duration = 365;
      }

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);

      // Check if renewal
      const pastSubs = await base44.asServiceRole.entities.PremiumSubscription.filter({
        user_email: userEmail
      });
      const isRenewal = pastSubs.length > 0;

      await base44.asServiceRole.entities.PremiumSubscription.create({
        user_email: userEmail,
        subscription_type: subscriptionType,
        stripe_payment_id: session.payment_intent || session.id,
        stripe_subscription_id: session.subscription || null,
        amount_paid: amountPaid,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
        auto_renew: subscriptionType === 'monthly',
        is_renewal: isRenewal && subscriptionType.includes('yearly')
      });

      console.log(`Subscription created for ${userEmail}: ${subscriptionType}`);
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      
      // Deactivate subscription
      const subs = await base44.asServiceRole.entities.PremiumSubscription.filter({
        stripe_subscription_id: subscription.id
      });

      for (const sub of subs) {
        await base44.asServiceRole.entities.PremiumSubscription.update(sub.id, {
          is_active: false
        });
      }

      console.log(`Subscription cancelled: ${subscription.id}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
});