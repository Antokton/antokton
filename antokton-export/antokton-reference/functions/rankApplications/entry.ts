import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.user_type !== 'employer' && user.user_type !== 'recruiter' && user.role !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { jobId } = await req.json();

    // Merr punën
    const jobs = await base44.asServiceRole.entities.Job.filter({ id: jobId });
    if (jobs.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }
    const job = jobs[0];

    // Merr të gjitha aplikimet për këtë punë
    const applications = await base44.asServiceRole.entities.JobApplication.filter({ 
      job_id: jobId 
    });

    if (applications.length === 0) {
      return Response.json({ ranked: [] });
    }

    // Përgatit të dhënat për AI
    const applicationsData = applications.map(app => ({
      id: app.id,
      name: app.applicant_name,
      email: app.applicant_email,
      cover_letter: app.cover_letter || "",
      cv_summary: `Aplikant: ${app.applicant_name}${app.applicant_phone ? `, Tel: ${app.applicant_phone}` : ''}`
    }));

    const prompt = `Analizo këto aplikime për pozicionin e punës dhe renditi nga më i përshtatshmi tek më pak i përshtatshmi.

Përshkrimi i punës:
${job.description}
${job.required_skills ? `\nAftësi të kërkuara: ${job.required_skills}` : ''}
${job.experience_level ? `\nNivel përvoje: ${job.experience_level}` : ''}

Aplikimet:
${applicationsData.map((app, i) => `
${i + 1}. ${app.name}
Letra motivuese: ${app.cover_letter || 'Nuk ka'}
`).join('\n')}

Jep një renditje të aplikantëve me një rezultat nga 0-100 për secilin.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          rankings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                application_id: { type: "string" },
                score: { type: "number" },
                reasoning: { type: "string" },
                strengths: { 
                  type: "array",
                  items: { type: "string" }
                },
                concerns: { 
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          }
        }
      }
    });

    return Response.json(result);

  } catch (error) {
    console.error('Rank applications error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});