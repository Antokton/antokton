import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { job, userEmail } = await req.json();

    if (!job || !userEmail) {
      return Response.json({ success: false, reason: 'missing params' });
    }

    // Kontrollo preferencat e njoftimeve të përdoruesit
    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ user_email: userEmail });
    const pref = prefs[0];

    // Dërgo email vetëm nëse ka aktivizuar email_digest ose application_status
    const shouldSendEmail = pref && (pref.email_digest === true || pref.application_status === true) && pref.email_frequency !== 'never';

    if (!shouldSendEmail) {
      console.log(`User ${userEmail} has not enabled email notifications. Skipping.`);
      return Response.json({ success: true, sent: false });
    }

    // Gjej emailin e përdoruesit
    const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    const user = users[0];
    const name = user?.first_name || user?.full_name || userEmail.split('@')[0];

    const postUrl = `https://antokton.com/PostDetail?id=${job.id}`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: userEmail,
      subject: `✅ Njoftimi juaj u miratua në Antokton!`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b1020; color: #e2e8f0; padding: 32px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #9bffd6; font-size: 24px; margin: 0;">✅ Njoftimi u Miratua!</h1>
          </div>
          
          <p style="color: #e2e8f0; font-size: 15px;">Përshëndetje ${name},</p>
          
          <p style="color: #e2e8f0; font-size: 15px; line-height: 1.6;">
            Njoftimi juaj <strong style="color: #8ab4ff;">"${job.title}"</strong> u shqyrtua nga moderatorët tanë dhe u <strong style="color: #9bffd6;">miratua me sukses</strong>! Tani është i dukshëm për të gjithë anëtarët e platformës Antokton.
          </p>

          <div style="background: rgba(155,255,214,0.08); border: 1px solid rgba(155,255,214,0.25); border-radius: 10px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #9bffd6; font-weight: bold; font-size: 14px;">📋 ${job.title}</p>
            <p style="margin: 4px 0 0; color: rgba(255,255,255,0.5); font-size: 12px;">Kategoria: ${job.category} ${job.country ? '• ' + job.country : ''}</p>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${postUrl}" style="background: linear-gradient(135deg, #8ab4ff, #9bffd6); color: #0b1020; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-weight: bold; font-size: 14px;">
              Shiko Njoftimin
            </a>
          </div>

          <p style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; margin-top: 24px;">
            Nëse nuk dëshironi të merrni email, shkoni te <strong>Cilësimet e Lajmërimeve</strong> dhe çaktivizoni opsionin.
          </p>
          <p style="color: rgba(255,255,255,0.3); font-size: 11px; text-align: center;">© 2026 Antokton • Platformë komunitare</p>
        </div>
      `
    });

    console.log(`Approval email sent to ${userEmail} for job "${job.title}"`);
    return Response.json({ success: true, sent: true });

  } catch (error) {
    console.error('Error in notifyApprovalEmail:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});