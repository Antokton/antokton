import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activity_type, related_job_id, related_user_email, search_query, search_filters, metadata } = await req.json();

    // Krijo aktivitet
    await base44.entities.UserActivity.create({
      user_email: user.email,
      activity_type,
      related_job_id,
      related_user_email,
      search_query,
      search_filters,
      metadata
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Track activity error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});