import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.user_type !== 'employer' && user.user_type !== 'recruiter' && user.role !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { questionnaireId } = await req.json();

    // Merr pyetësorin
    const questionnaires = await base44.asServiceRole.entities.Questionnaire.filter({ 
      id: questionnaireId 
    });
    
    if (questionnaires.length === 0) {
      return Response.json({ error: 'Questionnaire not found' }, { status: 404 });
    }

    const questionnaire = questionnaires[0];

    // Merr të gjitha përgjigjet
    const responses = await base44.asServiceRole.entities.QuestionnaireResponse.filter({
      questionnaire_id: questionnaireId
    });

    if (responses.length === 0) {
      return Response.json({ 
        message: "Nuk ka përgjigje ende",
        analysis: null 
      });
    }

    // Analizo përgjigjet me AI
    const prompt = `Analizo këto përgjigje të pyetësorit për një pozicion pune:

Pyetjet:
${questionnaire.questions.map((q, i) => `${i + 1}. ${q.question} (${q.type})`).join('\n')}

Përgjigjet e kandidatëve:
${responses.map((r, i) => `
Kandidati ${i + 1}:
${r.responses.map(res => `Q: ${res.question}\nP: ${res.answer}`).join('\n')}
`).join('\n---\n')}

Jep një analizë të përgjithshme dhe identifiko tendencat kryesore, përgjigjet më të mira, dhe rekomandime.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_summary: { type: "string" },
          top_performers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                applicant_index: { type: "number" },
                strengths: { type: "string" }
              }
            }
          },
          common_themes: {
            type: "array",
            items: { type: "string" }
          },
          recommendations: { type: "string" }
        }
      }
    });

    return Response.json({
      questionnaire_title: questionnaire.title,
      total_responses: responses.length,
      analysis: result
    });

  } catch (error) {
    console.error('Questionnaire analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});