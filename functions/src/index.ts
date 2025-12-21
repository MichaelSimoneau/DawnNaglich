/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {google} from "googleapis";
import {GoogleAuth} from "google-auth-library";
import * as path from "path";

// Set global options for all functions
setGlobalOptions({maxInstances: 10});

const ADMIN_EMAILS = ["dawn.naglich@gmail.com", "michael@brainycouch.com"];
const MASTER_CALENDAR_ID = "dawn.naglich@gmail.com";
const KEY_FILE_PATH = path.join(__dirname, "../../dawn-naglich-firebase.json");

/**
 * Initialize Google Calendar API
 */
async function getCalendarClient() {
  const auth = new GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  const authClient = await auth.getClient();
  return google.calendar({version: "v3", auth: authClient as any});
}

/**
 * Fetch calendar events securely.
 * Admins see full details, clients see "Busy" for non-public events.
 */
export const getCalendarEventsSecure = onCall(
  {
    cors: true,
  },
  async (request) => {
    const {timeMin, timeMax} = request.data;
    const userEmail = request.auth?.token.email;
    const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());

    try {
      const calendar = await getCalendarClient();
      const response = await calendar.events.list({
        calendarId: MASTER_CALENDAR_ID,
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = response.data.items || [];

      // Filter events for privacy if not admin
      const filteredEvents = events.map((event) => {
        const isPublic =
        event.extendedProperties?.private?.status === "confirmed" ||
        event.extendedProperties?.private?.status === "pending";

        if (isAdmin || isPublic) {
          return event;
        }

        // Hide details for private events
        return {
          id: event.id,
          summary: "Busy",
          start: event.start,
          end: event.end,
          transparency: event.transparency,
        };
      });

      return {success: true, items: filteredEvents};
    } catch (error: any) {
      console.error("Error fetching calendar events:", error);
      
      // Check if this is a Google Calendar API not enabled error
      const errorMessage = error?.message || '';
      const isApiNotEnabled = 
        error?.code === 403 || 
        errorMessage.includes('API has not been used') ||
        errorMessage.includes('it is disabled') ||
        errorMessage.includes('PERMISSION_DENIED');
      
      if (isApiNotEnabled) {
        console.warn(
          '⚠️ Google Calendar API is not enabled for this project. ' +
          'Please enable it at: https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview'
        );
        // Return empty array instead of throwing to allow graceful fallback
        return {success: true, items: []};
      }
      
      throw new HttpsError("internal", "Failed to fetch calendar events.");
    }
  }
);

/**
 * Create a calendar event for a booking.
 */
export const createCalendarEventSecure = onCall(
  {
    cors: true,
  },
  async (request) => {
    const {clientName, service, startTime, endTime} = request.data;
    const userEmail = request.auth?.token.email;

    if (!startTime) {
      throw new HttpsError("invalid-argument", "Start time is required.");
    }

    // Default end time to 1 hour after start if not provided
    const start = new Date(startTime);
    const end = endTime ?
      new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000);

    try {
      const calendar = await getCalendarClient();
      const event = {
        summary: `${clientName} - ${service}`,
        description: `Booking for ${service}`,
        start: {dateTime: start.toISOString()},
        end: {dateTime: end.toISOString()},
        attendees: userEmail ? [{email: userEmail}] : [],
        extendedProperties: {
          private: {
            status: "pending", // New bookings start as pending
          },
        },
      };

      const response = await calendar.events.insert({
        calendarId: MASTER_CALENDAR_ID,
        requestBody: event,
      });

      return {success: true, eventId: response.data.id};
    } catch (error) {
      console.error("Error creating calendar event:", error);
      throw new HttpsError("internal", "Failed to create calendar event.");
    }
  }
);

/**
 * Confirm a pending calendar event. Admin only.
 */
export const confirmCalendarEventSecure = onCall(
  {
    cors: true,
  },
  async (request) => {
    const userEmail = request.auth?.token.email;
    const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());

    if (!isAdmin) {
      throw new HttpsError("permission-denied",
        "Only admins can confirm events.");
    }

    const {eventId} = request.data;
    if (!eventId) {
      throw new HttpsError("invalid-argument", "Event ID is required.");
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
      extendedProperties.private.status = "confirmed";

      await calendar.events.patch({
        calendarId: MASTER_CALENDAR_ID,
        eventId: eventId,
        requestBody: {
          extendedProperties: extendedProperties,
        },
      });

      return {success: true};
    } catch (error) {
      console.error("Error confirming calendar event:", error);
      throw new HttpsError("internal", "Failed to confirm calendar event.");
    }
  }
);

/**
 * Cancel/Delete a calendar event. Admin only.
 */
export const cancelCalendarEventSecure = onCall(
  {
    cors: true,
  },
  async (request) => {
    const userEmail = request.auth?.token.email;
    const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());

    if (!isAdmin) {
      throw new HttpsError("permission-denied",
        "Only admins can cancel events.");
    }

    const {eventId} = request.data;
    if (!eventId) {
      throw new HttpsError("invalid-argument", "Event ID is required.");
    }

    try {
      const calendar = await getCalendarClient();
      await calendar.events.delete({
        calendarId: MASTER_CALENDAR_ID,
        eventId: eventId,
      });

      return {success: true};
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      throw new HttpsError("internal", "Failed to cancel calendar event.");
    }
  }
);
