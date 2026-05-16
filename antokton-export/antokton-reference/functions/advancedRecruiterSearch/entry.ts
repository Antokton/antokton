import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.user_type !== "employer" && user.user_type !== "recruiter") {
      return Response.json({ error: 'Only recruiters and employers can use this feature' }, { status: 403 });
    }

    const { 
      skills, 
      experience_level, 
      location, 
      keywords,
      min_experience_years,
      profession
    } = await req.json();

    // Fetch all job seekers
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const jobSeekers = allUsers.filter(u => u.user_type === 'job_seeker');

    // Build search criteria
    const searchCriteria = {
      skills: skills || '',
      experience_level: experience_level || '',
      location: location || '',
      keywords: keywords || '',
      min_experience_years: min_experience_years || 0,
      profession: profession || ''
    };

    const prompt = `
Ju jeni një sistem AI kërkimi për rekrutues. Duhet të gjeni kandidatët më të përshtatshëm bazuar në këto kritere:
- Aftësi të kërkuara: ${searchCriteria.skills}
- Niveli i përvojës: ${searchCriteria.experience_level}
- Vendndodhja: ${searchCriteria.location}
- Fjalë kyçe: ${searchCriteria.keywords}
- Vite përvojë minimum: ${searchCriteria.min_experience_years}
- Profesioni: ${searchCriteria.profession}

Këta janë kandidatët e disponueshëm:
${jobSeekers.slice(0, 100).map(js => 
  `Email: ${js.email}, Emri: ${js.first_name || ''} ${js.surname || ''}, Profesioni: ${js.profession || 'N/A'}, Aftësi: ${js.skills || 'N/A'}, Nivel: ${js.experience_level || 'N/A'}, Vite: ${js.experience_years || 0}, Vendndodhja: ${js.location || 'N/A'}, Bio: ${js.bio?.substring(0, 100) || 'N/A'}`
).join('\n')}

Analizo çdo kandidat dhe jep një skor përputhshmërie (0-100) dhe një arsyetim të shkurtër. Rendit rezultatet nga më të përshtatshmet.
Kthe maksimum 20 kandidatë.

Format: {
  "candidates": [
    {
      "email": "user@example.com",
      "match_score": 95,
      "match_reason": "arsyeja e shkurtër"
    }
  ]
}
`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          candidates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                email: { type: "string" },
                match_score: { type: "number" },
                match_reason: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Get full candidate details
    const matches = aiResponse.candidates.map(candidate => {
      const user = jobSeekers.find(js => js.email === candidate.email);
      if (!user) return null;
      
      return {
        email: user.email,
        full_name: user.first_name && user.surname ? `${user.first_name} ${user.surname}` : user.full_name,
        profession: user.profession,
        skills: user.skills,
        experience_level: user.experience_level,
        experience_years: user.experience_years,
        location: user.location,
        bio: user.bio,
        match_score: candidate.match_score,
        match_reason: candidate.match_reason
      };
    }).filter(c => c !== null);

    return Response.json({
      success: true,
      matches: matches,
      total_candidates: jobSeekers.length,
      search_criteria: searchCriteria
    });
  } catch (error) {
    console.error('Error in advanced search:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});