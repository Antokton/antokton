import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cvUrl } = await req.json();

    if (!cvUrl) {
      return Response.json({ error: 'CV URL required' }, { status: 400 });
    }

    // Nxirr të dhënat nga CV
    const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: cvUrl,
      json_schema: {
        type: "object",
        properties: {
          full_name: { type: "string" },
          contact: { type: "string" },
          education: { type: "string" },
          experience: { type: "string" },
          skills: { type: "string" },
          languages: { type: "string" }
        }
      }
    });

    if (extractResult.status === "error") {
      return Response.json({ error: extractResult.details }, { status: 500 });
    }

    const cvData = extractResult.output;

    // Gjenero përmbledhje me AI
    const prompt = `Krijo një përmbledhje të shkurtër dhe të strukturuar të këtij CV në shqip:

${JSON.stringify(cvData, null, 2)}

Jep një përmbledhje profesionale që përfshin pikat kryesore.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          key_highlights: {
            type: "array",
            items: { type: "string" }
          },
          years_of_experience: { type: "string" },
          top_skills: {
            type: "array",
            items: { type: "string" }
          },
          education_level: { type: "string" }
        }
      }
    });

    return Response.json({
      ...result,
      raw_data: cvData
    });

  } catch (error) {
    console.error('CV summarization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});