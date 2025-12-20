/**
 * Firebase Functions for Dawn Naglich Wellness
 * Handles secure communication with Google Calendar API.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";

// Define the ADMIN_EMAILS locally for backend security
const ADMIN_EMAILS = [
  'dawn.naglich@gmail.com',
  'michael@brainycouch.com',
  'don.negligent@gmail.com'
];

// Defining a secret for the Google Calendar Service Account Key (JSON string)
const googleCalendarKey = defineSecret("GOOGLE_CALENDAR_KEY");
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");

/**
 * Utility to verify if the requesting user is an authorized admin.
 */
const isAdmin = (request: any) => {
  const email = request.auth?.token.email?.toLowerCase();
  return email && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email);
};

const verifyAdmin = (request: any) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Request must be authenticated.");
  }
  if (!isAdmin(request)) {
    throw new HttpsError("permission-denied", "Unauthorized access. Only admins can perform this operation.");
  }
};

/**
 * Fetch calendar events securely.
 */
export const getCalendarEventsSecure = onCall({ secrets: [googleCalendarKey] }, async (request) => {
  verifyAdmin(request);
  const { timeMin, timeMax } = request.data;
  return { success: true, items: [] };
});

/**
 * Create a new calendar event securely.
 */
export const createCalendarEventSecure = onCall({ secrets: [googleCalendarKey] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Request must be authenticated.");
  
  const { clientName, service, startTime, endTime } = request.data;
  logger.info(`Creating session for ${clientName}`);
  return { success: true, eventId: `evt_${Date.now()}` };
});

/**
 * Securely update an existing calendar event.
 */
export const updateCalendarEventSecure = onCall({ secrets: [googleCalendarKey] }, async (request) => {
  verifyAdmin(request);
  const { eventId, updates } = request.data;
  if (!eventId || !updates) throw new HttpsError("invalid-argument", "Missing eventId or updates.");
  return { success: true };
});

/**
 * Transition a pending appointment to confirmed.
 */
export const confirmCalendarEventSecure = onCall({ secrets: [googleCalendarKey] }, async (request) => {
  verifyAdmin(request);
  const { eventId } = request.data;
  if (!eventId) throw new HttpsError("invalid-argument", "Missing eventId.");
  
  logger.info(`Admin ${request.auth?.token.email} confirmed event ${eventId}`);
  // In real implementation:
  // 1. Update status to 'confirmed' in DB/Calendar
  // 2. Trigger SendGrid email to client
  return { success: true };
});

/**
 * Securely cancel/delete a calendar event.
 */
export const cancelCalendarEventSecure = onCall({ secrets: [googleCalendarKey] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Request must be authenticated.");
  const { eventId } = request.data;
  if (!eventId) throw new HttpsError("invalid-argument", "Missing eventId.");
  return { success: true };
});

/**
 * Scheduled function for daily reminders.
 */
export const sendDailyReminders = onSchedule({ 
  schedule: "0 * * * *", 
  secrets: [sendgridApiKey, googleCalendarKey] 
}, async (event) => {
  return;
});
