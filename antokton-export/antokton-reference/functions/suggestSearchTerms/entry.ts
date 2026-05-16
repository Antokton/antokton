import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await req.json();

    // Merr aktivitetet e fundit të përdoruesit
    const activities = await base44.entities.UserActivity.filter(
      { user_email: user.email, activity_type: 'search' },
      '-created_date',
      20
    );

    const previousSearches = activities
      .filter(a => a.search_query)
      .map(a => a.search_query);

    const prompt = `Bazuar në kërkimin aktual "${query}" dhe kërkesat e mëparshme: ${previousSearches.join(', ')},
sugjero 5 terma kërkimi relevantë për një portal pune. Përgjigju me një listë JSON:
{"suggestions": ["term1", "term2", "term3", "term4", "term5"]}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    console.error('Suggest search terms error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});