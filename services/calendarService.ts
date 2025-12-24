import { Appointment } from "../types";
import { Platform } from "react-native";

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
  extendedProperties?: {
    private?: {
      status?: string;
    };
  };
}

export const CalendarService = {
  async getEventsSecureV2(timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> {
    try {
      // Determine the API endpoint URL - always use /api/ path
      let url: string;
      if (Platform.OS === 'web') {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const isEmulator =
          origin.includes("localhost") || origin.includes("127.0.0.1");
        url = isEmulator
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/getCalendarEventsSecure"
          : `${origin}/api/getCalendarEventsSecure`;
      } else {
        // For native, use the Firebase Hosting domain with /api/ path
        url = "https://dawn-naglich.firebaseapp.com/api/getCalendarEventsSecure";
      }

      console.log("Calling secure function via URL:", url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            timeMin,
            timeMax,
          },
        }),
      });

      if (!response || !response.ok) {
        throw new Error(`HTTP error! status: ${response?.status || 'unknown'}`);
      }

      const result = await response.json() as { result?: { data?: { items?: GoogleCalendarEvent[] } }; items?: GoogleCalendarEvent[] };
      const data = result.result?.data || result;
      return data.items || [];
    } catch (error) {
      console.error("Secure Fetch Error:", error);
      return [];
    }
  },

  mapGoogleEventsToAppointments(items: GoogleCalendarEvent[]): Appointment[] {
    return items.map((item) => ({
      id: item.id || '',
      clientName:
        item.summary?.split(" - ")[0] || item.summary || "Private Event",
      service: item.description || "General Session",
      startTime:
        item.start?.dateTime || item.start?.date || new Date().toISOString(),
      endTime: item.end?.dateTime || item.end?.date || new Date().toISOString(),
      status: (item.extendedProperties?.private?.status as Appointment['status']) || "confirmed",
    }));
  },

  async createEventSecure(
    appointment: Partial<Appointment>,
  ): Promise<{ success: boolean; eventId?: string }> {
    try {
      // Determine the API endpoint URL - always use /api/ path
      let url: string;
      if (Platform.OS === 'web') {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const isEmulator =
          origin.includes("localhost") || origin.includes("127.0.0.1");
        url = isEmulator
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/createCalendarEventSecure"
          : `${origin}/api/createCalendarEventSecure`;
      } else {
        // For native, use the Firebase Hosting domain with /api/ path
        url = "https://dawn-naglich.firebaseapp.com/api/createCalendarEventSecure";
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: appointment,
        }),
      });

      if (!response || !response.ok) {
        throw new Error(`HTTP error! status: ${response?.status || 'unknown'}`);
      }

      const result = await response.json();
      const data = (result.result?.data || result) as { success: boolean; eventId?: string };
      return data;
    } catch (error) {
      console.error("Create event error:", error);
      return { success: false };
    }
  },

  async confirmEventSecure(eventId: string): Promise<boolean> {
    try {
      // Determine the API endpoint URL - always use /api/ path
      let url: string;
      if (Platform.OS === 'web') {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const isEmulator =
          origin.includes("localhost") || origin.includes("127.0.0.1");
        url = isEmulator
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/confirmCalendarEventSecure"
          : `${origin}/api/confirmCalendarEventSecure`;
      } else {
        // For native, use the Firebase Hosting domain with /api/ path
        url = "https://dawn-naglich.firebaseapp.com/api/confirmCalendarEventSecure";
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: { eventId },
        }),
      });

      if (!response || !response.ok) {
        throw new Error(`HTTP error! status: ${response?.status || 'unknown'}`);
      }

      const result = await response.json();
      const data = (result.result?.data || result) as { success: boolean };
      return data.success || false;
    } catch (error) {
      console.error("Confirm event error:", error);
      return false;
    }
  },

  async cancelEventSecure(eventId: string): Promise<boolean> {
    try {
      // Determine the API endpoint URL - always use /api/ path
      let url: string;
      if (Platform.OS === 'web') {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const isEmulator =
          origin.includes("localhost") || origin.includes("127.0.0.1");
        url = isEmulator
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/cancelCalendarEventSecure"
          : `${origin}/api/cancelCalendarEventSecure`;
      } else {
        // For native, use the Firebase Hosting domain with /api/ path
        url = "https://dawn-naglich.firebaseapp.com/api/cancelCalendarEventSecure";
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: { eventId },
        }),
      });

      if (!response || !response.ok) {
        throw new Error(`HTTP error! status: ${response?.status || 'unknown'}`);
      }

      const result = await response.json();
      const data = (result.result?.data || result) as { success: boolean };
      return data.success || false;
    } catch (error) {
      console.error("Cancel event error:", error);
      return false;
    }
  },
};
