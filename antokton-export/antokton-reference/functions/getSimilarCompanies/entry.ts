import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's application history
    const applications = await base44.asServiceRole.entities.JobApplication.filter({
      applicant_email: user.email
    }, '-created_date', 100);

    const appliedJobIds = applications.map(app => app.job_id);
    
    // Get applied jobs
    const allJobs = await base44.asServiceRole.entities.Job.filter({
      status: 'approved'
    }, '-created_date', 300);

    const appliedJobs = allJobs.filter(job => appliedJobIds.includes(job.id));
    const appliedCompanyEmails = [...new Set(appliedJobs.map(j => j.created_by))];

    if (appliedCompanyEmails.length === 0) {
      return Response.json({
        success: true,
        similar_companies: [],
        message: 'No application history found'
      });
    }

    // Get company profiles
    const companyProfiles = await base44.asServiceRole.entities.CompanyProfile.filter({}, '-created_date', 100);
    
    const appliedCompanies = companyProfiles.filter(c => 
      appliedCompanyEmails.includes(c.owner_email)
    );

    // Get all users to find companies
    const allUsers = await base44.asServiceRole.entities.User.filter({}, '-created_date', 500);
    const companyUsers = allUsers.filter(u => u.user_type === 'employer' || u.user_type === 'recruiter');

    // Use AI to find similar companies
    const prompt = `You are a company matching AI. Based on the companies this user has applied to, suggest similar companies they might be interested in.

Companies User Applied To:
${appliedCompanies.map((c, i) => `
${i + 1}. ${c.company_name}
   Industry: ${c.industry || 'Not specified'}
   Services: ${c.service_categories?.join(', ') || 'Not specified'}
   Size: ${c.company_size || 'Not specified'}
   Description: ${c.description?.substring(0, 100)}...
`).join('\n')}

Available Companies to Recommend:
${companyProfiles.filter(c => !appliedCompanyEmails.includes(c.owner_email)).slice(0, 20).map((c, i) => `
${i + 1}. Email: ${c.owner_email}
   Name: ${c.company_name}
   Industry: ${c.industry || 'Not specified'}
   Services: ${c.service_categories?.join(', ') || 'Not specified'}
   Size: ${c.company_size || 'Not specified'}
`).join('\n')}

Return a JSON array of the top 8 most similar companies with similarity scores (0-100) and reasons.
Format: [{"company_email": "...", "score": 85, "reason": "Similar industry and company size"}]
Only include companies with score > 60.`;

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
                company_email: { type: "string" },
                score: { type: "number" },
                reason: { type: "string" }
              }
            }
          }
        }
      }
    });

    const recommendations = aiResponse.recommendations || [];

    // Get full company details
    const similarCompanies = recommendations.map(rec => {
      const company = companyProfiles.find(c => c.owner_email === rec.company_email);
      return company ? {
        ...company,
        similarity_score: rec.score,
        similarity_reason: rec.reason
      } : null;
    }).filter(Boolean);

    return Response.json({
      success: true,
      similar_companies: similarCompanies
    });

  } catch (error) {
    console.error('Error finding similar companies:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});