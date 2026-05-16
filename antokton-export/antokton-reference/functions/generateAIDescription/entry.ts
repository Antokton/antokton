import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = await req.json(); // 'bio' or 'cv_summary'

    let prompt = '';
    if (type === 'bio') {
      prompt = `Krijo një bio profesionale në gjuhën shqipe për një person me këto të dhëna:
- Titulli: ${user.job_title || 'Professional'}
- Vite përvoje: ${user.experience_years || 0}
- Aftësi: ${user.skills || 'N/A'}
- Vendndodhja: ${user.location || 'N/A'}

Bio duhet të jetë koncize, profesionale dhe tërheqëse (max 150 fjalë).`;
    } else {
      prompt = `Krijo një përmbledhje CV në gjuhën shqipe për një person me këto të dhëna:
- Titulli: ${user.job_title || 'Professional'}
- Vite përvoje: ${user.experience_years || 0}
- Aftësi: ${user.skills || 'N/A'}
- Certifikime: ${user.certifications?.map(c => c.name).join(', ') || 'N/A'}
- Gjuhë: ${user.languages?.map(l => `${l.language} (${l.level})`).join(', ') || 'N/A'}

Përmbledhja duhet të jetë profesionale dhe tërheqëse (max 200 fjalë).`;
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    return Response.json({ description: result });
  } catch (error) {
    console.error('Generate AI description error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});