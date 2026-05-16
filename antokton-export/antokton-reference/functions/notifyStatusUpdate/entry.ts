import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data } = await req.json();

    if (!data || !old_data) {
      return Response.json({ success: true });
    }

    // Kontrollo nëse statusi është ndryshuar
    if (data.status === old_data.status) {
      return Response.json({ success: true });
    }

    // Gjej punën
    const jobs = await base44.asServiceRole.entities.Job.filter({ id: data.job_id });
    if (jobs.length === 0) {
      return Response.json({ success: true });
    }

    const job = jobs[0];

    const statusLabels = {
      applied: "Aplikuar",
      shortlisted: "Në listë të shkurtër",
      interviewing: "Në intervistë",
      rejected: "Refuzuar",
      hired: "I punësuar"
    };

    // Krijo notifikim për aplikuesin
    await base44.asServiceRole.entities.Notification.create({
      user_email: data.applicant_email,
      type: "status_update",
      title: "Përditësim statusi aplikimi",
      message: `Aplikimi juaj për "${job.title}" u ndryshua në: ${statusLabels[data.status]}`,
      link: `/PostDetail?id=${job.id}`,
      related_id: data.id
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error creating notification:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});