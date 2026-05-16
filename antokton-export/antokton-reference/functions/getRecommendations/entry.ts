import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Merr aktivitetet e fundit të përdoruesit
    const activities = await base44.entities.UserActivity.filter(
      { user_email: user.email },
      '-created_date',
      50
    );

    // Analizo aktivitetet
    const jobViewIds = activities
      .filter(a => a.activity_type === 'job_view' && a.related_job_id)
      .map(a => a.related_job_id);

    const jobApplyIds = activities
      .filter(a => a.activity_type === 'job_apply' && a.related_job_id)
      .map(a => a.related_job_id);

    const profileViewEmails = activities
      .filter(a => a.activity_type === 'profile_view' && a.related_user_email)
      .map(a => a.related_user_email);

    const searchFilters = activities
      .filter(a => a.activity_type === 'search' && a.search_filters)
      .map(a => a.search_filters);

    // Nxirr kategorite, vendet, dhe profesionet më të shikuara
    const categories = {};
    const countries = {};
    const professions = {};

    for (const filter of searchFilters) {
      if (filter.category) categories[filter.category] = (categories[filter.category] || 0) + 1;
      if (filter.country) countries[filter.country] = (countries[filter.country] || 0) + 1;
      if (filter.profession) professions[filter.profession] = (professions[filter.profession] || 0) + 1;
    }

    const topCategory = Object.keys(categories).sort((a, b) => categories[b] - categories[a])[0];
    const topCountry = Object.keys(countries).sort((a, b) => countries[b] - countries[a])[0];
    const topProfession = Object.keys(professions).sort((a, b) => professions[b] - professions[a])[0];

    // Merr njoftime të ngjashme
    const recommendedJobs = await base44.entities.Job.filter(
      { 
        status: 'approved',
        ...(topCategory && { category: topCategory }),
        ...(topCountry && { country: topCountry })
      },
      '-created_date',
      10
    );

    // Merr profile të ngjashme (nëse ka parë profile)
    let recommendedProfiles = [];
    if (profileViewEmails.length > 0) {
      const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 100);
      recommendedProfiles = allUsers
        .filter(u => u.user_type === 'job_seeker' && !profileViewEmails.includes(u.email))
        .slice(0, 5);
    }

    // Merr ngjarje të ngjashme
    const recommendedEvents = await base44.entities.Event.filter(
      {
        ...(topCategory && topCategory !== 'all' ? { category: topCategory } : {})
      },
      'event_date',
      5
    );

    return Response.json({
      recommendedJobs,
      recommendedProfiles,
      recommendedEvents,
      insights: {
        topCategory,
        topCountry,
        topProfession,
        totalActivities: activities.length
      }
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});