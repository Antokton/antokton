import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { icsContent } = await req.json();

    // Parse ICS file
    const events = parseICS(icsContent);
    const createdEvents = [];

    for (const eventData of events) {
      const created = await base44.entities.Event.create({
        title: eventData.summary,
        description: eventData.description || '',
        event_date: eventData.dtstart,
        location: eventData.location || '',
        category: 'networking',
        organizer_email: user.email,
        event_type: 'in_person',
        status: 'pending'
      });
      createdEvents.push(created);
    }

    return Response.json({ 
      success: true, 
      importedCount: createdEvents.length,
      events: createdEvents 
    });
  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function parseICS(content) {
  const events = [];
  const lines = content.split('\n');
  let currentEvent = {};
  let inEvent = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
    } else if (trimmed === 'END:VEVENT') {
      inEvent = false;
      if (currentEvent.summary && currentEvent.dtstart) {
        events.push(currentEvent);
      }
    } else if (inEvent && trimmed.includes(':')) {
      const [key, value] = trimmed.split(':', 2);
      
      if (key === 'SUMMARY') {
        currentEvent.summary = value;
      } else if (key === 'DESCRIPTION') {
        currentEvent.description = value.replace(/\\n/g, '\n');
      } else if (key === 'LOCATION') {
        currentEvent.location = value;
      } else if (key === 'DTSTART') {
        currentEvent.dtstart = formatICSDate(value);
      } else if (key === 'DTEND') {
        currentEvent.dtend = formatICSDate(value);
      }
    }
  }

  return events;
}

function formatICSDate(dateStr) {
  // Handle both YYYYMMDDTHHMMSSZ and other formats
  if (dateStr.includes('T')) {
    const [datePart, timePart] = dateStr.split('T');
    const year = datePart.substring(0, 4);
    const month = datePart.substring(4, 6);
    const day = datePart.substring(6, 8);
    const time = timePart.replace('Z', '');
    return `${year}-${month}-${day}T${time}`;
  }
  return dateStr;
}