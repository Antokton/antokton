import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia'
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planType, userEmail } = await req.json();

    const prices = {
      monthly: {
        amount: 200, // 2 EUR in cents
        interval: 'month'
      },
      yearly: {
        amount: 1500, // 15 EUR in cents
        interval: 'year'
      }
    };

    const priceData = prices[planType];
    if (!priceData) {
      return Response.json({ error: 'Invalid plan type' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: planType === 'monthly' ? 'Premium Mujor' : 'Premium Vjetor',
              description: `Abonim Premium Antokton - ${planType === 'monthly' ? 'Mujor' : 'Vjetor'}`
            },
            unit_amount: priceData.amount,
            recurring: {
              interval: priceData.interval
            }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/subscriptions?success=true`,
      cancel_url: `${req.headers.get('origin')}/subscriptions?canceled=true`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_email: userEmail,
        plan_type: planType
      }
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});