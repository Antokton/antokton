import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cvText, jobDescription, applicantName, companyName } = await req.json();

    if (!cvText || !jobDescription || !applicantName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const prompt = `Gjenero një letër motivuese profesionale në shqip bazuar në:

Kandidati: ${applicantName}
${companyName ? `Kompania: ${companyName}` : ''}

CV:
${cvText}

Përshkrimi i punës:
${jobDescription}

Shkruaj një letër motivuese të shkurtër (200-250 fjalë) që:
- Thekson përvojën dhe aftësitë relevante
- Tregon entuziazëm për pozicionin
- Është profesionale por miqësore
- Ka një ton të natyrshëm shqiptar`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          cover_letter: { type: "string" }
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    console.error('Cover letter generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});