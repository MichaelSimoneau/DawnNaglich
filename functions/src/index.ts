/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from 'firebase-functions';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { google } from 'googleapis';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import * as path from 'path';
import { CLIENT_ASSISTANT_INSTRUCTION, ADMIN_VOICE_ASSISTANT_INSTRUCTION } from './systemInstructions';
import { allToolDeclarations } from './functionDeclarations';

// Use dynamic import for ES module compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let GoogleGenAI: any;

interface CallableRequest {
  data: Record<string, unknown>;
  auth?: {
    token?: {
      email?: string;
    };
  };
}

interface ProxyRequestData {
  media?: {
    data: string;
    mimeType: string;
  };
  message?: unknown;
  config?: {
    systemInstruction?: string;
  };
  functionResponse?: {
    id: string;
    name: string;
    response: { result: string };
  };
}

interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  transparency?: string;
  extendedProperties?: {
    private?: {
      status?: string;
    };
  };
}

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
 * Core logic for fetching calendar events (used by both callable function and function call handler)
 */
async function getCalendarEventsCore(
  timeMin?: string,
  timeMax?: string,
  userEmail?: string,
): Promise<{ success: boolean; items: GoogleCalendarEvent[] }> {
  const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());

  try {
    const calendar = await getCalendarClient();
    const response = await calendar.events.list({
      calendarId: MASTER_CALENDAR_ID,
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = (response.data?.items as GoogleCalendarEvent[]) || [];

    // Filter events for privacy if not admin
    const filteredEvents = events.map((event: GoogleCalendarEvent) => {
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
}

/**
 * Fetch calendar events securely.
 * Admins see full details, clients see "Busy" for non-public events.
 */
export const getCalendarEventsSecure = onCall(
  {
    invoker: 'public',
  },
  async (request: CallableRequest) => {
    const { timeMin, timeMax } = request.data as { timeMin?: string; timeMax?: string };
    const userEmail = request.auth?.token?.email;
    return getCalendarEventsCore(timeMin, timeMax, userEmail);
  },
);

/**
 * Core logic for creating calendar events
 */
async function createCalendarEventCore(
  clientName: string,
  service: string,
  startTime: string,
  endTime?: string,
  userEmail?: string,
): Promise<{ success: boolean; eventId?: string }> {
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

    return { success: true, eventId: response.data.id || undefined };
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw new HttpsError('internal', 'Failed to create calendar event.');
  }
}

/**
 * Create a calendar event for a booking.
 */
export const createCalendarEventSecure = onCall(
  {
    invoker: 'public',
  },
  async (request: CallableRequest) => {
    const { clientName, service, startTime, endTime } = request.data as {
      clientName?: string;
      service?: string;
      startTime?: string;
      endTime?: string;
    };
    const userEmail = request.auth?.token?.email;

    return createCalendarEventCore(
      clientName as string,
      service as string,
      startTime as string,
      endTime,
      userEmail,
    );
  },
);

/**
 * Confirm a pending calendar event. Admin only.
 */
export const confirmCalendarEventSecure = onCall(
  {
    invoker: 'public',
  },
  async (request: CallableRequest) => {
    const userEmail = request.auth?.token?.email;
    const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());

    if (!isAdmin) {
      throw new HttpsError(
        'permission-denied',
        'Only admins can confirm events.',
      );
    }

    const { eventId } = request.data as { eventId?: string };
    if (!eventId) {
      throw new HttpsError('invalid-argument', 'Event ID is required.');
    }

    try {
      const calendar = await getCalendarClient();

      // Get current event to preserve other properties
      const eventResponse = await calendar.events.get({
        calendarId: MASTER_CALENDAR_ID,
        eventId: eventId as string,
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
 * Core logic for canceling calendar events
 */
async function cancelCalendarEventCore(
  eventId: string,
  userEmail?: string,
): Promise<{ success: boolean }> {
  const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());

  if (!isAdmin) {
    throw new HttpsError(
      'permission-denied',
      'Only admins can cancel events.',
    );
  }

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
}

/**
 * Cancel/Delete a calendar event. Admin only.
 */
export const cancelCalendarEventSecure = onCall(
  {
    invoker: 'public',
  },
  async (request: CallableRequest) => {
    const userEmail = request.auth?.token?.email;
    const { eventId } = request.data as { eventId?: string };
    return cancelCalendarEventCore(eventId as string, userEmail);
  },
);

/**
 * Execute a function call from Gemini
 */
async function executeFunctionCall(
  functionName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  console.log(`Executing function call: ${functionName}`, args);

  try {
    switch (functionName) {
      case 'getCalendarEvents': {
        // Call core function directly (client requests are unauthenticated)
        const result = await getCalendarEventsCore(
          args.timeMin as string | undefined,
          args.timeMax as string | undefined,
          undefined, // No user email for client requests
        );
        return result;
      }
      case 'createCalendarEvent': {
        // Call core function directly
        const result = await createCalendarEventCore(
          args.clientName as string,
          args.service as string,
          args.startTime as string,
          args.endTime as string | undefined,
          undefined, // No user email for client requests
        );
        return result;
      }
      case 'cancelCalendarEvent': {
        // Client requests cannot cancel events (admin only)
        return { success: false, error: 'Only admins can cancel events' };
      }
      case 'confirmPendingAction': {
        // This is admin-only, return error for client
        return { success: false, error: 'This action requires admin authentication' };
      }
      default:
        return { success: false, error: `Unknown function: ${functionName}` };
    }
  } catch (error: unknown) {
    const errorMessage
      = error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'Unknown error';
    console.error(`Error executing ${functionName}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Generate Gemini AI response securely using server-side API key.
 * This keeps the API key secret and prevents client-side exposure.
 */
export const generateGeminiResponse = onCall(
  {
    secrets: ['EXPO_PUBLIC_FIREBASE_GEMINI_API_KEY'],
    invoker: 'public',
  },
  async (request: CallableRequest) => {
    const { conversationHistory, userMessage, systemInstruction } = request.data;

    if (!userMessage || typeof userMessage !== 'string') {
      throw new HttpsError('invalid-argument', 'User message is required.');
    }

    try {
      const apiKey = process.env.EXPO_PUBLIC_FIREBASE_GEMINI_API_KEY;
      if (!apiKey) {
        console.error('Missing API Key: EXPO_PUBLIC_FIREBASE_GEMINI_API_KEY is not set.');
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
      const currentTime = new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      });

      // Build conversation history for context
      const history = (conversationHistory || []) as Array<{ role: string; text: string }>;
      let contents: Array<{ role: string; parts: Array<{ text?: string; functionResponse?: unknown }> }> = [
        ...history.map((msg: { role: string; text: string }) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        })),
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ];

      // Use dynamic system instruction with current date/time
      const dynamicSystemInstruction = systemInstruction || CLIENT_ASSISTANT_INSTRUCTION(currentTime);

      // Make initial call to Gemini
      let result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: contents,
        config: {
          systemInstruction: dynamicSystemInstruction,
          tools: [{ functionDeclarations: allToolDeclarations }],
        },
      });

      // Handle function calls in a loop (Gemini may chain multiple calls)
      let maxIterations = 5; // Prevent infinite loops
      while (maxIterations > 0) {
        maxIterations--;

        // Extract function calls from response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resultAny = result as any;
        const candidates = resultAny.candidates || resultAny.response?.candidates || [];
        
        let hasFunctionCall = false;
        const functionResponses: Array<{ name: string; response: unknown }> = [];

        for (const candidate of candidates) {
          const parts = candidate.content?.parts || [];
          for (const part of parts) {
            if (part.functionCall) {
              hasFunctionCall = true;
              const functionName = part.functionCall.name;
              const functionArgs = part.functionCall.args || {};

              console.log(`Function call detected: ${functionName}`, functionArgs);

              // Execute the function
              const functionResult = await executeFunctionCall(functionName, functionArgs);

              // Add function response for follow-up
              functionResponses.push({
                name: functionName,
                response: functionResult,
              });
            }
          }
        }

        // If no function calls, break and extract text
        if (!hasFunctionCall) {
          break;
        }

        // Add function responses to conversation and make follow-up call
        contents.push({
          role: 'model',
          parts: functionResponses.map((fr) => ({
            functionResponse: {
              name: fr.name,
              response: fr.response,
            },
          })),
        });

        // Make follow-up call with function results
        result = await ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: contents,
          config: {
            systemInstruction: dynamicSystemInstruction,
            tools: [{ functionDeclarations: allToolDeclarations }],
          },
        });
      }

      // Extract text from final response
      let responseText: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultAny = result as any;
      
      if (typeof result === 'string') {
        responseText = result;
      } else {
        // Try to get text from the response object
        const candidates = resultAny.candidates || resultAny.response?.candidates || [];
        const firstCandidate = candidates[0];
        
        if (firstCandidate?.content?.parts) {
          // Find text part (not function call)
          const textPart = firstCandidate.content.parts.find(
            (part: { text?: string; functionCall?: unknown }) => part.text,
          );
          if (textPart?.text) {
            responseText = textPart.text;
          } else {
            responseText = resultAny.response?.text
              || resultAny.text
              || 'I missed that. Please try again.';
          }
        } else {
          responseText = resultAny.response?.text
            || resultAny.text
            || 'I missed that. Please try again.';
        }
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

/**
 * Initialize a Gemini Live session server-side.
 * This secures the API key and provides session configuration.
 */
export const createGeminiLiveSession = onCall(
  {
    secrets: ['EXPO_PUBLIC_FIREBASE_GEMINI_API_KEY'],
    invoker: 'public',
  },
  async () => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_FIREBASE_GEMINI_API_KEY;
      if (!apiKey) {
        console.error('Missing API Key: EXPO_PUBLIC_FIREBASE_GEMINI_API_KEY is not set.');
        throw new HttpsError('internal', 'Gemini API key not configured.');
      }

      // Return configuration for the client to use with the proxy
      // In a real implementation, this might return a session ID or a signed token
      return {
        success: true,
        config: {
          model: 'gemini-2.5-pro',
          systemInstruction: ADMIN_VOICE_ASSISTANT_INSTRUCTION(new Date().toLocaleString()),
          tools: [{ functionDeclarations: allToolDeclarations }],
        },
      };
    } catch (error: unknown) {
      console.error('Error creating Gemini Live session:', error);
      throw new HttpsError('internal', 'Failed to create session.');
    }
  },
);

/**
 * Proxy message to Gemini Live API.
 * This handles the bidirectional communication securely.
 */
export const proxyGeminiLiveMessage = onCall(
  {
    secrets: ['EXPO_PUBLIC_FIREBASE_GEMINI_API_KEY'],
    invoker: 'public',
  },
  async (request: CallableRequest) => {
    const { media, message, config } = request.data as ProxyRequestData;

    try {
      const apiKey = process.env.EXPO_PUBLIC_FIREBASE_GEMINI_API_KEY;
      if (!apiKey) {
        console.error('Missing API Key: EXPO_PUBLIC_FIREBASE_GEMINI_API_KEY is not set.');
        throw new HttpsError('internal', 'Gemini API key not configured.');
      }

      if (!GoogleGenAI) {
        const genaiModule = await import('@google/genai');
        GoogleGenAI = genaiModule.GoogleGenAI;
      }

      // eslint-disable-next-line new-cap
      const ai = new GoogleGenAI({ apiKey });
      const currentTime = new Date().toLocaleString();
      const systemInstruction = config?.systemInstruction
        || ADMIN_VOICE_ASSISTANT_INSTRUCTION(currentTime);
      const model = ai.getGenerativeModel({
        model: 'gemini-2.5-pro',
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: allToolDeclarations }],
      });

      // Handle audio input (media) or text input (message)
      // This is a simplified "per-turn" proxy for the "Live" experience
      // In a real bidirectional streaming setup, this would be more complex
      let result;
      if (media) {
        result = await model.generateContent([
          {
            inlineData: {
              data: media.data,
              mimeType: media.mimeType,
            },
          },
        ]);
      } else if (message) {
        result = await model.generateContent(message);
      } else {
        throw new HttpsError('invalid-argument', 'No input provided.');
      }

      const response = await result.response;
      const text = response.text();

      // Check for tool calls
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const functionCalls = (response.candidates?.[0]?.content?.parts as any[])?.filter((p: any) => p.functionCall);

      if (functionCalls && functionCalls.length > 0) {
        // Handle tool calls server-side
        // This is a simplified version - in a real app you'd map these to actual functions
        // For now, we return that tool calls were detected
        return {
          success: true,
          text: text || 'Processing tool call...',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          functionCalls: functionCalls.map((p: any) => p.functionCall),
        };
      }

      return {
        success: true,
        text,
      };
    } catch (error: unknown) {
      console.error('Error in proxyGeminiLiveMessage:', error);
      throw new HttpsError('internal', 'Failed to proxy message.');
    }
  },
);
