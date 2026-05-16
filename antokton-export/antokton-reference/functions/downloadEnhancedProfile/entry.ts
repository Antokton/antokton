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
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(`${user.first_name || ''} ${user.surname || user.full_name || ''}`, 20, y);
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(user.email, 20, y);
    y += 6;
    if (user.phone) {
      doc.text(user.phone, 20, y);
      y += 6;
    }
    if (user.location) {
      doc.text(user.location, 20, y);
      y += 6;
    }
    y += 5;

    // Professional Summary
    if (user.job_title || user.bio) {
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Professional Summary', 20, y);
      y += 8;

      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      if (user.job_title) {
        doc.text(`Position: ${user.job_title}`, 20, y);
        y += 6;
      }
      if (user.experience_years) {
        doc.text(`Experience: ${user.experience_years} years`, 20, y);
        y += 6;
      }
      if (user.bio) {
        const bioLines = doc.splitTextToSize(user.bio, 170);
        doc.text(bioLines, 20, y);
        y += bioLines.length * 5 + 5;
      }
      y += 5;
    }

    // Skills
    if (user.skills) {
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Skills', 20, y);
      y += 8;

      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      const skillsLines = doc.splitTextToSize(user.skills, 170);
      doc.text(skillsLines, 20, y);
      y += skillsLines.length * 5 + 10;
    }

    // Work Experience
    if (user.work_experience && user.work_experience.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Work Experience', 20, y);
      y += 10;

      user.work_experience.forEach((exp) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(13);
        doc.setTextColor(40, 40, 40);
        doc.text(`${exp.role || 'Position'}`, 20, y);
        y += 6;

        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        doc.text(`${exp.company || 'Company'}`, 20, y);
        y += 5;

        const dateText = exp.current 
          ? `${exp.start_date || ''} - Present` 
          : `${exp.start_date || ''} - ${exp.end_date || ''}`;
        doc.setTextColor(100, 100, 100);
        doc.text(dateText, 20, y);
        y += 6;

        if (exp.responsibilities) {
          doc.setTextColor(60, 60, 60);
          const respLines = doc.splitTextToSize(exp.responsibilities, 170);
          doc.text(respLines, 20, y);
          y += respLines.length * 5;
        }
        y += 8;
      });
    }

    // Education
    if (user.education && user.education.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Education', 20, y);
      y += 10;

      user.education.forEach((edu) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(13);
        doc.setTextColor(40, 40, 40);
        doc.text(`${edu.degree || 'Degree'} in ${edu.field || ''}`, 20, y);
        y += 6;

        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        doc.text(edu.institution || 'Institution', 20, y);
        y += 5;

        const dateText = edu.current
          ? `${edu.start_date || ''} - Present`
          : `${edu.start_date || ''} - ${edu.end_date || ''}`;
        doc.setTextColor(100, 100, 100);
        doc.text(dateText, 20, y);
        y += 10;
      });
    }

    // Languages
    if (user.languages && user.languages.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Languages', 20, y);
      y += 8;

      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      user.languages.forEach((lang) => {
        doc.text(`${lang.language}: ${lang.level}`, 20, y);
        y += 6;
      });
      y += 5;
    }

    // Certifications
    if (user.certifications && user.certifications.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Certifications', 20, y);
      y += 8;

      doc.setFontSize(11);
      user.certifications.forEach((cert) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.setTextColor(60, 60, 60);
        doc.text(`${cert.name} - ${cert.issuer} (${cert.date})`, 20, y);
        y += 6;
      });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Profile_${user.full_name || user.email}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error generating profile PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});