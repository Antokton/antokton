import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query } = await req.json();

    if (!query) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    // Get all approved jobs
    const allJobs = await base44.asServiceRole.entities.Job.filter({
      status: 'approved'
    }, '-created_date', 300);

    // Use AI to parse natural language query and match jobs
    const prompt = `You are a job search AI. Parse this natural language job search query and find matching jobs.

User Query: "${query}"

Available Jobs (showing first 30):
${allJobs.slice(0, 30).map((job, i) => `
${i + 1}. ID: ${job.id}
   Title: ${job.title}
   Category: ${job.category}
   Location: ${job.city}, ${job.country}
   Skills Required: ${job.required_skills || 'Not specified'}
   Contract: ${job.contract_type || 'Not specified'}
   Experience: ${job.experience_level || 'Not specified'}
   Description: ${job.description?.substring(0, 150)}...
`).join('\n')}

Parse the query to extract:
1. Keywords (job title, skills, etc.)
2. Location preferences
3. Remote/contract preferences
4. Experience level

Then return a JSON array of matching job IDs with relevance scores (0-100) and match explanations.
Format: [{"job_id": "...", "score": 90, "match_reason": "Marketing job in Tiranë with remote option"}]
Return top 15 matches with score > 40.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          parsed_query: {
            type: "object",
            properties: {
              keywords: { type: "array", items: { type: "string" } },
              location: { type: "string" },
              remote: { type: "boolean" },
              experience_level: { type: "string" }
            }
          },
          matches: {
            type: "array",
            items: {
              type: "object",
              properties: {
                job_id: { type: "string" },
                score: { type: "number" },
                match_reason: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Get full job details
    const matchedJobs = (aiResponse.matches || []).map(match => {
      const job = allJobs.find(j => j.id === match.job_id);
      return job ? {
        ...job,
        relevance_score: match.score,
        match_reason: match.match_reason
      } : null;
    }).filter(Boolean);

    return Response.json({
      success: true,
      parsed_query: aiResponse.parsed_query || {},
      results: matchedJobs,
      total_results: matchedJobs.length
    });

  } catch (error) {
    console.error('Error in natural language search:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});