import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { jobId } = await req.json();

    // Merr njoftimin
    const jobs = await base44.asServiceRole.entities.Job.filter({ id: jobId });
    if (jobs.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobs[0];
    
    // Përcakto grupin Facebook sipas vendit
    // Linqet e grupeve:
    // Belgjikë: https://t.ly/8tNJi
    // Gjermani: https://t.ly/G0iO_
    // Itali: https://t.ly/zK-FM
    // Francë: https://t.ly/a-0xf
    // Britani: https://t.ly/a5AVR
    // Mal të Zi: https://t.ly/3RGRO
    
    const facebookGroups = {
      "Belgjikë": "BELGIUM_GROUP_ID",     // ID e grupit nga https://t.ly/8tNJi
      "Gjermani": "GERMANY_GROUP_ID",     // ID e grupit nga https://t.ly/G0iO_
      "Itali": "ITALY_GROUP_ID",          // ID e grupit nga https://t.ly/zK-FM
      "Francë": "FRANCE_GROUP_ID",        // ID e grupit nga https://t.ly/a-0xf
      "Britani": "UK_GROUP_ID",           // ID e grupit nga https://t.ly/a5AVR
      "Zvicër": "SWITZERLAND_GROUP_ID",
      "Austri": "AUSTRIA_GROUP_ID",
      "Mal të Zi": "MONTENEGRO_GROUP_ID", // ID e grupit nga https://t.ly/3RGRO
      "Shqipëri": "ANTOKTON_GROUP_ID",
      "Kosovë": "ANTOKTON_GROUP_ID"
    };

    const groupId = facebookGroups[job.country];
    
    if (!groupId) {
      return Response.json({ 
        success: false, 
        message: `Nuk ka grup Facebook për vendin: ${job.country}` 
      });
    }

    // Formato postimin
    const postMessage = `
🔔 ${job.title}

📍 ${job.city ? `${job.city}, ` : ''}${job.country}
${job.profession ? `💼 ${job.profession}` : ''}
${job.salary_info ? `💰 ${job.salary_info}` : ''}

${job.description.substring(0, 300)}${job.description.length > 300 ? '...' : ''}

${job.contact_info ? `📞 Kontakt: ${job.contact_info}` : ''}

👉 Më shumë: https://antokton.com/PostDetail?id=${job.id}
    `.trim();

    // Publiko në Facebook
    const accessToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
    
    if (!accessToken) {
      return Response.json({ 
        error: 'Facebook token not configured',
        message: 'Administratori duhet të konfiguroj FACEBOOK_PAGE_ACCESS_TOKEN në settings'
      }, { status: 500 });
    }

    const fbResponse = await fetch(
      `https://graph.facebook.com/v18.0/${groupId}/feed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: postMessage,
          access_token: accessToken
        })
      }
    );

    const fbResult = await fbResponse.json();

    if (!fbResponse.ok) {
      console.error('Facebook API error:', fbResult);
      return Response.json({ 
        success: false,
        error: 'Facebook publish failed',
        details: fbResult
      }, { status: 500 });
    }

    // Ruaj FB post ID në job
    await base44.asServiceRole.entities.Job.update(jobId, {
      facebook_post_id: fbResult.id
    });

    return Response.json({ 
      success: true, 
      post_id: fbResult.id,
      message: `Publikuar me sukses në grupin për ${job.country}`
    });

  } catch (error) {
    console.error('Publish to Facebook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});