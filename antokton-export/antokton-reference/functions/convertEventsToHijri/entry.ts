import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function gregorianToHijri(gregorianDate) {
  const date = new Date(gregorianDate);
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();

  let jd = Math.floor((11 * year + 3) / 30) + 365 * year + Math.floor(day) + 
    Math.floor((306 * (month + 1)) / 10) - Math.floor((2 * Math.floor((month + 1) / 11)) / 1) - 32045;

  let l = jd + 68569;
  let n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  let i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  let j = Math.floor((80 * l) / 2447);
  const hijriDay = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const hijriMonth = j + 2 - 12 * l;
  const hijriYear = 100 * (n - 49) + i + l;

  const hijriMonths = [
    "Muharram", "Safar", "Rabi' al-awwal", "Rabi' al-thani", 
    "Jumada al-awwal", "Jumada al-thani", "Rajab", "Sha'ban", 
    "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
  ];

  return {
    day: Math.floor(hijriDay),
    month: Math.floor(hijriMonth),
    month_name: hijriMonths[Math.floor(hijriMonth) - 1],
    year: Math.floor(hijriYear)
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all events
    const allEvents = await base44.asServiceRole.entities.Event.list();
    
    let updated = 0;
    let errors = [];

    for (const event of allEvents) {
      try {
        const hijriDate = gregorianToHijri(event.event_date);
        await base44.asServiceRole.entities.Event.update(event.id, { hijri_date: hijriDate });
        updated++;
      } catch (error) {
        errors.push(`Event ${event.id}: ${error.message}`);
      }
    }

    return Response.json({
      success: true,
      message: `Updated ${updated} events with Hijri dates`,
      errors: errors.length > 0 ? errors : null,
      total: allEvents.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});