Deno.serve(async (req) => {
  try {
    return Response.json({
      publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY")
    });
  } catch (error) {
    console.error('Error getting Stripe config:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});