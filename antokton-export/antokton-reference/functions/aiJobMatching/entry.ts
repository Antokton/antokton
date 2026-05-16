import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile and preferences
    const userProfile = {
      skills: user.skills || '',
      experience_years: user.experience_years || 0,
      job_title: user.job_title || '',
      languages: user.languages || [],
      location: user.location || ''
    };

    // Get all approved jobs
    const jobs = await base44.entities.Job.filter({ status: 'approved' });

    // Use AI to match jobs
    const matchPromises = jobs.map(async (job) => {
      const prompt = `
        Analyze if this job matches the user's profile.
        
        User Profile:
        - Skills: ${userProfile.skills}
        - Experience: ${userProfile.experience_years} years
        - Job Title: ${userProfile.job_title}
        - Languages: ${userProfile.languages.map(l => `${l.language} (${l.level})`).join(', ')}
        - Location: ${userProfile.location}
        
        Job:
        - Title: ${job.title}
        - Description: ${job.description}
        - Required Skills: ${job.required_skills || 'Not specified'}
        - Experience Level: ${job.experience_level || 'Not specified'}
        - Location: ${job.city}, ${job.country}
        
        Provide a match score (0-100) and reasons for the match.
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
        job_id: job.id,
        job,
        ...result
      };
    });

    const matches = await Promise.all(matchPromises);

    // Filter matches with score > 50 and sort by score
    const goodMatches = matches
      .filter(m => m.match_score > 50)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 10); // Top 10 matches

    // Save matches to database
    for (const match of goodMatches) {
      await base44.entities.JobMatch.create({
        job_id: match.job_id,
        user_email: user.email,
        match_score: match.match_score,
        match_reasons: match.match_reasons
      });

      // Create notification if preference enabled
      const prefs = await base44.entities.NotificationPreference.filter({ 
        user_email: user.email 
      });
      
      if (prefs.length === 0 || prefs[0].job_matches) {
        await base44.entities.Notification.create({
          user_email: user.email,
          type: 'application',
          title: 'Punë e re që përputhet!',
          message: `Punë e përshtatshme: ${match.job.title} - ${match.match_score}% përputhje`,
          link: `/PostDetail?jobId=${match.job_id}`
        });
      }
    }

    return Response.json({ 
      success: true, 
      matches: goodMatches.map(m => ({
        job: m.job,
        score: m.match_score,
        reasons: m.match_reasons
      }))
    });

  } catch (error) {
    console.error('AI Job Matching Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});