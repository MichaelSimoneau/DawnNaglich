/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from 'firebase-functions';
// eslint-ignore-next-line import/no-unresolved
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { google } from 'googleapis';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import * as path from 'path';
// Use dynamic import for ES module compatibility
let GoogleGenAI: any;

// Set global options for all functions
setGlobalOptions({ maxInstances: 10 });

const ADMIN_EMAILS = ['dawn.naglich@gmail.com', 'michael@brainycouch.com'];
const MASTER_CALENDAR_ID = 'dawn.naglich@gmail.com';
const KEY_FILE_PATH = path.join(__dirname, '../../dawn-naglich-firebase.json');

/**
 * Initialize Google Calendar API
 */
async function getCalendarClient() {
  const auth = new GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  const authClient = await auth.getClient();
  // Type assertion needed due to Google Calendar API client typing incompatibility
  return google.calendar({ version: 'v3', auth: authClient as GoogleAuth | OAuth2Client });
}

/**
 * Fetch calendar events securely.
 * Admins see full details, clients see "Busy" for non-public events.
 */
export const getCalendarEventsSecure = onCall(
  {
    cors: true,
  },
  async (request: any) => {
    const { timeMin, timeMax } = request.data;
    const userEmail = request.auth?.token.email;
    const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());

    try {
      const calendar = await getCalendarClient();
      const response = await calendar.events.list({
        calendarId: MASTER_CALENDAR_ID,
        timeMin: timeMin || new Date().toISOString(),
        timeMax:
          timeMax
          || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      // Filter events for privacy if not admin
      const filteredEvents = events.map((event) => {
        const isPublic
          = event.extendedProperties?.private?.status === 'confirmed'
          || event.extendedProperties?.private?.status === 'pending';

        if (isAdmin || isPublic) {
          return event;
        }

        // Hide details for private events
        return {
          id: event.id,
          summary: 'Busy',
          start: event.start,
          end: event.end,
          transparency: event.transparency,
        };
      });

      return { success: true, items: filteredEvents };
    } catch (error: unknown) {
      console.error('Error fetching calendar events:', error);

      // Check if this is a Google Calendar API not enabled error
      const errorMessage
        = error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : '';
      const errorCode
        = error && typeof error === 'object' && 'code' in error
          ? error.code
          : undefined;
      const isApiNotEnabled
        = errorCode === 403
        || errorMessage.includes('API has not been used')
        || errorMessage.includes('it is disabled')
        || errorMessage.includes('PERMISSION_DENIED');

      if (isApiNotEnabled) {
        console.warn(
          '⚠️ Google Calendar API is not enabled for this project. '
          + 'Please enable it at: https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview',
        );
        // Return empty array instead of throwing to allow graceful fallback
        return { success: true, items: [] };
      }

      throw new HttpsError('internal', 'Failed to fetch calendar events.');
    }
  },
);

/**
 * Create a calendar event for a booking.
 */
export const createCalendarEventSecure = onCall(
  {
    cors: true,
  },
  async (request: any) => {
    const { clientName, service, startTime, endTime } = request.data;
    const userEmail = request.auth?.token.email;

    if (!startTime) {
      throw new HttpsError('invalid-argument', 'Start time is required.');
    }

    // Default end time to 1 hour after start if not provided
    const start = new Date(startTime);
    const end = endTime
      ? new Date(endTime)
      : new Date(start.getTime() + 60 * 60 * 1000);

    try {
      const calendar = await getCalendarClient();
      const event = {
        summary: `${clientName} - ${service}`,
        description: `Booking for ${service}`,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: userEmail ? [{ email: userEmail }] : [],
        extendedProperties: {
          private: {
            status: 'pending', // New bookings start as pending
          },
        },
      };

      const response = await calendar.events.insert({
        calendarId: MASTER_CALENDAR_ID,
        requestBody: event,
      });

      return { success: true, eventId: response.data.id };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new HttpsError('internal', 'Failed to create calendar event.');
    }
  },
);

/**
 * Confirm a pending calendar event. Admin only.
 */
export const confirmCalendarEventSecure = onCall(
  {
    cors: true,
  },
  async (request: any) => {
    const userEmail = request.auth?.token.email;
    const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());

    if (!isAdmin) {
      throw new HttpsError(
        'permission-denied',
        'Only admins can confirm events.',
      );
    }

    const { eventId } = request.data;
    if (!eventId) {
      throw new HttpsError('invalid-argument', 'Event ID is required.');
    }

    try {
      const calendar = await getCalendarClient();

      // Get current event to preserve other properties
      const eventResponse = await calendar.events.get({
        calendarId: MASTER_CALENDAR_ID,
        eventId: eventId,
      });

      const event = eventResponse.data;
      const extendedProperties = event.extendedProperties || {};
      extendedProperties.private = extendedProperties.private || {};
      extendedProperties.private.status = 'confirmed';

      await calendar.events.patch({
        calendarId: MASTER_CALENDAR_ID,
        eventId: eventId,
        requestBody: {
          extendedProperties: extendedProperties,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error confirming calendar event:', error);
      throw new HttpsError('internal', 'Failed to confirm calendar event.');
    }
  },
);

/**
 * Cancel/Delete a calendar event. Admin only.
 */
export const cancelCalendarEventSecure = onCall(
  {
    cors: true,
  },
  async (request: any) => {
    const userEmail = request.auth?.token.email;
    const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());

    if (!isAdmin) {
      throw new HttpsError(
        'permission-denied',
        'Only admins can cancel events.',
      );
    }

    const { eventId } = request.data;
    if (!eventId) {
      throw new HttpsError('invalid-argument', 'Event ID is required.');
    }

    try {
      const calendar = await getCalendarClient();
      await calendar.events.delete({
        calendarId: MASTER_CALENDAR_ID,
        eventId: eventId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw new HttpsError('internal', 'Failed to cancel calendar event.');
    }
  },
);

/**
 * Generate Gemini AI response securely using server-side API key.
 * This keeps the API key secret and prevents client-side exposure.
 */
export const generateGeminiResponse = onCall(
  {
    cors: true,
    secrets: ['GEMINI_API_KEY'],
  },
  async (request: any) => {
    const { conversationHistory, userMessage, systemInstruction } = request.data;

    if (!userMessage || typeof userMessage !== 'string') {
      throw new HttpsError('invalid-argument', 'User message is required.');
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new HttpsError(
          'internal',
          'Gemini API key not configured.',
        );
      }

      // Dynamic import for ES module compatibility
      if (!GoogleGenAI) {
        const genaiModule = await import('@google/genai');
        GoogleGenAI = genaiModule.GoogleGenAI;
      }

      const ai = new GoogleGenAI({ apiKey });

      // Build conversation history for context
      const history = conversationHistory || [];
      const contents = [
        ...history.map((msg: { role: string; text: string }) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        })),
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ];

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction: systemInstruction || `You are Dawn Naglich's elite concierge. Dawn is a specialist in Muscle Activation (MAT). 
          Location: 31005 Bainbridge Rd, Solon, OH 44139. 
          Keep answers concise, healing-focused, and encourage booking for realignment.`,
        },
      });

      // Extract text from response - the API returns text directly
      let responseText: string;
      if (typeof result === 'string') {
        responseText = result;
      } else if (result && typeof result === 'object') {
        // Try to get text from the response object
        const textProperty = (result as any).text;
        if (typeof textProperty === 'string') {
          responseText = textProperty;
        } else if (typeof textProperty === 'function') {
          responseText = textProperty();
        } else {
          // Try alternative structure
          const candidates = result as any;
          responseText = candidates.response?.text
            || candidates.candidates?.[0]?.content?.parts?.[0]?.text
            || 'I missed that. Please try again.';
        }
      } else {
        responseText = 'I missed that. Please try again.';
      }

      return { success: true, text: responseText };
    } catch (error: unknown) {
      console.error('Error generating Gemini response:', error);
      const errorMessage
        = error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Unknown error';
      throw new HttpsError(
        'internal',
        `Failed to generate response: ${errorMessage}`,
      );
    }
  },
);
