import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { company_name, industry, company_size, additional_text } = await req.json();

    if (!company_name) {
      return Response.json({ error: 'Company name is required' }, { status: 400 });
    }

    const prompt = `
Gjeneroni një profil kompanie të plotë dhe tërheqës për:
- Emri i kompanisë: ${company_name}
- Industria: ${industry || 'N/A'}
- Madhësia: ${company_size || 'N/A'}
${additional_text ? `- Informacion shtesë: ${additional_text}` : ''}

Profili duhet të përfshijë:
1. Një përshkrim të shkurtër dhe profesional të kompanisë (2-3 paragrafe)
2. Vlerat kryesore të kompanisë (3-5 vlera)
3. Kultura e punës
4. Lista e keyword-eve dhe tag-eve relevante për industrinë dhe profilein

Përgjigjuni në format JSON me këtë strukturë:
{
  "description": "përshkrimi i plotë i kompanisë",
  "values": "vlerat e kompanisë",
  "culture": "kultura e punës",
  "keywords": ["keyword1", "keyword2", ...],
  "tags": ["tag1", "tag2", ...]
}
`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          description: { type: "string" },
          values: { type: "string" },
          culture: { type: "string" },
          keywords: {
            type: "array",
            items: { type: "string" }
          },
          tags: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({
      success: true,
      profile: aiResponse
    });
  } catch (error) {
    console.error('Error generating company profile:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});