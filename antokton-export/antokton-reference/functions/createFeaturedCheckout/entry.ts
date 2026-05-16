import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id, featured_type, duration_days } = await req.json();

    // Çmimet bazë
    const prices = {
      homepage: 10, // 10€ per ditë për homepage featured
      urgent: 5,    // 5€ per ditë për urgent
      priority: 3   // 3€ per ditë për priority
    };

    const price = prices[featured_type] || 5;
    const totalAmount = price * duration_days;

    // Krijo checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Njoftim i ${featured_type === 'homepage' ? 'veçantë në faqen kryesore' : featured_type === 'urgent' ? 'urgjent' : 'me përparësi'}`,
              description: `${duration_days} ditë`,
            },
            unit_amount: totalAmount * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/feed?featured_success=true`,
      cancel_url: `${req.headers.get('origin')}/feed?featured_cancelled=true`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        job_id,
        featured_type,
        duration_days,
        user_email: user.email
      }
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Create featured checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});