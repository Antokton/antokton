import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content_id, content_type, content_text } = await req.json();

    // Use AI to analyze content
    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a content moderation AI. Analyze this ${content_type === 'job_posting' ? 'job posting' : 'company review'} text for violations of community guidelines.

Check for:
1. Hate speech or discrimination
2. Harassment or bullying
3. Adult/explicit content
4. Illegal activities
5. Spam or misleading information
6. Violation of professional standards

Return JSON with:
- violations: array of violation types found
- severity: "none", "low", "medium", "high"
- confidence: 0-100 confidence score
- reasoning: brief explanation

Content to review:
"${content_text}"`,
      response_json_schema: {
        type: "object",
        properties: {
          violations: { type: "array", items: { type: "string" } },
          severity: { type: "string" },
          confidence: { type: "number" },
          reasoning: { type: "string" }
        }
      }
    });

    // Determine AI action based on severity
    let ai_flag_status = 'approved';
    if (aiResponse.severity === 'high' || aiResponse.severity === 'medium') {
      ai_flag_status = 'flagged';
    }
    if (aiResponse.severity === 'high' && aiResponse.confidence > 85) {
      ai_flag_status = 'rejected';
    }

    // Create moderation record
    const moderation = await base44.entities.ContentModeration.create({
      content_id,
      content_type,
      content_text,
      ai_flag_status,
      ai_violation_reasons: aiResponse.violations,
      ai_confidence: aiResponse.confidence,
      admin_decision: ai_flag_status === 'rejected' ? 'rejected' : 'pending'
    });

    // Update content status based on AI decision
    if (content_type === 'job_posting' && ai_flag_status !== 'approved') {
      await base44.asServiceRole.entities.Job.update(content_id, {
        status: ai_flag_status === 'rejected' ? 'rejected' : 'pending'
      });
    }

    return Response.json({ success: true, moderation });
  } catch (error) {
    console.error('Moderation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});