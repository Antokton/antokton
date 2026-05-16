import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { job } = await req.json();

    // Get all saved searches with notifications enabled
    const savedSearches = await base44.asServiceRole.entities.SavedSearch.filter({
      notification_enabled: true
    });

    // Check each saved search for matches
    for (const search of savedSearches) {
      const filters = search.filters;
      let matches = true;

      // Check category
      if (filters.category && job.category !== filters.category) {
        matches = false;
      }

      // Check profession
      if (filters.profession && job.profession !== filters.profession) {
        matches = false;
      }

      // Check region/location
      if (filters.region) {
        const regionMatch = job.country?.toLowerCase().includes(filters.region.toLowerCase()) || 
                          job.city?.toLowerCase().includes(filters.region.toLowerCase());
        if (!regionMatch) matches = false;
      }

      if (filters.city && job.city !== filters.city) {
        matches = false;
      }

      // Check contract type
      if (filters.contract_type && job.contract_type !== filters.contract_type) {
        matches = false;
      }

      // Check experience level
      if (filters.experience_level && job.experience_level !== filters.experience_level) {
        matches = false;
      }

      // Check keywords
      if (filters.keywords) {
        const searchable = `${job.title} ${job.description} ${job.profession || ""} ${job.required_skills || ""}`.toLowerCase();
        if (!searchable.includes(filters.keywords.toLowerCase())) {
          matches = false;
        }
      }

      // If matches, create notification
      if (matches) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: search.user_email,
          type: 'system',
          title: `Njoftim i ri: ${search.search_name}`,
          message: `Një njoftim i ri përputhet me kërkimin tënd të ruajtur: "${job.title}"`,
          link: `/post-detail?id=${job.id}`,
          related_id: job.id
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Notify job matches error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});