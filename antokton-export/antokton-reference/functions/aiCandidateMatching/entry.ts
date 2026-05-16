import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id } = await req.json();

    if (!job_id) {
      return Response.json({ error: 'job_id required' }, { status: 400 });
    }

    // Get job details
    const job = await base44.entities.Job.get(job_id);

    // Get all job seeker users
    const users = await base44.asServiceRole.entities.User.list('-created_date', 1000);
    const jobSeekers = users.filter(u => 
      u.user_type === 'job_seeker' && u.email !== user.email
    );

    // Use AI to match candidates
    const matchPromises = jobSeekers.map(async (candidate) => {
      const prompt = `
        Analyze if this candidate matches the job requirements.
        
        Job:
        - Title: ${job.title}
        - Description: ${job.description}
        - Required Skills: ${job.required_skills || 'Not specified'}
        - Experience Level: ${job.experience_level || 'Not specified'}
        - Contract Type: ${job.contract_type || 'Not specified'}
        
        Candidate:
        - Name: ${candidate.first_name} ${candidate.surname}
        - Skills: ${candidate.skills || 'Not specified'}
        - Experience: ${candidate.experience_years || 0} years
        - Job Title: ${candidate.job_title || 'Not specified'}
        - Languages: ${candidate.languages?.map(l => `${l.language} (${l.level})`).join(', ') || 'Not specified'}
        - Bio: ${candidate.bio || 'Not specified'}
        
        Provide a match score (0-100) and reasons.
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            match_score: { type: "number" },
            match_reasons: { 
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      return {
        candidate,
        ...result
      };
    });

    const matches = await Promise.all(matchPromises);

    // Filter and sort matches
    const goodMatches = matches
      .filter(m => m.match_score > 60)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 20); // Top 20 candidates

    return Response.json({ 
      success: true, 
      candidates: goodMatches.map(m => ({
        candidate: {
          email: m.candidate.email,
          name: `${m.candidate.first_name} ${m.candidate.surname}`,
          job_title: m.candidate.job_title,
          skills: m.candidate.skills,
          experience_years: m.candidate.experience_years,
          location: m.candidate.location
        },
        score: m.match_score,
        reasons: m.match_reasons
      }))
    });

  } catch (error) {
    console.error('AI Candidate Matching Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});