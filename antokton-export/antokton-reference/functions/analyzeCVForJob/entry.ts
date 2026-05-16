import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cvText, jobDescription } = await req.json();

    if (!cvText || !jobDescription) {
      return Response.json({ error: 'CV text and job description required' }, { status: 400 });
    }

    const prompt = `Analizo këtë CV dhe jep sugjerime konkrete për përmirësim bazuar në përshkrimin e punës:

CV:
${cvText}

Përshkrimi i punës:
${jobDescription}

Jep 5-7 sugjerime konkrete në shqip për të përmirësuar CV-në që të përputhet më mirë me këtë pozicion.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" }
              }
            }
          },
          match_score: { type: "number" },
          overall_feedback: { type: "string" }
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    console.error('CV Analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});