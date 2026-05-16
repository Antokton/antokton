import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch recruiter's posted jobs
    const myJobs = await base44.entities.Job.filter({ created_by: user.email }, '-created_date', 50);
    
    // Fetch all applications for my jobs
    const allApplications = await base44.asServiceRole.entities.JobApplication.list('-created_date', 500);
    const myJobApplications = allApplications.filter(app => 
      myJobs.some(job => job.id === app.job_id)
    );

    // Get all job seekers
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 200);
    const jobSeekers = allUsers.filter(u => u.user_type === 'job_seeker');

    // Build recruiter profile
    const recruiterProfile = {
      industry: user.industry || '',
      company_size: user.company_size || '',
      posted_jobs: myJobs.map(j => ({
        title: j.title,
        category: j.category,
        profession: j.profession,
        required_skills: j.required_skills,
        experience_level: j.experience_level
      })),
      hired_profiles: myJobApplications.filter(app => app.status === 'hired').map(app => {
        const applicant = jobSeekers.find(u => u.email === app.applicant_email);
        return applicant ? {
          profession: applicant.profession,
          skills: applicant.skills,
          experience_level: applicant.experience_level
        } : null;
      }).filter(p => p !== null)
    };

    // Similar jobs recommendation
    const allJobs = await base44.asServiceRole.entities.Job.filter({ status: 'approved' }, '-created_date', 100);
    const otherJobs = allJobs.filter(j => j.created_by !== user.email);

    const jobPrompt = `
Bazuar në punët që ka postuar ky recruiter:
${recruiterProfile.posted_jobs.slice(0, 10).map(j => 
  `- ${j.title} (${j.category}, ${j.profession}, Niveli: ${j.experience_level})`
).join('\n')}

Këto janë punë të tjera në platformë:
${otherJobs.slice(0, 50).map(j => 
  `ID: ${j.id}, Titulli: ${j.title}, Kategoria: ${j.category}, Profesioni: ${j.profession}`
).join('\n')}

Rekomando 5 punë të ngjashme që mund t'i interesojnë këtij recruiter për të parë konkurrencën ose për ide.
Format: [{"job_id": "id", "reason": "arsyeja"}]
`;

    const jobAiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: jobPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                job_id: { type: "string" },
                reason: { type: "string" }
              }
            }
          }
        }
      }
    });

    const jobRecommendations = jobAiResponse.recommendations || [];
    const recommendedJobs = jobRecommendations.map(rec => {
      const job = otherJobs.find(j => j.id === rec.job_id);
      return job ? { ...job, recommendation_reason: rec.reason } : null;
    }).filter(j => j !== null);

    // Candidate recommendations
    const applicantEmails = [...new Set(myJobApplications.map(app => app.applicant_email))];
    const notAppliedJobSeekers = jobSeekers.filter(js => !applicantEmails.includes(js.email));

    const candidatePrompt = `
Bazuar në punët që ka postuar ky recruiter dhe profilet e punëmarrësve që ka marrë:
Punë të postuara: ${recruiterProfile.posted_jobs.slice(0, 5).map(j => j.title).join(', ')}
Profile të marra: ${recruiterProfile.hired_profiles.slice(0, 5).map(p => `${p.profession} (${p.skills})`).join(', ')}

Këto janë kandidatë të disponueshëm:
${notAppliedJobSeekers.slice(0, 50).map(js => 
  `Email: ${js.email}, Profesioni: ${js.profession || 'N/A'}, Aftësi: ${js.skills || 'N/A'}, Nivel: ${js.experience_level || 'N/A'}`
).join('\n')}

Rekomando 8 kandidatë më të mirë për këtë recruiter.
Format: [{"user_email": "email", "reason": "arsyeja"}]
`;

    const candidateAiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: candidatePrompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                user_email: { type: "string" },
                reason: { type: "string" }
              }
            }
          }
        }
      }
    });

    const candidateRecommendations = candidateAiResponse.recommendations || [];
    const recommendedCandidates = candidateRecommendations.map(rec => {
      const candidate = notAppliedJobSeekers.find(js => js.email === rec.user_email);
      return candidate ? { 
        email: candidate.email,
        full_name: candidate.first_name && candidate.surname ? `${candidate.first_name} ${candidate.surname}` : candidate.full_name,
        profession: candidate.profession,
        skills: candidate.skills,
        experience_level: candidate.experience_level,
        recommendation_reason: rec.reason 
      } : null;
    }).filter(c => c !== null);

    return Response.json({ 
      job_recommendations: recommendedJobs,
      candidate_recommendations: recommendedCandidates,
      stats: {
        total_posted_jobs: myJobs.length,
        total_applications: myJobApplications.length,
        hired_count: myJobApplications.filter(app => app.status === 'hired').length
      }
    });
  } catch (error) {
    console.error('Error generating recruiter recommendations:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});