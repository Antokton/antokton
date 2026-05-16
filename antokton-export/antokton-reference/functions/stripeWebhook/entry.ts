import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
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

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userEmail = session.metadata.user_email;
      const planType = session.metadata.plan_type;
      const postsIncluded = parseInt(session.metadata.posts_included || 0);

      const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
      if (users.length === 0) {
        console.error('User not found:', userEmail);
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const user = users[0];
      const currentPosts = user.posts_remaining || 0;

      const expiresAt = new Date();
      if (planType.includes('monthly')) {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else if (planType.includes('yearly')) {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }

      await base44.asServiceRole.entities.User.update(user.id, {
        subscription_type: planType,
        posts_remaining: postsIncluded === 999999 ? 999999 : currentPosts + postsIncluded,
        subscription_expires: expiresAt.toISOString()
      });

      await base44.asServiceRole.entities.Subscription.create({
        user_email: userEmail,
        plan_type: planType,
        amount: session.amount_total / 100,
        posts_included: postsIncluded,
        valid_until: expiresAt.toISOString(),
        payment_status: 'completed'
      });

      console.log(`Subscription activated for ${userEmail}: ${planType}`);
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const userEmail = subscription.metadata.user_email;

      if (userEmail) {
        const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            subscription_type: 'none',
            posts_remaining: 0
          });
          console.log(`Subscription canceled for ${userEmail}`);
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});