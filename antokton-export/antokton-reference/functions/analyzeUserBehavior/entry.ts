import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { user_email } = await req.json();

    // Fetch user data
    const userList = await base44.asServiceRole.entities.User.filter({ email: user_email });
    const targetUser = userList[0];

    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch user activity
    const activities = await base44.asServiceRole.entities.UserActivity?.filter?.({ 
      user_email: user_email 
    }, "-created_date", 100) || [];

    // Fetch user's jobs, applications, ratings
    const userJobs = await base44.asServiceRole.entities.Job.filter({ created_by: user_email }, "-created_date", 50);
    const userApplications = await base44.asServiceRole.entities.JobApplication.filter({ applicant_email: user_email }, "-created_date", 50);
    const userRatings = await base44.asServiceRole.entities.Rating.filter({ rated_user_email: user_email }) || [];

    // Analyze behavior with AI
    const prompt = `Analyze this user profile and activity data for potential improvements and red flags:

User Email: ${user_email}
Member Category: ${targetUser.member_category}
Role: ${targetUser.role}
Created: ${targetUser.created_date}
Last Seen: ${targetUser.last_seen}
Account Age: ${Math.floor((new Date() - new Date(targetUser.created_date)) / (1000 * 60 * 60 * 24))} days

Activity Summary:
- Total activities: ${activities.length}
- Jobs posted: ${userJobs.length}
- Applications: ${userApplications.length}
- Ratings received: ${userRatings.length}
- Average rating: ${userRatings.length > 0 ? (userRatings.reduce((s, r) => s + r.score, 0) / userRatings.length).toFixed(1) : 'N/A'}

Recent Activities (last 10):
${activities.slice(0, 10).map(a => `- ${a.action}: ${a.details}`).join('\n')}

Provide JSON response with:
1. suggestions: array of specific role/preference improvements
2. risk_flags: array of concerning behaviors (empty if none)
3. recommendation_priority: "urgent", "high", "medium", "low"
4. summary: brief analysis`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: { type: "array", items: { type: "string" } },
          risk_flags: { type: "array", items: { type: "string" } },
          recommendation_priority: { type: "string" },
          summary: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      user_email,
      analysis,
      activity_count: activities.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});