import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text(user.full_name || user.email, 20, 20);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(user.job_title || 'Professional', 20, 28);
    
    // Contact Info
    let y = 40;
    doc.setFontSize(10);
    if (user.email) doc.text(`Email: ${user.email}`, 20, y);
    y += 6;
    if (user.phone) doc.text(`Phone: ${user.phone}`, 20, y);
    y += 6;
    if (user.location) doc.text(`Location: ${user.location}`, 20, y);
    y += 10;
    
    // Bio
    if (user.bio) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Professional Summary', 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const bioLines = doc.splitTextToSize(user.bio, 170);
      doc.text(bioLines, 20, y);
      y += bioLines.length * 5 + 10;
    }
    
    // Experience
    if (user.experience_years) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Experience', 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`${user.experience_years} years of professional experience`, 20, y);
      y += 10;
    }
    
    // Skills
    if (user.skills) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Skills', 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const skillsText = user.skills.split(',').join(' • ');
      const skillsLines = doc.splitTextToSize(skillsText, 170);
      doc.text(skillsLines, 20, y);
      y += skillsLines.length * 5 + 10;
    }
    
    // Languages
    if (user.languages && user.languages.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Languages', 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      user.languages.forEach(lang => {
        doc.text(`${lang.language} - ${lang.level}`, 20, y);
        y += 6;
      });
      y += 4;
    }
    
    // Certifications
    if (user.certifications && user.certifications.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Certifications', 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      user.certifications.forEach(cert => {
        doc.text(`${cert.name} - ${cert.issuer}`, 20, y);
        if (cert.date) doc.text(`Issued: ${cert.date}`, 25, y + 5);
        y += 12;
      });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=CV_${user.full_name || user.email}.pdf`
      }
    });
  } catch (error) {
    console.error('Generate CV error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});