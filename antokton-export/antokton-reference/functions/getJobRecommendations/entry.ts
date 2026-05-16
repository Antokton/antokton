import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile data
    const userSkills = user.skills || '';
    const userJobTitle = user.job_title || '';
    const userLocation = user.location || '';
    const experienceYears = user.experience_years || 0;

    // Get user's application history
    const applications = await base44.asServiceRole.entities.JobApplication.filter({
      applicant_email: user.email
    }, '-created_date', 50);

    const appliedJobIds = applications.map(app => app.job_id);
    const appliedCategories = new Set();
    
    // Get applied jobs to extract categories
    if (appliedJobIds.length > 0) {
      const appliedJobs = await base44.asServiceRole.entities.Job.filter({
        status: 'approved'
      }, '-created_date', 100);
      
      appliedJobs.forEach(job => {
        if (appliedJobIds.includes(job.id)) {
          appliedCategories.add(job.category);
        }
      });
    }

    // Get all approved jobs
    const allJobs = await base44.asServiceRole.entities.Job.filter({
      status: 'approved'
    }, '-created_date', 200);

    // Filter out already applied jobs
    const availableJobs = allJobs.filter(job => !appliedJobIds.includes(job.id));

    // Use AI to score and rank jobs
    const prompt = `You are a job matching AI. Analyze the following data and return a JSON array of job recommendations.

User Profile:
- Skills: ${userSkills}
- Job Title: ${userJobTitle}
- Location: ${userLocation}
- Experience: ${experienceYears} years
- Previously applied categories: ${Array.from(appliedCategories).join(', ')}

Available Jobs (first 20):
${availableJobs.slice(0, 20).map((job, i) => `
${i + 1}. ID: ${job.id}
   Title: ${job.title}
   Category: ${job.category}
   Location: ${job.city}, ${job.country}
   Skills: ${job.required_skills || 'Not specified'}
   Experience: ${job.experience_level || 'Not specified'}
`).join('\n')}

Return a JSON array of the top 10 most relevant job IDs with match scores (0-100) and reasons.
Format: [{"job_id": "...", "score": 85, "reason": "Strong skill match in JavaScript and React"}]
Only include jobs with score > 50.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                job_id: { type: "string" },
                score: { type: "number" },
                reason: { type: "string" }
              }
            }
          }
        }
      }
    });

    const recommendations = aiResponse.recommendations || [];

    // Get full job details for recommendations
    const recommendedJobs = recommendations.map(rec => {
      const job = availableJobs.find(j => j.id === rec.job_id);
      return job ? {
        ...job,
        match_score: rec.score,
        match_reason: rec.reason
      } : null;
    }).filter(Boolean);

    return Response.json({
      success: true,
      recommendations: recommendedJobs
    });

  } catch (error) {
    console.error('Error generating job recommendations:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});