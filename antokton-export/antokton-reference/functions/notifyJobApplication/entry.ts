import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data } = await req.json();

    if (!data) {
      return Response.json({ error: "No data provided" }, { status: 400 });
    }

    // Gjej punën për të marrë organizatorin
    const jobs = await base44.asServiceRole.entities.Job.filter({ id: data.job_id });
    if (jobs.length === 0) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobs[0];

    // Krijo notifikim për punëdhënësin
    await base44.asServiceRole.entities.Notification.create({
      user_email: job.created_by,
      type: "application",
      title: "Aplikim i ri",
      message: `${data.applicant_name} aplikoi për pozicionin "${job.title}"`,
      link: `/PostDetail?id=${job.id}`,
      related_id: data.id
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error creating notification:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});