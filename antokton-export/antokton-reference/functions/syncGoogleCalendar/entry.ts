import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, eventData } = await req.json();

    if (action === 'sync_event') {
      // Get Google Calendar access token
      const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
      
      // Create event in Google Calendar
      const googleEvent = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.event_date,
          timeZone: 'UTC'
        },
        end: {
          dateTime: new Date(new Date(eventData.event_date).getTime() + 2 * 60 * 60000).toISOString(),
          timeZone: 'UTC'
        },
        location: eventData.location || '',
        conferenceData: eventData.meeting_link ? {
          createRequest: {
            requestId: 'sync-' + Date.now(),
            conferenceSolution: {
              key: { type: 'hangoutsMeet' }
            }
          }
        } : undefined
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(googleEvent)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google Calendar API error: ${error.error?.message}`);
      }

      const createdEvent = await response.json();
      return Response.json({ success: true, googleEventId: createdEvent.id });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});