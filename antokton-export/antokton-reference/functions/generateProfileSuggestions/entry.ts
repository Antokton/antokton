import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_title, skills, current_bio, suggestion_type } = await req.json();

    let prompt = '';
    
    if (suggestion_type === 'bio') {
      prompt = `Generate a professional bio for a person with the following information:
Job Title: ${job_title || 'Not specified'}
Skills: ${skills || 'Not specified'}
Current Bio: ${current_bio || 'None'}

Write a concise, professional bio (2-3 sentences) that highlights their expertise and experience. Write in Albanian language.`;
    } else if (suggestion_type === 'work_experience') {
      prompt = `Generate a professional work experience description for:
Job Title: ${job_title || 'Not specified'}
Skills: ${skills || 'Not specified'}

Write 3-4 bullet points describing typical responsibilities and achievements for this role. Write in Albanian language. Format as bullet points.`;
    } else if (suggestion_type === 'skills') {
      prompt = `For someone with the job title "${job_title || 'Not specified'}", suggest 8-10 most relevant professional skills that employers look for. Return ONLY the skills separated by commas, no explanations. Write in Albanian language.`;
    } else if (suggestion_type === 'job_description') {
      prompt = `Generate a professional job posting description for:
Job Title: ${job_title || 'Not specified'}
Required Skills: ${skills || 'Not specified'}

Write a compelling job description (4-5 sentences) that attracts qualified candidates. Include key responsibilities and requirements. Write in Albanian language.`;
    } else {
      return Response.json({ error: 'Invalid suggestion type' }, { status: 400 });
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: false
    });

    return Response.json({ 
      suggestion: result,
      success: true 
    });

  } catch (error) {
    console.error('Error generating profile suggestions:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});