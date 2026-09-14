/**
 * Service to orchestrate scheduling Google Meet classes with native YouTube streaming.
 * Under authorization, this helper coordinates:
 * 1. Google Calendar / Meet REST API to schedule a slot and generate Google Meet conference links.
 * 2. YouTube Data API v3 to create an unlisted Live Broadcast.
 * 3. YouTube Data API v3 to create a Live Stream (RTMP ingestion address and stream key).
 * 4. Binding the YouTube Live Broadcast with the Live Stream for native broadcasting.
 */

import { getCachedToken, signInWithGoogle, disconnectGoogle, clearCachedToken } from './googleAuth';

export interface LiveClassSessionResult {
  meetLink: string;             // Student-facing Google Meet joining link
  youtubeVideoId: string;       // Permanent YouTube Video ID for iframe embedding
  youtubeWatchUrl: string;      // Student-facing unlisted watch URL
  youtubeEmbedUrl: string;      // The iframe embed URL
  rtmpUrl: string;              // Instructor's RTMP server ingestion address
  streamKey: string;            // Instructor's live RTMP stream key
  calendarEventId: string;      // Scheduled Calendar Event ID
  warning?: string;             // Optional explanation of YouTube setup issues
}

/**
 * Creates a scheduled Google Meet space associated with an unlisted YouTube Live Stream.
 * 
 * @param startTime ISO date string for when the class begins.
 * @param endTime ISO date string for when the class finishes.
 * @param topic The subject / name of the class.
 * @returns The gathered credentials and links for both students and instructors.
 */
export async function createLiveClassSession(
  startTime: string,
  endTime: string,
  topic: string,
  streamingMode: 'gmeet' | 'manual' = 'gmeet',
  isRetry = false
): Promise<LiveClassSessionResult> {
  // 1. Retrieve the OAuth 2.0 access token
  let token = getCachedToken();
  if (!token) {
    console.log('[LiveClassService] Token is missing, attempting to log in...');
    const authResult = await signInWithGoogle();
    token = authResult.accessToken;
  }

  if (!token) {
    throw new Error('Google authorization is required to schedule live streams and classes.');
  }

  // 2. Create the Scheduled Meet event on Google Calendar, with automatic fallback and retry
  console.log('[LiveClassService] Creating scheduled Google Meet space...');
  let calendarEventResult;
  let meetLink = '';
  let calendarEventId = '';
  let warning = '';

  try {
    calendarEventResult = await createGoogleCalendarMeetEvent(startTime, endTime, topic, token);
    calendarEventId = calendarEventResult.event.id || '';
    meetLink = calendarEventResult.meetLink;
  } catch (err: any) {
    if (!isRetry && err.message && (err.message.includes('401') || err.message.includes('403'))) {
      console.log('[LiveClassService] Token seems expired. Retrying login...');
      clearCachedToken();
      return createLiveClassSession(startTime, endTime, topic, streamingMode, true);
    }
    console.error('[LiveClassService] Google Calendar API failed:', err);
    throw err;
  }

  // 3-5. Create the YouTube Live Broadcast (Unlisted) and Stream within a resilient try/catch
  let youtubeVideoId = '';
  let rtmpUrl = '';
  let streamKey = '';

  if (streamingMode === 'gmeet') {
    try {
      console.log('[LiveClassService] Creating unlisted YouTube Live Broadcast...');
      const broadcast = await createYouTubeLiveBroadcast(startTime, endTime, topic, token);
      youtubeVideoId = broadcast?.id || '';

      if (youtubeVideoId) {
        // Create the YouTube Live Stream (for RTMP Credentials)
        console.log('[LiveClassService] Configuring YouTube Live RTMP Stream ingestion credentials...');
        const liveStream = await createYouTubeLiveStream(topic, token);
        
        rtmpUrl = liveStream.cdn?.ingestionInfo?.ingestionAddress || 'rtmp://a.rtmp.youtube.com/live2';
        streamKey = liveStream.cdn?.ingestionInfo?.streamName || '';

        // Bind YouTube Broadcast with the Live Stream
        console.log('[LiveClassService] Binding YouTube Broadcast to Stream...');
        await bindYouTubeBroadcastToStream(youtubeVideoId, liveStream.id, token);
      }
    } catch (ytError: any) {
      console.warn('[LiveClassService] YouTube Stream setup failed, proceeding with Google Meet only:', ytError);
      warning = (warning ? warning + '\n' : '') + `Warning: YouTube Live setup failed (${ytError.message || ytError}). Google Meet room was created successfully. You can stream manually or optionally add a manual YouTube watch link inside the material later.`;
    }
  } else {
    warning = (warning ? warning + '\n' : '') + 'Scheduled in Manual Mode: Instructors can use OBS Studio to record or stream, then paste or upload the recording/YouTube video link after the class concludes.';
  }

  console.log('[LiveClassService] Scheduling completed!', warning ? 'with warning.' : 'successfully.');

  return {
    meetLink,
    youtubeVideoId,
    youtubeWatchUrl: youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : '',
    youtubeEmbedUrl: youtubeVideoId ? `https://www.youtube.com/embed/${youtubeVideoId}` : '',
    rtmpUrl,
    streamKey,
    calendarEventId: calendarEventId,
    warning: warning || undefined
  };
}

/**
 * Generates a validly formatted real-time Google Meet URL following the standard 3-4-3 pattern.
 */
function generateMeetUrl(): string {
  const p1 = Math.random().toString(36).substring(2, 5).replace(/[^a-z]/g, 'a').padEnd(3, 'a');
  const p2 = Math.random().toString(36).substring(2, 6).replace(/[^a-z]/g, 'b').padEnd(4, 'b');
  const p3 = Math.random().toString(36).substring(2, 5).replace(/[^a-z]/g, 'c').padEnd(3, 'c');
  return `https://meet.google.com/${p1}-${p2}-${p3}`;
}

/**
 * Helper to call Google Calendar API to schedule Google Meet.
 * Request Structure:
 * POST https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1
 */
async function createGoogleCalendarMeetEvent(
  startTime: string,
  endTime: string,
  topic: string,
  token: string
): Promise<{ event: any; meetLink: string }> {
  // ISO Strings can be directly sent to Calendar API
  const formattedStart = new Date(startTime).toISOString();
  const formattedEnd = new Date(endTime).toISOString();

  // Create event request payload with conferenceData
  const body = {
    summary: `Class: ${topic}`,
    description: `LMS Scheduled Lecture.\n\nThis session is fully synchronized with your LMS dashboard.`,
    start: {
      dateTime: formattedStart,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    },
    end: {
      dateTime: formattedEnd,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    },
    conferenceData: {
      createRequest: {
        requestId: `lms-meet-request-${Date.now()}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    }
  };

  console.log('[LiveClassService] Attempting to create Calendar Event with native Meet integration...');
  const targetUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1';
  const response = await fetch(
    `/api/google-proxy?url=${encodeURIComponent(targetUrl)}`,
    {
      method: 'POST',
      headers: {
        'x-lms-google-auth': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 401 || response.status === 403) {
      clearCachedToken();
      throw new Error(`Your Google session has expired or lacks permissions (${response.status}). Details: ${errText}`);
    }
    console.error('[LiveClassService] Native Calendar Event creation failed. Status is ' + response.status, errText);
    throw new Error(`Google Calendar Event Creation Failed: ${response.statusText} (${response.status}) - ${errText}`);
  }

  const eventData = await response.json();
  const meetLink = extractMeetLink(eventData);

  if (!meetLink) {
    throw new Error("Calendar event created, but Google did not generate a Meet link. Your account may not support automatic Google Meet creation.");
  }

  console.log('[LiveClassService] Native Calendar/Meet event successfully created!');
  return { event: eventData, meetLink };
}

/**
 * Helper to call YouTube LiveBroadcasts API to host an unlisted broadcast event.
 * Request Structure:
 * POST https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails
 */
async function createYouTubeLiveBroadcast(
  startTime: string,
  endTime: string,
  topic: string,
  token: string
): Promise<any> {
  const formattedStart = new Date(startTime).toISOString();
  const formattedEnd = new Date(endTime).toISOString();

  const body = {
    snippet: {
      title: `Live Class: ${topic}`,
      description: `LMS scheduled class streaming natively. Scheduled from ${formattedStart} to ${formattedEnd}.`,
      scheduledStartTime: formattedStart,
      scheduledEndTime: formattedEnd
    },
    status: {
      privacyStatus: 'unlisted', // Unlisted so that the public cannot search for it on the channel
      selfDeclaredMadeForKids: false
    },
    contentDetails: {
      enableDvr: true,
      enableContentEncryption: true,
      monitorStream: {
        enableMonitorStream: false // Off to reduce lag and overhead for student/instructor loops
      },
      recordFromStart: true,
      startWithLiveBroadcasting: true
    }
  };

  const targetUrl = 'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails';
  const response = await fetch(
    `/api/google-proxy?url=${encodeURIComponent(targetUrl)}`,
    {
      method: 'POST',
      headers: {
        'x-lms-google-auth': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('[LiveClassService] YouTube LiveBroadcasts API error:', errText);
    throw new Error(`YouTube Live Broadcast creation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Helper to call YouTube LiveStreams API. Gives us the RTMP endpoint and credential key.
 * Request Structure:
 * POST https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn
 */
async function createYouTubeLiveStream(
  topic: string,
  token: string
): Promise<any> {
  const body = {
    snippet: {
      title: `LMS Stream for topic: ${topic}`
    },
    cdn: {
      frameRate: 'variable',
      ingestionType: 'rtmp',
      resolution: 'variable'
    }
  };

  const targetUrl = 'https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn';
  const response = await fetch(
    `/api/google-proxy?url=${encodeURIComponent(targetUrl)}`,
    {
      method: 'POST',
      headers: {
        'x-lms-google-auth': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('[LiveClassService] YouTube LiveStreams API error:', errText);
    throw new Error(`YouTube Live Stream configuration failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Helper to bind a YouTube Live Broadcast to a YouTube Live Stream.
 * Request Structure:
 * POST https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id={broadcastId}&streamId={streamId}&part=id,snippet,contentDetails
 */
async function bindYouTubeBroadcastToStream(
  broadcastId: string,
  streamId: string,
  token: string
): Promise<any> {
  const targetUrl = `https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=${broadcastId}&streamId=${streamId}&part=id,snippet,contentDetails`;
  const response = await fetch(
    `/api/google-proxy?url=${encodeURIComponent(targetUrl)}`,
    {
      method: 'POST',
      headers: {
        'x-lms-google-auth': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('[LiveClassService] YouTube Bind LiveBroadcasts.bind error:', errText);
    throw new Error(`Failed to bind YouTube Broadcast to Stream: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Parses and extracts the video meeting room URL from calendar conference entryPoints
 */
export function extractMeetLink(calendarEvent: any): string | null {
  if (!calendarEvent) return null;
  
  const entryPoints = calendarEvent.conferenceData?.entryPoints || [];
  
  // Find entry point of type "video"
  const meetEntryPoint = entryPoints.find((ep: any) => ep.entryPointType === 'video');
  if (meetEntryPoint && meetEntryPoint.uri) {
    return meetEntryPoint.uri;
  }
  
  // Fallback to htmlLink or alternative properties
  if (calendarEvent.hangoutLink) {
    return calendarEvent.hangoutLink;
  }
  
  return null;
}

/**
 * Searches the user's primary calendar for events on a certain date.
 */
export async function fetchCalendarEvents(
  dateStr: string,
  token: string
): Promise<any[]> {
  // Start and end of the specified date (local time bounds mapped to ISO strings)
  const startOfDay = new Date(`${dateStr}T00:00:00`).toISOString();
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`).toISOString();
  
  const targetUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(startOfDay)}&timeMax=${encodeURIComponent(endOfDay)}&singleEvents=true&orderBy=startTime`;
  
  console.log(`[googleMeetYoutubeApi] Fetching calendar events for ${dateStr} via proxy...`);
  
  const response = await fetch(
    `/api/google-proxy?url=${encodeURIComponent(targetUrl)}`,
    {
      method: "GET",
      headers: {
        "x-lms-google-auth": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 401 || response.status === 403) {
      clearCachedToken();
      throw new Error(`Your Google session has expired or lacks permissions (${response.status}). Please reconnect. Details: ${errText}`);
    }
    throw new Error(`Google Calendar Fetch Failed: ${response.statusText} (${response.status}) - ${errText}`);
  }

  const data = await response.json();
  const items = data.items || [];
  
  // Map raw events to a predictable structure
  return items.map((item: any) => {
    const meetLink = extractMeetLink(item) || "";
    const startTimeRaw = item.start?.dateTime || item.start?.date || "";
    const endTimeRaw = item.end?.dateTime || item.end?.date || "";
    
    // Fallback format if start/end is just a date
    let localStart = "";
    let localEnd = "";
    try {
      if (startTimeRaw) {
        // Convert to local time format for datetime-local inputs (YYYY-MM-DDTHH:MM)
        const d = new Date(startTimeRaw);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        localStart = `${year}-${month}-${day}T${hours}:${mins}`;
      }
      if (endTimeRaw) {
        const d = new Date(endTimeRaw);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        localEnd = `${year}-${month}-${day}T${hours}:${mins}`;
      }
    } catch (e) {
      console.warn("Date parsing warning", e);
    }

    return {
      id: item.id || `cal-${Date.now()}-${Math.random()}`,
      summary: item.summary || "Untitled Calendar Event",
      description: item.description || "",
      start: startTimeRaw,
      end: endTimeRaw,
      localStart,
      localEnd,
      meetLink,
      rawEvent: item
    };
  });
}
